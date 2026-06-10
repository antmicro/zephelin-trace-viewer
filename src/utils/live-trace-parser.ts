/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallTreeProfileBuilder, ProfileGroup, Profile } from '@speedscope/lib/profile';
import { TimeFormatter } from '@speedscope/lib/value-formatters';
import { partitionByPidTid, convertToEventQueues,
    frameInfoForEvent, selectQueueToTakeFromNext, TraceEvent, BTraceEvent, ETraceEvent, ImportableTraceEvent,
    pidTidKey,
} from '@speedscope/import/trace-event';

interface NamedMetadataEvent extends TraceEvent {
    args?: {
        name?: string;
    };
}

/** Class for incremental trace profile building. */
export class LiveTraceParser {
    private builders = new Map<string, CallTreeProfileBuilder>();
    // Tracks currently opened events
    private frameStacks = new Map<string, BTraceEvent[]>();

    private processNames = new Map<number, string>();
    private threadNames = new Map<string, string>();
    private rawMetadata: TraceEvent[] = [];

    private name: string;
    private liveEdge = 0;

    constructor(name: string) {
        this.name = name;
    }

    // Handle incoming events
    public ingest(events: TraceEvent[]) {
        const metadataEvents: TraceEvent[] = [];
        const traceEvents: ImportableTraceEvent[] = [];

        for (const e of events) {
            if (e.ph === 'M'){
                metadataEvents.push(e);
            } else if (e.ph === 'B' || e.ph === 'E') {
                traceEvents.push(e as ImportableTraceEvent);
            }
        }

        if (metadataEvents.length > 0) {
            this.processMetadata(metadataEvents);
        }

        if (traceEvents.length > 0) {
            const partitioned = partitionByPidTid(traceEvents);
            for (const [profileKey, threadEvents] of partitioned.entries()) {
                this.processThreadChunk(profileKey, threadEvents);
            }
        }
    }

    // Take snapshot of current profiles state
    public getSnapshot(): ProfileGroup {
        const snapshots: Profile[] = [];

        for (const builder of this.builders.values()) {
            const profileSnapshot = builder.shallowClone();

            // Deep copy the arrays
            profileSnapshot.samples = [...profileSnapshot.samples];
            profileSnapshot.weights = [...profileSnapshot.weights];

            this.closeOpenFrames(builder, profileSnapshot);

            profileSnapshot.sortGroupedCallTree();
            profileSnapshot.totalWeight = Math.max(profileSnapshot.getTotalWeight(), this.liveEdge);

            snapshots.push(profileSnapshot);
        }

        return {
            name: this.name,
            indexToView: 0,
            profiles: snapshots,
        };
    }

    public getRawMetadata(): TraceEvent[] {
        return this.rawMetadata.map(ev => ({
            ...ev,
            groupName: this.name,
        }));
    }

    private closeOpenFrames(builder: CallTreeProfileBuilder, profileSnapshot: Profile) {
        let currentValue = builder.lastValue;

        for (let i = builder.appendOrderStack.length - 1; i >= 0; i--) {
            const node = builder.appendOrderStack[i];
            const delta = this.liveEdge - currentValue;

            profileSnapshot.samples.push(node);
            profileSnapshot.weights.push(delta);

            currentValue = this.liveEdge;
        }
    }

    // Parses ingested trace events
    private processThreadChunk(profileKey: string, events: ImportableTraceEvent[]) {
        if (events.length === 0) {return;}
        const { pid, tid } = events[0];

        const { builder, frameStack } = this.getOrCreateProfileBuilder(profileKey, pid, tid);
        const [bEventQueue, eEventQueue] = convertToEventQueues(events);

        while (bEventQueue.length > 0 || eEventQueue.length > 0) {
            const queueName = selectQueueToTakeFromNext(bEventQueue, eEventQueue, frameStack[frameStack.length - 1]);

            switch (queueName) {
            case 'B': {
                const b = bEventQueue.shift()!;
                frameStack.push(b);
                builder.enterFrame(frameInfoForEvent(b), b.ts);
                this.liveEdge = Math.max(this.liveEdge, b.ts);
                break;
            }
            case 'E': {
                const e = eEventQueue.shift()!;
                this.tryToLeaveFrame(builder, frameStack, e);
                this.liveEdge = Math.max(this.liveEdge, e.ts);
                break;
            }
            }
        }
    }

    // Returns instance of a profile builder for a given thread
    private getOrCreateProfileBuilder(profileKey: string, pid: number, tid: number) {
        let builder = this.builders.get(profileKey);
        let frameStack = this.frameStacks.get(profileKey);

        if (!builder || !frameStack) {
            builder = new CallTreeProfileBuilder();
            builder.setValueFormatter(new TimeFormatter('microseconds'));
            builder.setName(this.getFormattedProfileName(pid, tid));

            frameStack = [];

            this.builders.set(profileKey, builder);
            this.frameStacks.set(profileKey, frameStack);
        }

        return { builder, frameStack };
    }

    // Safely closes the event
    private tryToLeaveFrame(builder: CallTreeProfileBuilder, frameStack: BTraceEvent[], e: ETraceEvent) {
        const b = frameStack[frameStack.length - 1];

        // Ignore if there is no matching B event
        if (!b) {return;}

        // Attach stats to the UI node
        const activeNode = builder.appendOrderStack[builder.appendOrderStack.length - 1];
        if (activeNode?.frame) {
            activeNode.frame.args ??= {};
            const bArgs = activeNode.frame.args as Record<string, unknown>;
            const eArgs = e.args as Record<string, unknown> | undefined;

            bArgs.end = eArgs?.end ?? eArgs ?? {};
        }

        const bFrameInfo = frameInfoForEvent(b);
        frameStack.pop();

        builder.leaveFrame(bFrameInfo, e.ts);
    }

    // Save metadata event and trigger the rename
    private processMetadata(metadataEvents: TraceEvent[]) {
        for (const rawEv of metadataEvents) {
            const ev = rawEv as NamedMetadataEvent;

            // Save the event so it can be processed downstream
            this.rawMetadata.push(ev);

            if (!ev.args?.name) { continue; }

            const metadataName = ev.args.name;

            const isProcess = ev.name === 'process_name' || ev.name === 'PROCESS';
            const isThread = ev.name === 'thread_name' || ev.name === 'THREAD';

            if (isProcess) {
                this.processNames.set(ev.pid, metadataName);
                this.updateBuilderNamesForPid(ev.pid);
            } else if (isThread) {
                const key = pidTidKey(ev.pid, ev.tid);

                const currentName = this.threadNames.get(key);
                // Do not override valid name with 'unknown'
                if (metadataName === 'unknown' && currentName) {
                    continue;
                }

                this.threadNames.set(key, metadataName);
                this.updateBuilderNameForTid(ev.pid, ev.tid);
            }
        }
    }

    // Formats the profile name based on what is available
    private getFormattedProfileName(pid: number, tid: number): string {
        const processName = this.processNames.get(pid);
        const threadName = this.threadNames.get(pidTidKey(pid, tid));

        if (processName && threadName) {return `${processName} (pid ${pid}), ${threadName} (tid ${tid})`;}
        if (processName)               {return `${processName} (pid ${pid}, tid ${tid})`;}
        if (threadName)                {return `${threadName} (pid ${pid}, tid ${tid})`;}

        return `pid ${pid}, tid ${tid}`;
    }

    // Update the name of UI tab
    private updateBuilderNamesForPid(pid: number) {
        for (const [profileKey, builder] of this.builders.entries()) {
            if (profileKey.startsWith(`${pid}:`)) {
                const tid = parseInt(profileKey.split(':')[1], 10);
                builder.setName(this.getFormattedProfileName(pid, tid));
            }
        }
    }

    // Update the name of UI tab
    private updateBuilderNameForTid(pid: number, tid: number) {
        const key = pidTidKey(pid, tid);
        const builder = this.builders.get(key);
        if (builder) {
            builder.setName(this.getFormattedProfileName(pid, tid));
        }
    }
}

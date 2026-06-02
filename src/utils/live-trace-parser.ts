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
} from '@speedscope/import/trace-event';

/** Class for incremental trace profile building. */
export class LiveTraceParser {
    private builders = new Map<string, CallTreeProfileBuilder>();
    private frameStacks = new Map<string, BTraceEvent[]>();

    private name: string;
    private liveEdge = 0;

    constructor(name: string) {
        this.name = name;
    }

    // Handle incoming events
    public ingest(events: TraceEvent[]) {
        const traceEvents = events.filter((e): e is ImportableTraceEvent =>
            e.ph === 'B' || e.ph === 'E',
        );

        if (traceEvents.length === 0) {return;}

        const partitioned = partitionByPidTid(traceEvents);
        for (const [profileKey, threadEvents] of partitioned.entries()) {
            this.processThreadChunk(profileKey, threadEvents);
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

    private closeOpenFrames(builder: CallTreeProfileBuilder, profileSnapshot: Profile) {
        let currentValue = builder.lastValue;

        for (let i = builder.appendOrderStack.length - 1; i > 0; i--) {
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
        if (!this.builders.has(profileKey)) {
            const builder = new CallTreeProfileBuilder();
            builder.setValueFormatter(new TimeFormatter('microseconds'));
            builder.setName(`pid ${pid}, tid ${tid}`);

            this.builders.set(profileKey, builder);
            this.frameStacks.set(profileKey, []);
        }

        return {
            builder: this.builders.get(profileKey)!,
            frameStack: this.frameStacks.get(profileKey)!,
        };
    }

    // Safely closes the event
    private tryToLeaveFrame(builder: CallTreeProfileBuilder, frameStack: BTraceEvent[], e: ETraceEvent) {
        const b = frameStack[frameStack.length - 1];

        // Ignore if there is no matching B event
        if (!b) {return;}

        const bFrameInfo = frameInfoForEvent(b);
        frameStack.pop();

        builder.leaveFrame(bFrameInfo, e.ts);
    }
}

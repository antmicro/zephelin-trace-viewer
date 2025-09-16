/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { CallTreeNode, FrameInfo } from "@speedscope/lib/profile";
import { profileGroupAtom } from "@speedscope/app-state";
import { Metadata } from "@speedscope/app-state/profile-group";
import { FrameInfoT, MetadataModelType, ModelEventArgs, ModelEventName, OpExecutionEvent } from "@/event-types";


export function isOpFrame(maybeOpFrame?: FrameInfo): maybeOpFrame is FrameInfoT<ModelEventArgs> {
    return typeof(maybeOpFrame?.key) === "string" && maybeOpFrame?.key?.startsWith(`${ModelEventName}::`);
}

export function isModelMetadata(maybeModelMetadata?: Metadata): maybeModelMetadata is MetadataModelType {
    return maybeModelMetadata?.name === ModelEventName;
}

type OpType = string;

// Represents name of a specific operator in execution graph
type OpInstance = string
// Describes execution times of an operator type grouped by an instance
type OpTypeExecutionTimes = Map<OpInstance, number[]>;

export function normalizeOpName(name: string) {
    return name.replace(new RegExp(`${ModelEventName}::`), '');
}

function getCallTreeNodes() {
    const activeProfile = profileGroupAtom.getActiveProfile()?.profile;
    const callTreeNodes: CallTreeNode[] = [];
    activeProfile?.forEachCall((callNode) => {callTreeNodes.push(callNode);}, () => {});
    return callTreeNodes;
}

function getOpExecutionTimes() {
    const activeProfile = profileGroupAtom.getActiveProfile()?.profile;
    if (!activeProfile) { return null; };

    const opTypes = new Map<OpType, OpTypeExecutionTimes>();
    getCallTreeNodes()?.forEach(
        (callNode) => {
            const { frame } = callNode;
            if (!isOpFrame(frame)) { return; }
            const { name, args: { begin: { tag: opType } } } = frame;
            const opInstance = normalizeOpName(name);
            const duration = callNode.getSelfWeight();

            if (!opTypes.has(opType)) { opTypes.set(opType, new Map()); }
            const opTypeMapping = opTypes.get(opType)!;
            if (!opTypeMapping.has(opInstance)) { opTypeMapping.set(opInstance, []); }
            const opInstancesDurations = opTypeMapping.get(opInstance)!;
            opInstancesDurations.push(duration);
        },
    );

    return opTypes;
}

export function getOpExecutionData(): { plotData: OpExecutionEvent[][] } | null {
    const opExecutionTimes = getOpExecutionTimes();
    if (!opExecutionTimes) {return null;}

    const plotData = Array.from(opExecutionTimes.values())
        .flatMap((opTypeExecutionTimes) => Array.from(opTypeExecutionTimes.entries()))
        .map(([name, durations]) => {
            const total = durations.reduce((a, b) => a + b, 0);
            return { name, duration: { total, average: total / durations.length } };
        });

    if (!plotData.length) { return null; }
    return { plotData: [plotData] };

}

export function getOpTypeExecutionData(): { plotData: OpExecutionEvent[][] } | null {
    const opExecutionTimes = getOpExecutionTimes();
    if (!opExecutionTimes) {return null;}

    const plotData = Array.from(opExecutionTimes.entries())
        .map(([opType, opTypeExecutionTimes]) => {
            const { count, total } = Array.from(opTypeExecutionTimes.values())
                .reduce((acc, opInstanceTimes) => {
                    acc.count += opInstanceTimes.length;
                    acc.total += opInstanceTimes.reduce((a, b) => a + b, 0);
                    return acc;
                }, { count: 0, total: 0});

            return { name: opType, duration: { total, average: total / count } };
        });

    if (!plotData.length) { return null; }
    return { plotData: [plotData] };
}

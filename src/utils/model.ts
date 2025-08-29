/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { FrameInfo } from "@speedscope/lib/profile";
import { profileGroupAtom } from "@speedscope/app-state";
import { FrameInfoT, ModelEventArgs, ModelEventName, OpExecutionEvent } from "@/event-types";


export function isOpFrame(maybeOpFrame?: FrameInfo): maybeOpFrame is FrameInfoT<ModelEventArgs> {
    return typeof(maybeOpFrame?.key) === "string" && maybeOpFrame?.key?.startsWith(`${ModelEventName}::`);
}

type OpType = string;

// Represents name of a specific operator in execution graph
type OpInstance = string
// Describes execution times of an operator type grouped by an instance
type OpTypeExecutionTimes = Map<OpInstance, number[]>;

function getOpExecutionTimes() {
    const activeProfile = profileGroupAtom.getActiveProfile()?.profile;
    if (!activeProfile) { return null; };

    const opTypes = new Map<OpType, OpTypeExecutionTimes>();
    activeProfile.forEachCall(
        (callNode) => {
            const { frame } = callNode;
            if (!isOpFrame(frame)) { return; }
            const { name: opInstance, args: { begin: { tag: opType } } } = frame;
            const duration = callNode.getSelfWeight();

            if (!opTypes.has(opType)) { opTypes.set(opType, new Map()); }
            const opTypeMapping = opTypes.get(opType)!;
            if (!opTypeMapping.has(opInstance)) { opTypeMapping.set(opInstance, []); }
            const opInstancesDurations = opTypeMapping.get(opInstance)!;
            opInstancesDurations.push(duration);
        },
        () => {},
    );

    return opTypes;
}

export function getOpData(): { plotData: OpExecutionEvent[][] } | null {
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

/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { CallTreeNode, FrameInfo, Profile } from "@speedscope/lib/profile";
import { Metadata } from "@speedscope/app-state/profile-group";
import { getMetadataForGroup, getProfilesForGroup } from "@speedscope/app-state/utils";
import { FrameInfoT, InferenceEventName, InferenceModelArgs, MetadataModelType, ModelEventArgs, ModelEventName, ModelIOType, ModelTensorType, OpExecutionData, OpSizeData } from "@/event-types";


const MODEL_EVENT_PREFIX_REGEX = new RegExp(`^${ModelEventName}(?<modelNum>[0-9]*)::`);

export function isOpFrame(maybeOpFrame?: FrameInfo): maybeOpFrame is FrameInfoT<ModelEventArgs> {
    return typeof(maybeOpFrame?.key) === "string" && maybeOpFrame?.key?.match(MODEL_EVENT_PREFIX_REGEX) !== null;
}

export function isInferenceFrame(maybeInferFrame?: FrameInfo): maybeInferFrame is FrameInfoT<InferenceModelArgs> {
    return typeof(maybeInferFrame?.key) === "string" && maybeInferFrame?.key?.startsWith(`${InferenceEventName}::`);
}

export function isModelMetadata(maybeModelMetadata?: Metadata): maybeModelMetadata is MetadataModelType {
    return maybeModelMetadata?.name === ModelEventName;
}

type OpType = string;

// Represents name of a specific operator in execution graph
type OpInstance = string
interface OpDuration {
    selfDuration: number,
    totalDuration: number
}
// Describes execution times of an operator type grouped by an instance
type OpTypeExecutionTimes = Map<OpInstance, OpDuration[]>;


function opNameReplacer(_match: string, modelNum: string) {
    if (modelNum && modelNum !== "") {
        return modelNum + "::";
    }
    return "";
}

export function normalizeOpName(name: string) {
    return name.replace(MODEL_EVENT_PREFIX_REGEX, opNameReplacer);
}

function getCallTreeNodes(profile: Profile) {
    const callTreeNodes: CallTreeNode[] = [];
    profile.forEachCall((callNode) => {
        callTreeNodes.push(callNode);
    }, () => {});
    return callTreeNodes;
}

function getOpExecutionTimes(groupName: string) {
    const profileWrappers = getProfilesForGroup(groupName);
    if (!profileWrappers.length) {return null;}

    const opTypes = new Map<OpType, OpTypeExecutionTimes>();

    profileWrappers?.forEach((wrapper) => {
        const nodes = getCallTreeNodes(wrapper.profile);

        nodes.forEach((callNode) => {
            const { frame } = callNode;
            if (!isOpFrame(frame)) { return; }
            const { name, args: { begin: { tag: opType } } } = frame;
            const opInstance = normalizeOpName(name);
            const selfDuration = callNode.getSelfWeight();
            const totalDuration = callNode.getTotalWeight();
            if (!opTypes.has(opType)) { opTypes.set(opType, new Map()); }
            const opTypeMapping = opTypes.get(opType)!;
            if (!opTypeMapping.has(opInstance)) { opTypeMapping.set(opInstance, []); }
            const opInstancesDurations = opTypeMapping.get(opInstance)!;
            opInstancesDurations.push({
                selfDuration: selfDuration,
                totalDuration: totalDuration,
            });
        }, () => {});
    });

    return opTypes;
}

export function getOpExecutionData(groupName: string): { plotData: OpExecutionData[][] } | null {
    const opExecutionTimes = getOpExecutionTimes(groupName);
    if (!opExecutionTimes) {return null;}

    const plotData = Array.from(opExecutionTimes.values())
        .flatMap((opTypeExecutionTimes) => Array.from(opTypeExecutionTimes.entries()))
        .map(([name, durations]) => {
            const sums = durations.reduce(
                (acc, entry) => {
                    acc.selfDuration += entry.selfDuration;
                    acc.totalDuration += entry.totalDuration;
                    return acc;
                },
                { selfDuration: 0, totalDuration: 0},
            );
            const count = durations.length;

            return {
                name,
                selfDuration: {
                    total: sums.selfDuration,
                    average: count > 0 ? sums.selfDuration / count : 0,
                },
                totalDuration: {
                    total: sums.totalDuration,
                    average: count > 0 ? sums.totalDuration / count : 0,
                },
            };
        });

    if (!plotData.length) { return null; }
    return { plotData: [plotData] };

}

export function getOpTypeExecutionData(groupName: string): { plotData: OpExecutionData[][] } | null {
    const opExecutionTimes = getOpExecutionTimes(groupName);
    if (!opExecutionTimes) {return null;}

    const plotData = Array.from(opExecutionTimes.entries())
        .map(([opType, opTypeExecutionTimes]) => {
            const sums = Array.from(opTypeExecutionTimes.values())
                .reduce((acc, opInstanceTimes) => {
                    acc.count += opInstanceTimes.length;
                    opInstanceTimes.forEach(entry => {
                        acc.selfTotal += entry.selfDuration;
                        acc.totalTotal += entry.totalDuration;
                    });
                    return acc;
                }, {count: 0, selfTotal: 0, totalTotal: 0});

            const count = sums.count;

            return {
                name: opType,
                selfDuration: {
                    total: sums.selfTotal,
                    average: count > 0 ? sums.selfTotal / count : 0,
                },
                totalDuration: {
                    total: sums.totalTotal,
                    average: count > 0 ? sums.totalTotal / count : 0,
                },
            };
        });
    if (!plotData.length) { return null; }
    return { plotData: [plotData] };
}

export function getOpSizeData(groupName: string): { plotData: OpSizeData[][] } | null {
    const metadata = getMetadataForGroup(groupName);
    const modelsData = (metadata ?? []).filter(isModelMetadata).map((m) => m?.args);
    if (!modelsData.length) {return null;}

    const profileWrappers = getProfilesForGroup(groupName);
    if (!profileWrappers.length) {return null;}

    const plotData: OpSizeData[] = [];

    const allGroupNodes = profileWrappers.flatMap(wrapper => getCallTreeNodes(wrapper.profile));

    modelsData.forEach((modelData) => {
        // Tensors
        const { tensors, inputs: modelInputs, outputs: modelOutputs } = modelData;
        const tensorsWithSize = tensors.filter(({ size }) => size !== undefined).length;
        if (!tensorsWithSize) {return null;}

        // Op instances
        const opFrames = allGroupNodes
            .filter(({frame, parent}) =>
                isOpFrame(frame) &&
                (modelsData.length === 1 || (isInferenceFrame(parent?.frame)
                && parent?.frame.args?.begin?.model_id === modelData.id)
                ))
            .map(({frame}) => frame as FrameInfoT<ModelEventArgs>);

        // Substitute type names with instance names
        let offset = 0;
        const { ops: globalOps } = modelData;
        const ops = globalOps.flatMap((op) => {
            const frameIdx = opFrames.slice(offset).findIndex((frame) => frame.args.begin.tag === op.op_name);
            if (frameIdx === -1) {return [];}
            const { name } = opFrames[offset];
            offset = offset + frameIdx + 1;
            return [{...op, op_name: normalizeOpName(name)}];
        });

        // Identify non-weight tensors
        const matchModelTensor =
            (modelTensor: ModelIOType) =>
                (tensor: ModelTensorType) => (modelTensor.name_long ?? modelTensor.name) === tensor.name;
        const nonWeightTensors = new Set([
            ...modelInputs.map((modelTensor) => tensors.find(matchModelTensor(modelTensor))?.index),
            ...modelOutputs.map((modelTensor) => tensors.find(matchModelTensor(modelTensor))?.index),
            ...globalOps.flatMap(({ outputs }) => outputs),
        ]);

        const usedTensors = new Set();
        const tensorToSizeMap = new Map(tensors.map(({ index, size }) => [index, size]));
        const tensorToSize = (tensorIdx: number) => {
            if (usedTensors.has(tensorIdx)) {
                console.debug(`Trying to add tensor ${tensorIdx} size more than once`);
                return;
            }
            usedTensors.add(tensorIdx);

            if (!tensorToSizeMap.has(tensorIdx)) {
                console.debug(`Tensor ${tensorIdx} is not in tensor data`);
                return;
            }
            const size = tensorToSizeMap.get(tensorIdx);

            if (size === undefined) {
                console.debug(`Tensor ${tensorIdx} has ${size} size`);
            }
            return size;
        };

        plotData.push(...ops.flatMap(({ op_name, inputs }) => {
            const size = inputs
                .filter((i) => !nonWeightTensors.has(i)).map((i) => tensorToSize(i) ?? 0)
                .reduce((a, b) => a + b, 0);
            if (!size) {return [];}
            return [{ name: op_name, size }];
        }));

    });
    if (!plotData.length) {return null;}
    return { plotData: [plotData] };
}

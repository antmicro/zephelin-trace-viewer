/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { CallTreeNode, FrameInfo } from "@speedscope/lib/profile";
import { metadataAtom, profileGroupAtom } from "@speedscope/app-state";
import { Metadata } from "@speedscope/app-state/profile-group";
import { getProfilesForGroup } from "@speedscope/app-state/utils";
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
// Describes execution times of an operator type grouped by an instance
type OpTypeExecutionTimes = Map<OpInstance, number[]>;


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
            const duration = callNode.getSelfWeight();

            if (!opTypes.has(opType)) { opTypes.set(opType, new Map()); }
            const opTypeMapping = opTypes.get(opType)!;
            if (!opTypeMapping.has(opInstance)) { opTypeMapping.set(opInstance, []); }
            const opInstancesDurations = opTypeMapping.get(opInstance)!;
            opInstancesDurations.push(duration);
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
            const total = durations.reduce((a, b) => a + b, 0);
            return { name, duration: { total, average: total / durations.length } };
        });

    if (!plotData.length) { return null; }
    return { plotData: [plotData] };

}

export function getOpTypeExecutionData(): { plotData: OpExecutionData[][] } | null {
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

export function getOpSizeData(): { plotData: OpSizeData[][] } | null {
    // Metadata
    const metadata = metadataAtom.get();
    const modelsData = (metadata ?? []).filter(isModelMetadata).map((m) => m?.args);
    if (!modelsData.length) {return null;}

    const plotData: OpSizeData[] = [];

    modelsData.forEach((modelData) => {
        // Tensors
        const { tensors, inputs: modelInputs, outputs: modelOutputs } = modelData;
        const tensorsWithSize = tensors.filter(({ size }) => size !== undefined).length;
        if (!tensorsWithSize) {return null;}

        // Op instances
        const opFrames = getCallTreeNodes()
            .filter(({frame, parent}) => isOpFrame(frame) && (modelsData.length === 1 || (isInferenceFrame(parent?.frame) && parent?.frame.args?.begin?.model_id === modelData.id)))
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

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module defining types and interfaces of events used across the application.
 *
 * TEF timestamps (ts) are provided in microseconds.
 */

import { Metadata } from "@speedscope/app-state/profile-group";


/**
 * Memory-related events
 */

/** Data available for model's inputs and outputs */
interface MemoryArgs {
    used: number,
    unused: number,
    memory_addr: number,
    memory_region: string,
    for_thread_id: number,
}

export const MemoryEventName = "MEMORY";

/** Metadata stored by Speedscope with information about memory usage */
export interface MetadataMemoryType extends Metadata {
    name: typeof MemoryEventName,
    /** Timestamp in µs */
    ts: number,
    args: MemoryArgs
}

export type MemoryEventType = {
    name: string,
    /** Timestamp in µs */
    ts: number,
} & MemoryArgs;

export const MemorySymbolsEventName = `${MemoryEventName}::SYMBOLS`;

/** Metadata stored by Speedscope with information about memory usage */
export interface MetadataMemorySymbolsType extends Metadata {
    name: typeof MemorySymbolsEventName,
    /** Timestamp in µs */
    ts: number,
    args: Record<number, string>,
}

export const MemoryStatMemEventName = `${MemoryEventName}::STATICALLY_ASSIGNED_MEM`;

/** Metadata stored by Speedscope with information about amount of statically assigned memory */
export interface MetadataMemoryStatMemType extends Metadata {
    name: typeof MemoryStatMemEventName,
    /** Timestamp in µs */
    ts: number,
    args: number,
}

export type MemoryMetadataEvents = MetadataMemoryType | MetadataThreadNameType | MetadataMemorySymbolsType | MetadataMemoryStatMemType;


// Thread name event

export const ThreadNameEventName = "thread_name";

/** Metadata stored by Speedscope with mapping of thread ID and thread name */
export interface MetadataThreadNameType extends Metadata {
    name: typeof ThreadNameEventName,
    tid: number,
    args: {
        name: string,
    }
}

/**
 * Sensor-related events
 */

interface CPULoadArgs {
    cpu_load: number,
}

export const CPULoadEventName = "CPU_LOAD";

/** Metadata stored by Speedscope with information about CPU load */
export interface MetadataCPULoadType extends Metadata {
    name: typeof CPULoadEventName
    /** Timestamp in µs */
    ts: number,
    args: CPULoadArgs
}

export type CPULoadEventType = {
    /** Timestamp in µs */
    ts: number
} & CPULoadArgs;

interface TempArgs {
    die_temp: [number],
}

export const TempEventName = "DIE_TEMP";

/** Metadata stored by Speedscope with information about temperature */
export interface MetadataTempType extends Metadata {
    name: typeof TempEventName
    /** Timestamp in µs */
    ts: number,
    args: TempArgs
}

export interface TempEventType {
    /** Timestamp in µs */
    ts: number
    temp: number
    sensor: string
}

/**
 * Model-related events
 */

/** Data available for model's inputs and outputs */
export interface ModelIOType {
    name: string,
    shape: number[],
    dtype: string,

    // TFLM specific options
    name_long?: string,
    shape_signature?: number[],
    quantization?: number[],
    quantization_parameters?: {
        scales: number[],
        zero_points: number[],
        quantized_dimension: number,
    }
}

/** Data available for model's tensors */
export interface ModelTensorType extends ModelIOType {
    index: number,
    subgraph_idx?: number,
}

/** Data available for model's operations */
export interface ModelOpsType {
    op_name: string,
    index: number,
    inputs: number[],
    outputs: number[],
    inputs_types: string[],
    outputs_types: string[],
    inputs_shapes: Record<number, number[]>
    outputs_shapes: Record<number, number[]>

    // TVM specific options
    flatten?: boolean,
    data_layout?: string,
    kernel_layout?: string,
}

export interface MetadataModelArgs {
    inputs: ModelIOType[],
    outputs: ModelIOType[],
    tensors: ModelTensorType[],
    ops: ModelOpsType[],
}

export const ModelEventName = "MODEL";

/** Metadata stored by Speedscope with information about model structure */
export interface MetadataModelType extends Metadata {
    name: typeof ModelEventName,
    args: MetadataModelArgs,
}

/**
 * The arguments of model event.
 * Properties, apart from op_idx, tag and subgraph_idx, will be automatically displayed
 * by the model panel.
 */
export interface ModelEventArgs {
    op_idx: number,
    tag: string,
    runtime: string,
    thread_id: number,
    tag_len: number,

    // TFLM specific options
    subgraph_idx?: number,
    arena_used_bytes?: number,
    arena_tail_usage?: number,
}

/** The arguments of selected frame provided by Speedscope */
export interface SpeedscopeFrameArgs<T, K = T> {
    /** arguments from event starting the selected frame */
    begin: T,
    /** arguments from event ending the selected frame */
    end: K,
}

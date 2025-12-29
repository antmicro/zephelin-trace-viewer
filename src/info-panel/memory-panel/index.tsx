/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module providing memory panels definitions and implementing data provider for these panels.
 */

import { Metadata } from '@speedscope/app-state/profile-group';
import { metadataAtom } from '@speedscope/app-state';
import RAMOverview from './ram-overview';
import MemoryUsageGraph from './memory-usage';
import { MemoryEventType } from '@/event-types';
import { MemoryPlotData, memoryRegionName, getMemoryData } from '@/utils/memory';
import { TotalMemoryPlotProps } from '@/plots/memory-plot';
import { TilingComponent } from '@/utils/tiling-component';


/**
 * The common properties for plots used by the memory panel.
 */
export interface CommonPlotProps extends Omit<TotalMemoryPlotProps, "onZoomEnd" | "memoryNameFunc"> {
    /** The list with memory metadata events */
    data: MemoryEventType[],
    /** The function returning region name based on its address */
    memoryRegionName: (addr: number, withAddr?: boolean, ramPercentage?: boolean) => string,
    /** The mapping of address to memory properties */
    addrToProps: Record<number, {range?: [number, number], threadName?: string, symbol?: string, ramPercent?: number, region?: string}>,
    /** Reference to the tilingComponent instance */
    tilingComponent?: TilingComponent<CommonPlotProps>,
}

export interface MemoryPanelProps {
    /** All memory related events */
    readonly fullData: MemoryEventType[],
    /** Prepared data for memory plots */
    readonly plotData: MemoryPlotData[][],
    /** The mapping of addresses to thread names */
    readonly threadNameData: Record<number, string> | undefined,
    /** The mapping of addresses to their symbols */
    readonly memorySymbols: Record<number, string>,
    /** Mapping of the memory region address to the range in RAM */
    readonly addrToRange: Record<number, [number, number]>,
    /** The number of bytes occupied by static object, like compiled code */
    readonly staticallyAssignedMem: number,
    /** Calculated total size of the RAM */
    readonly totalMemory: number,
}

let CURRENT_GLOBAL_METADATA: Metadata[] | null = null;
let GROUP_CACHE: Record<string, CommonPlotProps | undefined> = {};

/** Calculates data for memory plots and caches the results */
export function dataProvider(groupName: string): CommonPlotProps | undefined {
    const globalMetadata = metadataAtom.get();

    if (globalMetadata !== CURRENT_GLOBAL_METADATA) {
        CURRENT_GLOBAL_METADATA = globalMetadata;
        GROUP_CACHE = {};
    }

    if (groupName in GROUP_CACHE) {
        return GROUP_CACHE[groupName];
    }

    const memoryData = getMemoryData(groupName);
    if (!memoryData) {
        GROUP_CACHE[groupName] = undefined;
        return undefined;
    }

    const {fullData, plotData, threadNameData, memorySymbols, addrToRange, staticallyAssignedMem, totalMemory} = memoryData;
    const memNameFunc = (addr: number, withAddr = true, ramPercentage = true) => memoryRegionName(addr, fullData, threadNameData ?? {}, memorySymbols, addrToRange, withAddr, ramPercentage);
    const addresses = Array.from(new Set(fullData.map(v => v.memory_addr))).sort().reverse();
    const addrToProps = {};
    addresses.forEach((a) => {
        const firstData = fullData.find(v => v.memory_addr === a);
        const threadId = firstData?.for_thread_id;
        addrToProps[a] = {
            range: (a in addrToRange) ? addrToRange[a] : undefined,
            threadName: (threadNameData && threadId) ? threadNameData[threadId] : undefined,
            symbol: memorySymbols[a],
            ramPercent: (a in addrToRange) ? (addrToRange[a][1] - addrToRange[a][0]) : undefined,
            region: firstData?.memory_region,
        };
    });

    const result: CommonPlotProps = {
        data: fullData,
        plotData,
        assignedMemory: staticallyAssignedMem,
        addrToProps,
        totalMemory,
        addrToRange,
        memoryRegionName: memNameFunc,
    };
    GROUP_CACHE[groupName] = result;
    return result;
}


export { RAMOverview, MemoryUsageGraph };

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


/**
 * The common properties for plots used by the memory panel.
 */
export interface CommonPlotProps extends Omit<TotalMemoryPlotProps, "onZoomEnd" | "memoryNameFunc"> {
    /** The list with memory metadata events */
    data: MemoryEventType[],
    /** The function returning region name based on its address */
    memoryRegionName: (addr: number, withAddr?: boolean, ramPercentage?: boolean) => string,
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

let CURRENT_MERADATA: Metadata[] | null = null;
let CALCULATED_DATA: CommonPlotProps | undefined | null = null;

/** Calculates data for memory plots and caches the results */
export function dataProvider(): CommonPlotProps | undefined {
    if (CALCULATED_DATA !== null && CURRENT_MERADATA !== null) {
        if (metadataAtom.get() === CURRENT_MERADATA) {
            console.debug("Returning cached data for memory plots");
            return CALCULATED_DATA;
        }
    }
    CURRENT_MERADATA = metadataAtom.get();

    const memoryData = getMemoryData();
    if (!memoryData) {
        CALCULATED_DATA = undefined;
        return CALCULATED_DATA;
    }

    const {fullData, plotData, threadNameData, memorySymbols, addrToRange, staticallyAssignedMem, totalMemory} = memoryData;
    const memNameFunc = (addr: number, withAddr = true, ramPercentage = true) => memoryRegionName(addr, fullData, threadNameData ?? {}, memorySymbols, addrToRange, withAddr, ramPercentage);

    CALCULATED_DATA = {
        data: fullData,
        plotData,
        assignedMemory: staticallyAssignedMem,
        addrToRange,
        totalMemory,
        memoryRegionName: memNameFunc,
    };
    return CALCULATED_DATA;
}


export { RAMOverview, MemoryUsageGraph };

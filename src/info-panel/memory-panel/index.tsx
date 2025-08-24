/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module implementing panel with model, layer and inference information.
 */

import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { memo } from 'preact/compat';

import styles from '@styles/memory-panel.module.scss';
import PanelTemplate from '../common';
import RAMOverview from './ram-overview';
import MemoryUsageGraph from './memory-usage';
import { MemoryEventType } from '@/event-types';
import { MemoryPlotData, memoryRegionName, getMemoryData } from '@/utils/memory';
import { TotalMemoryPlotProps } from '@/plots/memory-plot';
import tilingComponent, { CSS_ENABLING_OVERFLOW } from '@/utils/tiling-component';


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

/** Panel with either memory usage plot or RAM overview */
const MemoryPanel = memo(({fullData, plotData, threadNameData, memorySymbols, addrToRange, staticallyAssignedMem, totalMemory}: MemoryPanelProps): JSX.Element | undefined => {
    const [totalMemorySelectedSt, setTotalMemorySelectedSt] = useState<boolean>(true);

    const memNameFunc = (addr: number, withAddr = true, ramPercentage = true) => memoryRegionName(addr, fullData, threadNameData ?? {}, memorySymbols, addrToRange, withAddr, ramPercentage);

    const GraphComponent = (totalMemorySelectedSt) ? RAMOverview : MemoryUsageGraph;
    return (
        <PanelTemplate>
            <div className={styles.switch}>
                <form>
                    <label for="radio-ram-overview"><input type="radio" name="plot-type" id="radio-ram-overview" checked={totalMemorySelectedSt} onChange={() => setTotalMemorySelectedSt(true)} /> RAM overview</label>
                    <label for="radio-mem-usage"><input type="radio" name="plot-type" id="radio-mem-usage" onChange={() => setTotalMemorySelectedSt(false)} /> Percentage usage</label>
                </form>
            </div>
            <GraphComponent data={fullData} plotData={plotData} assignedMemory={staticallyAssignedMem} addrToRange={addrToRange} totalMemory={totalMemory} memoryRegionName={memNameFunc} />
        </PanelTemplate>
    );
});

export default tilingComponent(MemoryPanel, "Memory usage", {
    dataProvider: getMemoryData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
})!;

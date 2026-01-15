/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with memory usage graph with legend.
 */

import { JSX } from "preact";

import styles from '@styles/memory-panel.module.scss';
import { useRef, useState, useEffect } from "preact/hooks";
import * as d3 from 'd3';
import PanelTemplate from "../common";
import { CommonPlotProps, dataProvider } from ".";
import { MemoryUsagePlot } from "@/plots/memory-plot";
import tilingComponent, { CSS_ENABLING_OVERFLOW } from "@/utils/tiling-component";
import { useTimestampCallbacks } from "@/utils/time-sync";


/**
 * Creates simple SVG line with given color.
 */
function LineMarker({color, strokeWidth = "1rem", width = "1rem"}: {color: string, strokeWidth?: string, width?: string}) {
    return (
        <svg width={width} height="1rem" viewBox="0 0 100 10">
            <line x1="0" x2="100" y1="5" y2="5" style={{stroke: color, 'stroke-width': strokeWidth}}></line>
        </svg>
    );
}

/**
 * Memory usage (in percent) plot with legend.
 */
function MemoryUsageGraph({ tilingComponent }: CommonPlotProps): JSX.Element |undefined {
    const plotRef = useRef<MemoryUsagePlot>();
    const [isPlotReadySt, setIsPlotReadySt] = useState(false);

    useEffect(() => {
        if (plotRef.current) {
            setIsPlotReadySt(true);
        }
    }, []);

    const getLegendColor = (idx: number) => {
        if (!plotRef.current) {return "#FFFFFF";}
        const [r, g, b] = plotRef.current.getWebglColorByIdx(idx);
        return d3.rgb(r * 255, g * 255, b * 255, 1).formatHex();
    };

    const renderContent = (activeGroup: string) => {
        const currentData = tilingComponent?.dataProvider?.(activeGroup);

        if (!currentData || currentData.assignedMemory === -1) {
            return null;
        }

        const { data, plotData, addrToRange, assignedMemory, memoryRegionName } = currentData;

        const addresses = Array.from(new Set(data.map(v => v.memory_addr)).values()).sort();

        return (
            <div className={styles['memory-usage-content']}>
                <MemoryUsagePlot
                    key={activeGroup}
                    ref={plotRef}
                    plotData={plotData.slice(2)}
                    activeGroups={null}
                    addrToRange={addrToRange}
                    assignedMemory={assignedMemory}
                    memoryNameFunc={memoryRegionName}
                    {...useTimestampCallbacks(plotRef)}
                />
                <div className={styles['memory-usage-legend']}>
                    {isPlotReadySt && addresses.map((v, i) => (
                        <p key={`${activeGroup}-${v}`}>
                            <LineMarker color={getLegendColor(i)} strokeWidth="1.5rem" />
                            {memoryRegionName(v, true, false)}
                        </p>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <PanelTemplate
            tilingComponent={tilingComponent ?? null}
            allowGroupSelection={true}
        >
            {renderContent}
        </PanelTemplate>
    );
}


export default tilingComponent(MemoryUsageGraph, "Memory usage", {
    dataProvider: (groupName: string) => dataProvider(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
})!;

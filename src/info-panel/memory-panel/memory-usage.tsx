/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with memory usage graph with legend.
 */

import { JSX } from "preact";

import styles from '@styles/memory-panel.module.scss';
import { useEffect, useRef, useState } from "preact/hooks";
import * as d3 from 'd3';
import { CommonPlotProps } from ".";
import { MemoryUsagePlot } from "@/plots/memory-plot";


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
export default function MemoryUsageGraph({ data, assignedMemory, addrToRange, plotData, memoryRegionName }: CommonPlotProps): JSX.Element |undefined {
    const plotRef = useRef<MemoryUsagePlot>();
    const plotLegendRef = useRef<HTMLDivElement | null>(null);
    const [legendEntries, setLegendEntries] = useState<JSX.Element[]>();

    const getLegendColor = (idx: number) => {
        const plot = plotRef.current;
        const defaultColor = "#FFFFFF";
        if (plot === undefined) {
            return defaultColor;
        }

        const [r, g, b, _] = plot.getColor(idx);
        return d3.rgb(r * 255, g * 255, b * 255, 1).formatHex();
    };

    if (assignedMemory === -1) { return; }

    const addresses = Array.from(new Set(data.map(v => v.memory_addr)).values()).sort();

    useEffect(() => {
        setLegendEntries(addresses.map((v, i) => <p><LineMarker color={getLegendColor(i)} strokeWidth="1.5rem" /> {memoryRegionName(v, true, false)} </p>));
    }, [plotRef]);

    return (
        <div className={styles['memory-usage-content']}>
            {/* Skip first two elements of plotData used for area plot (RAM overview) */}
            <MemoryUsagePlot ref={plotRef} plotData={plotData.slice(2)} addrToRange={addrToRange} assignedMemory={assignedMemory} memoryNameFunc={memoryRegionName} />
            <div ref={plotLegendRef} className={styles['memory-usage-legend']}>
                {legendEntries}
            </div>
        </div>
    );
}


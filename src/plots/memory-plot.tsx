/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with memory plot definition.
 */

import * as d3 from 'd3';
import * as fc from 'd3fc';

import { PlotBaseProps, ThresholdAnnotationProps } from './base-plot';
import { LinePlot } from './line-plot';
import { MemoryPlotData } from '@/utils/memory';


// Disable due to the d3fc any type usage
/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */

export interface MemoryUsagePlotProps extends PlotBaseProps<MemoryPlotData> {
    /** The mapping of memory region address to a percentage range of the memory */
    addrToRange: Record<number, [number, number]>,
    /** The number of bytes statically allocated in the memory */
    assignedMemory: number,
    /** The function creating memory region name based on its address */
    memoryNameFunc: (addr: number, withAddr?: boolean, ramPerentage?: boolean) => string,
}

/**
 * The component with plot showing a percentage usage of each memory region.
 */
export class MemoryUsagePlot extends LinePlot<MemoryPlotData, MemoryUsagePlotProps> {
    protected _xAccess(e: MemoryPlotData): number {
        return e.ts;
    }

    protected _yAccess(e: MemoryPlotData): number {
        return e.percentage;
    }

    protected _createYScale() {
        return d3.scaleLinear().domain([0, 100]);
    }

    protected override _annotationNote(d: MemoryPlotData): { title: string; note: string; } {
        return {
            title: this.props.memoryNameFunc(d.address, false, false),
            note: `Timestamp: ${d.ts.toFixed(2)} ms\n`
                + `Used: ${d.used} B (${d.percentage.toFixed(2)}%)\n`
                + `Unused: ${d.unused} B\n`
                + `Size: ${d.used + d.unused} B`,
        };
    }

    protected _xLabel(): string | null {
        return "Timestamp [ms]";
    }
    protected _yLabel(): string | null {
        return `Usage [%]`;
    }

    constructor(props: MemoryUsagePlotProps) {
        super(props);
    }
}


export interface TotalMemoryPlotProps extends MemoryUsagePlotProps {
    /** The number of bytes of the memory */
    totalMemory: number,
}

/**
 * The component with plot showing an overview of the whole memory.
 */
export class TotalMemoryPlot extends LinePlot<MemoryPlotData, TotalMemoryPlotProps> {
    protected _createXScale() {
        return d3.scaleLinear().domain(
            fc.extentLinear().include([0]).accessors([(d: MemoryPlotData) => d.ts])(this.props.plotData.flat()) as Iterable<d3.NumberValue>,
        );
    }

    protected _createYScale() {
        return d3.scaleLinear().domain([0, 100]);
    }

    protected _xLabel(): string | null {
        return "Timestamp [ms]";
    }

    protected _yLabel(): string | null {
        return `Usage [%] (${this.props.totalMemory} B total)`;
    }

    protected override _webglMapping(d: {data: (MemoryPlotData[])[], annotations: ThresholdAnnotationProps[]}, index: number): MemoryPlotData[] | {ts: number, base: number}[] {
        if (index >= d.data.length) {
            const b = Object.values(this.props.addrToRange)[index % d.data.length][0];
            return [
                {ts: this._xScaleInitial.domain()[0], base: b},
                {ts: this._xScaleInitial.domain()[1], base: b},
            ];
        }
        return d.data[index];
    }

    protected _createWebglSeries() {
        // Creates areas of used and unused memory
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        const createSeries = (color: string | [number, number, number, number]) => fc.seriesWebglArea()
            .xScale(this.xScale).yScale(this.yScale)
            .crossValue((d: MemoryPlotData) => d.ts)
            .baseValue((d: MemoryPlotData) => (d.base) / this.props.totalMemory * 100)
            .mainValue((d: MemoryPlotData) => (d.base + d.used) / this.props.totalMemory * 100)
            .defined(() => true)
            .decorate((program: any, data: MemoryPlotData[]) => {
                fc.webglFillColor()
                    .value(_ => (typeof color === "string") ? (this.getWebGLColor(color) ?? [1, 0, 0, 1]) : color)
                    .data(data)(program);
            });

        // Creates horizontal separators between memory regions
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        const createLine = (color: string | [number, number, number, number]) => fc.seriesWebglLine()
            .xScale(this.xScale).yScale(this.yScale)
            .crossValue((d: MemoryPlotData) => d.ts)
            .mainValue((d: MemoryPlotData) => d.base)
            .lineWidth(1.5)
            .defined(() => true)
            .decorate((program: any, data: MemoryPlotData[]) => {
                fc.webglStrokeColor()
                    .value(_ => (typeof color === "string") ? (this.getWebGLColor(color) ?? [1, 0, 0, 1]) : color)
                    .data(data)(program);
            });

        const bgColors = {
            0: "--colors-lime",
            1: "--colors-orange",
        };
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-argument */
        return this.props.plotData.map((_v, i) => createSeries((i in bgColors) ? bgColors[i] : "--colors-red")).concat(Object.values(this.props.addrToRange).map(_ => createLine("--colors-black")));
    }

    public override _findClosestPoint(x: number, y: number): MemoryPlotData | null | undefined {
        // Find hovered memory region
        let jY = -1;
        if (y < this.props.assignedMemory / this.props.totalMemory * 100) { jY = 1; }
        else if (y >= this._yScaleInitial.domain()[1]) { jY = this.props.plotData.length - 1; }
        else {
            jY = Object.values(this.props.addrToRange).findIndex(v => {
                return v[0] <= y && y < v[1];
            });
            jY += 2;
        }
        if (jY === -1) {
            console.debug(`Cannot find data on Y-axis for provided y: ${y}`);
            return null;
        }

        // Find the closest point in found memory region
        const dataRegion = this.props.plotData[jY];
        const i = d3.bisector((d: MemoryPlotData) => d.ts).left(dataRegion, x);
        const d0 = dataRegion[(i === 0) ? i : i - 1];
        const d1 = dataRegion[(i >= dataRegion.length) ? dataRegion.length - 1 : i];
        return (x - d0.ts > d1.ts - x) ? d1 : d0;
    }

    protected override _annotationData(d: MemoryPlotData): { x: number; y: number; title: string; note: string; } | null {
        return {
            x: d.ts,
            y: (d.base + d.used) / this.props.totalMemory * 100,
            title: (d.address !== -1) ? this.props.memoryNameFunc(d.address, false, false) : "Statically allocated memory",
            note: ((d.address !== -1) ? `Timestamp: ${d.ts.toFixed(2)} ms\n`
                + `Used: ${d.used} B (${d.percentage.toFixed(2)}%)\n`
                + `Unused: ${d.unused} B\n` : '')
                + `Size: ${d.used + d.unused} B`,
        };
    }

}


/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with line plot definition.
 */

import * as d3 from 'd3';
import * as fc from 'd3fc';

import { PlotBaseProps } from './base-plot';
import TimeBasedPlot from './time-based-plot';

/**
 * The definition of Component for drawing simple line plots.
 *
 * @abstract
 * @extends {Plot<D,T>}
 */
export abstract class LinePlot<D, T extends PlotBaseProps<D> = PlotBaseProps<D>> extends TimeBasedPlot<D, T> {
    quadtree: d3.Quadtree<D> | undefined;

    /** Extract x-axis data from an event */
    protected abstract _xAccess(e: D): number;

    /** Extract y-axis data from an event */
    protected abstract _yAccess(e: D): number;

    /** Create annotation title and note from an event */
    protected _annotationNote(d: D): { title: string; note: string; } {
        return {
            title: "Data",
            note: `X ${this._xAccess(d).toFixed(2)}\n`
                + `Y ${this._yAccess(d).toFixed(2)}\n`,
        };
    }

    protected _createXScale() {
        return d3.scaleLinear().domain(
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
            fc.extentLinear().include([0]).accessors([(e: D) => this._xAccess(e)])(this.props.plotData.flat()) as Iterable<d3.NumberValue>,
        );
    }

    protected _createYScale() {
        return d3.scaleLinear().domain(
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
            fc.extentLinear().accessors([(e: D) => this._yAccess(e)])(this.props.plotData.flat()) as Iterable<d3.NumberValue>,
        );
    }

    protected override _findClosestPoint(x: number, y: number): D | null | undefined {
        // Find closest datapoints to X on each plot
        const closestX = this.props.plotData.map(v => d3.least(v, (a) => Math.abs(this._xAccess(a) - x))).filter(Boolean) as D[];

        const [xBegin, xEnd] = this._xScaleInitial.domain();
        const normX = (a: number) => (a - xBegin) / (xEnd - xBegin);
        const [yBegin, yEnd] = this._yScaleInitial.domain();
        const normY = (a: number) => (a - yBegin) / (yEnd - yBegin);

        // Find closest datapoint from the closest X points on each plots
        return d3.least(closestX, (a) => {
            const [ax, ay] = [this._xAccess(a), this._yAccess(a)];
            return (normX(ax) - normX(x)) ** 2 + (normY(ay) - normY(y)) ** 2;
        });
    }

    protected override _annotationData(d: D): { x: number; y: number; title: string; note: string; } | null {
        const x = this._xAccess(d);
        const y = this._yAccess(d);
        return {
            x: x,
            y: y,
            ...this._annotationNote(d),
        };
    }

    protected _createWebglSeries(): any[] {
        /* eslint-disable
            @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment,
            @typescript-eslint/no-unsafe-return
        */
        const createSeries = (color: number[]) => fc.seriesWebglLine()
            .xScale(this.xScale).yScale(this.yScale)
            .crossValue((e: D) => this._xAccess(e))
            .mainValue((e: D) => this._yAccess(e))
            .lineWidth(1.5)
            .defined(() => true)
            .decorate((program: any, data: D[]) => {
                fc.webglStrokeColor()
                    .value(_ => color)
                    .data(data)(program);
            });
        return this.props.plotData.map((_, idx) => createSeries(this.getWebglColorByIdx(idx)));
        /* eslint-enable
            @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-assignment,
            @typescript-eslint/no-unsafe-return
        */
    }
}

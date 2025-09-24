/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with bar plot definition.
 */

import * as d3 from 'd3';
import * as fc from 'd3fc';

import Plot, { PlotBaseProps } from './base-plot';

export enum Axis {
    X = 'x',
    Y = 'y',
}

const getOppositeAxis = (axis: Axis) => Object.values(Axis).find((a) => a !== axis)!;

type Order = 'ascending' | 'descending';
type Orient = 'vertical' | 'horizontal';

export interface BarPlotProps<D> extends PlotBaseProps<D> {
    order?: Order,
    orient?: Orient,
    decorateSvgSeries?: (defaultColor: string) => (selection: d3.Selection<d3.BaseType, any, any, any>) => void;
}

/**
 * The definition of Component for drawing simple bar plots.
 *
 * @abstract
 * @extends {Plot<D,T>}
 */
export abstract class BarPlot<D, T extends BarPlotProps<D> = BarPlotProps<D>> extends Plot<D, T> {
    protected readonly orient = this.props.orient ?? 'horizontal';
    protected readonly _mainAxis = this.orient === 'vertical' ? Axis.Y : Axis.X;
    protected readonly _axisType = {
        [Axis.X]: this._getAxisType(Axis.X),
        [Axis.Y]: this._getAxisType(Axis.Y),
    };
    public readonly _plotData = this._sortPlotData();

    public override get plotData() {
        return this._plotData;
    }

    protected abstract _accessValue(e: D, axis: Axis): string | number;
    protected abstract _getLabel(axis: Axis): string | null;
    protected abstract _annotationNote(d: D): { title: string, note: string};

    protected _getAxisType(axis: Axis): 'string' | 'number' {
        const [plotData] = this.props.plotData;
        const [e] = plotData;
        const value = this._accessValue(e, axis);
        const type = typeof value;

        if (type === 'number' || type === 'bigint') {
            return 'number';
        }

        if (type !== 'string') {
            console.warn(`Unexpected data type '${type}' for plot axis, treating as 'string'`);
        }

        return 'string';
    }

    protected _access(current: D, plotData: D[], axis: Axis) {
        switch (this._axisType[axis]) {
        case 'number':
            return this._accessValue(current, axis) as number;
        case 'string':
            const currentValue = this._accessValue(current, axis);
            return plotData.findIndex((e) => currentValue === this._accessValue(e, axis));
        };
    }

    protected _sortPlotData() {
        if (!this.props.order) { return this.props.plotData; }

        const descending = this.props.order === 'descending' ? 1 : 0;
        const orderSign = Math.pow(-1, 1 + descending);

        const plotData = this.props.plotData;
        const plotData0 = [...plotData[0]];

        // Assuming main axis is of `number` type
        plotData0.sort((a, b) => {
            const [valueA, valueB] = [a, b]
                .map((e) => this._accessValue(e, this._mainAxis)) as [number, number];
            return (valueB - valueA) * orderSign;
        });

        const oppositeAxis = getOppositeAxis(this._mainAxis);
        const oppositeAxisEntries = plotData0
            .map((e) => [this._accessValue(e, oppositeAxis), this._accessValue(e, this._mainAxis)]);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const oppositeAxisMapping = Object.fromEntries(oppositeAxisEntries);

        const otherPlotData = this.props.plotData
            .slice(1)
            .map((other) => [...other].sort((a, b) => {
                const [valueA, valueB] = [a, b]
                    .map((e) => this._accessValue(e, oppositeAxis))
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
                    .map((v) => oppositeAxisMapping[v] ?? Infinity * orderSign) as [number, number];

                return (valueB - valueA) * orderSign;
            }));

        return [plotData0, ...otherPlotData];
    }

    protected _tickValues(axis: Axis) {
        switch (this._axisType[axis]) {
        case 'number':
            return axis === Axis.X ? super._xTickValues() : super._yTickValues();
        case 'string':
            const [plotData] = this.plotData;
            return d3.range(0, plotData.length);
        };
    }

    protected _tickFormat(axis: Axis) {
        switch (this._axisType[axis]) {
        case 'number':
            return axis === Axis.X ? super._xTickFormat() : super._yTickFormat();
        case 'string':
            const [plotData] = this.plotData;
            return (i: number) => this._accessValue(plotData[i], axis);
        }
    }

    protected override _xTickFormat() { return this._tickFormat(Axis.X); }
    protected override _yTickFormat() { return this._tickFormat(Axis.Y); }
    protected override _xTickValues() { return this._tickValues(Axis.X); }
    protected override _yTickValues() { return this._tickValues(Axis.Y); }
    protected override _xLabel() { return this._getLabel(Axis.X); }
    protected override _yLabel() { return this._getLabel(Axis.Y); }

    protected _createScale(axis: Axis) {
        switch (this._axisType[axis]) {
        case 'number':
            /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
            return d3
                .scaleLinear()
                .domain(fc
                    .extentLinear()
                    .include([0])
                    .pad([0, 0.05])
                    .accessors(
                        [(e: D) => this._accessValue(e, axis)],
                    )(this.plotData.flat()) as Iterable<d3.NumberValue>);
            /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        case 'string':
            const range = [-0.5, this.plotData.reduce((acc, plotData) => acc + plotData.length - 1, 0) + 0.5];
            return d3.scaleLinear().domain(range);
        }
    }

    protected override _createXScale() { return this._createScale(Axis.X); }
    protected override _createYScale() { return this._createScale(Axis.Y); }

    public override _findClosestPoint(x: number, y: number) {
        const [value, axis] = this.orient === 'vertical'
            ? [x, Axis.X]
            : [y, Axis.Y];
        const bars = this.plotData.map((plotData) => plotData.map((e) => [e, plotData])).flat() as ([D, D[]])[];
        const [closest] = d3.least(bars, ([e, plotData]) => Math.abs(this._access(e, plotData, axis) - value)) as D[];
        return closest;
    }

    protected override _annotationData(d: D) {
        const [plotData] = this.plotData;

        const point = {
            [Axis.X]: this._access(d, plotData, Axis.X),
            [Axis.Y]: this._access(d, plotData, Axis.Y),
        };
        point[this._mainAxis] /= 2;

        return {
            ...point,
            ...this._annotationNote(d),
        };
    }

    protected override _annotationOrientation() {
        return this.props.orient ?? super._annotationOrientation();
    }

    protected override _createSvgSeries() {
        /* eslint-disable
            @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-return
        */
        const decorateSvgSeries = this.props.decorateSvgSeries
            ?? ((defaultColor: string) => (selection: d3.Selection<d3.BaseType, any, any, any>) => {
                selection.select('path').attr('fill', defaultColor);
            });

        const createSeries = (plotData: D[], color: string) => fc
            .autoBandwidth(fc.seriesSvgBar())
            .xScale(this.xScale).yScale(this.yScale)
            .orient(this.orient)
            .crossValue((e: D) => this._access(e, plotData, getOppositeAxis(this._mainAxis)))
            .mainValue((e: D) => this._access(e, plotData, this._mainAxis))
            .defined(() => this.xScale.range().some(Boolean) && this.yScale.range().some(Boolean))
            .decorate(decorateSvgSeries(color));

        return this.plotData.map((plotData, idx) => createSeries(plotData, this.getCSSColorByIdx(idx)));
        /* eslint-enable
            @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-return
        */
    }
}

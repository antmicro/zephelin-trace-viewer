/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with bar plot definition.
 */

import * as d3 from 'd3';
import * as fc from 'd3fc';
import { getGroupNames } from "@speedscope/app-state/utils";
import { getCSSColorByIdx } from './utils';

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

    protected get _uniqueLabels(): string[] {
        const oppositeAxis = getOppositeAxis(this._mainAxis);
        const allLabels = this.plotData.flat().map(d => String(this._accessValue(d, oppositeAxis)));
        return Array.from(new Set(allLabels));
    }

    protected _access(current: D, plotData: D[], axis: Axis) {
        switch (this._axisType[axis]) {
        case 'number':
            return this._accessValue(current, axis) as number;
        case 'string':
            const label = String(this._accessValue(current, axis));
            return this._uniqueLabels.indexOf(label);
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
            return d3.range(0, this._uniqueLabels.length);
        };
    }

    protected _tickFormat(axis: Axis) {
        switch (this._axisType[axis]) {
        case 'number':
            return axis === Axis.X ? super._xTickFormat() : super._yTickFormat();
        case 'string':
            const labels = this._uniqueLabels;
            return (i: number) => labels[i] ?? '';
        };
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
            const maxVal = d3.max(this.plotData.flat(), d =>
                (this._accessValue(d, this._mainAxis) as number) || 0,
            ) ?? 0;
            return d3.scaleLinear().domain([0, maxVal * 1.05]);
        case 'string':
            const count = this._uniqueLabels.length;
            return d3.scaleLinear().domain([-0.5, count - 0.5]);
        };
    }

    protected override _createXScale() { return this._createScale(Axis.X); }
    protected override _createYScale() { return this._createScale(Axis.Y); }

    protected _getOffset(barGroupIndex: number) {
        const groupWidth = 0.8;
        const barGroupCount = this.plotData.length;
        const barWidth = groupWidth / barGroupCount;

        return (barGroupIndex - (barGroupCount - 1) / 2) * barWidth;
    }

    public override _findClosestPoint(x: number, y: number) {
        const oppositeAxis = getOppositeAxis(this._mainAxis);
        const mouseCoord = this.orient === 'vertical' ? x : y;

        const allPoints = this.plotData.flatMap((series, id) =>
            series.map(d => ({ data: d, seriesId: id })),
        );

        const closest = d3.least(allPoints, ({ data, seriesId }) => {
            const categoryIdx = this._uniqueLabels.indexOf(String(this._accessValue(data, oppositeAxis)));

            return Math.abs((categoryIdx - this._getOffset(seriesId)) - mouseCoord);
        });

        return closest?.data;
    }

    protected override _annotationData(d: D) {
        const plotData = this.plotData;

        const barGroupIndex = plotData.findIndex(series => series.includes(d));

        const oppositeAxis = getOppositeAxis(this._mainAxis);
        const label = String(this._accessValue(d, oppositeAxis));
        const categoryIndex = this._uniqueLabels.indexOf(label);

        const offset = this._getOffset(barGroupIndex);

        const point = {
            [Axis.X]: this.orient === 'vertical' ? categoryIndex - offset : this._access(d, plotData[barGroupIndex], Axis.X),
            [Axis.Y]: this.orient === 'horizontal' ? categoryIndex - offset : this._access(d, plotData[barGroupIndex], Axis.Y),
        };

        point[this._mainAxis] = (this._accessValue(d, this._mainAxis) as number) / 2;

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
            @typescript-eslint/no-unsafe-return,
            @typescript-eslint/no-unsafe-argument,
            @typescript-eslint/no-unsafe-assignment
        */
        const decorateSvgSeries = this.props.decorateSvgSeries
            ?? ((defaultColor: string) => (selection: d3.Selection<d3.BaseType, any, any, any>) => {
                selection.select('path').attr('fill', defaultColor);
            });

        // Define bar template
        const barSeries = fc.seriesSvgBar().orient(this.orient);

        // Define how bars should be grouped
        const groupedBar = fc.seriesSvgGrouped(barSeries)
            .xScale(this.xScale)
            .yScale(this.yScale)
            .orient(this.orient)
            .crossValue((d: D) => {
                const label = String(this._accessValue(d, getOppositeAxis(this._mainAxis)));
                return this._uniqueLabels.indexOf(label);
            })
            .mainValue((d: D) => (this._accessValue(d, this._mainAxis) as number) || 0)
            // Apply proper collor to the bar inside selection
            .decorate((
                selection: d3.Selection<d3.BaseType, any, any, any>,
                _data: D[],
                index: number,
            ) => {
                const groupNames = getGroupNames();
                const color = getCSSColorByIdx(
                    Array.isArray(this.props.activeGroup)
                        ? groupNames.findIndex((x) => x === this.props.activeGroup[index])
                        : groupNames.findIndex((x) => x === this.props.activeGroup),
                    this.plotData.length,
                );
                decorateSvgSeries(color)(selection);
            });

        const finalGrouped = fc.autoBandwidth(groupedBar) as (
            selection: d3.Selection<d3.BaseType, D[][], any, any>
        ) => void;

        // Bind plotData to the chart and render it
        const seriesWrapper = (selection: d3.Selection<d3.BaseType, D[][], any, any>) => {
            selection.datum(this.plotData).call(finalGrouped);
        };

        // As seriesWrapper is a custom function we need to copy xScale and yScale functions so d3fs can process it
        fc.rebind(seriesWrapper, finalGrouped, 'xScale', 'yScale');

        return [seriesWrapper];
        /* eslint-enable
            @typescript-eslint/no-unsafe-call,
            @typescript-eslint/no-unsafe-member-access,
            @typescript-eslint/no-unsafe-return,
            @typescript-eslint/no-unsafe-argument,
            @typescript-eslint/no-unsafe-assignment
        */
    }
}

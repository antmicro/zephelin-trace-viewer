/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with Operator Execution Time plot definition.
 */


import { TimeFormatter } from '@speedscope/lib/value-formatters';
import { OpExecutionData } from '../event-types';
import { Axis, BarPlot, BarPlotProps } from './bar-plot';

export interface OpExecutionTimePlotProps<D> extends BarPlotProps<D> {
    showTypeLabel?: boolean
}

export class OpExecutionTimePlot<
    D extends OpExecutionData = OpExecutionData,
    T extends OpExecutionTimePlotProps<D> = BarPlotProps<D>
> extends BarPlot<D, T> {

    formatter = new TimeFormatter('microseconds');

    protected override _accessValue(e: OpExecutionData, axis: Axis) {
        const label = this.props.showTypeLabel ?  `${e.name} Type` : e.name;
        return axis === this._mainAxis ? e.totalDuration.average / 1e3 : label;
    }

    protected override _getLabel(axis: Axis) {
        return axis === this._mainAxis ? "Time [ms]" : "Operator Name";
    }


    protected override _defineSeriesGroups() {
        return [
            this._createGroupedLayer((d) => d.totalDuration.average / 1e3, 0.6),
            this._createGroupedLayer((d) => d.selfDuration.average / 1e3, 1),
        ];
    }

    /** Create annotation title and note from an event */
    protected override _annotationNote(d: OpExecutionData) {
        const name = d.name;
        const selfTotal = this.formatter.format(d.selfDuration.total);
        const selfAverage = this.formatter.format(d.selfDuration.average);
        const totalTotal = this.formatter.format(d.totalDuration.total);
        const totalAverage = this.formatter.format(d.totalDuration.average);
        let note =
`
Inclusive Average time: ${totalAverage}\n
Inclusive Total time: ${totalTotal}\n
Exclusive Average time: ${selfAverage}\n
Exclusive Total time: ${selfTotal}\n
`;
        if (d.sourceProfile) {
            note += `\nSource Profile: ${d.sourceProfile}`;
        }
        return {
            title: name.toString(),
            note: note,
        };
    }
}

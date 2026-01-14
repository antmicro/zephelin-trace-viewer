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
        return axis === this._mainAxis ? e.duration.average / 1e3 : label;
    }

    protected override _getLabel(axis: Axis) {
        return axis === this._mainAxis ? "Time [ms]" : "Operator Name";
    }

    /** Create annotation title and note from an event */
    protected override _annotationNote(d: OpExecutionData) {
        const name = d.name;
        const total = this.formatter.format(d.duration.total);
        const average = this.formatter.format(d.duration.average);
        let note = `Average time: ${average}\nTotal time: ${total}`;
        if (d.sourceProfile) {
            note += `\nSource Profile: ${d.sourceProfile}`;
        }
        return {
            title: name.toString(),
            note: note,
        };
    }
}

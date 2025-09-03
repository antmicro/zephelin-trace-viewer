/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with Operator Execution Time plot definition.
 */


import { TimeFormatter } from '@speedscope/lib/value-formatters';
import { OpExecutionEvent } from '../event-types';
import { Axis, BarPlot } from './bar-plot';


export class OpTypeExecutionTimePlot extends BarPlot<OpExecutionEvent> {
    formatter = new TimeFormatter('microseconds');

    protected override _accessValue(e: OpExecutionEvent, axis: Axis) {
        return axis === this._mainAxis ? e.duration.average / 1e3 : e.name;
    }

    protected override _getLabel(axis: Axis) {
        return axis === this._mainAxis ? "Time [ms]" : "Operator Name";
    }

    /** Create annotation title and note from an event */
    protected override _annotationNote(d: OpExecutionEvent) {
        const name = d.name;
        const total = this.formatter.format(d.duration.total);
        const average = this.formatter.format(d.duration.average);
        return {
            title: name.toString(),
            note: `Average time: ${average}\nTotal time: ${total}`,
        };
    }
}

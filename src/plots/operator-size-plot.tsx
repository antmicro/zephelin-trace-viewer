/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with Operator Type Execution Time plot definition.
 */


import { OpSizeData } from '../event-types';
import { Axis, BarPlot, BarPlotProps } from './bar-plot';


export class OpSizePlot<D extends OpSizeData = OpSizeData, T extends BarPlotProps<D> = BarPlotProps<D>> extends BarPlot<D, T> {
    protected override _accessValue(e: OpSizeData, axis: Axis) {
        return axis === this._mainAxis ? e.size : e.name;
    }

    protected override _getLabel(axis: Axis) {
        return axis === this._mainAxis ? "Size [B]" : "Operator Name";
    }

    /** Create annotation title and note from an event */
    protected override _annotationNote(d: OpSizeData) {
        return {
            title: d.name,
            note: `Size: ${d.size}B`,
        };
    }
}

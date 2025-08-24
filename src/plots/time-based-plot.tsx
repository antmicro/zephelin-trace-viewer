/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { JSX } from 'preact/jsx-runtime';
import * as fc from 'd3fc';
import { Selection } from 'd3-selection';
import { timestampHoveredAtom } from '@speedscope/app-state';

import Plot, { PlotBaseProps } from './base-plot';


export default abstract class TimeBasedPlot<D, T extends PlotBaseProps<D> = PlotBaseProps<D>> extends Plot<D, T> {
    protected override _createPointer(): ((s: Selection<d3.BaseType, any, any, any>) => void) | null {
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
        return fc.pointer().on("point", ([coord]: {x: number, y: number}[]) => {
            if (!coord) {
                console.debug("Missing coordinates");
                timestampHoveredAtom.set(null);
                return;
            }

            // find the closes datapoint to the pointer
            const x = this.xScale.invert(coord.x as d3.NumberValue);
            const y = this.yScale.invert(coord.y as d3.NumberValue);
            const [yBegin, yEnd] = this.yScale.domain();
            timestampHoveredAtom.set({
                x,
                yProc: (y - yBegin) / (yEnd - yBegin),
            });
        });
    }

    override render(): JSX.Element {
        timestampHoveredAtom.subscribe(() => {
            this.annotations.pop();
            const timestamp = timestampHoveredAtom.get();
            if (!timestamp) {
                this.redraw();
                return;
            }

            const {x, yProc} = timestamp;
            const [yBegin, yEnd] = this.yScale.domain();
            const d = this._findClosestPoint(x, yBegin + (yEnd - yBegin) * yProc);

            this._addAnnotation(d);
        });
        return super.render();
    }
}


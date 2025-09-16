/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { timestampHoveredAtom } from "@speedscope/app-state";
import { RefObject } from "preact";
import Plot from "@/plots/base-plot";

/** Callback for plot point event, creates annotation based on shared timestamp */
export const addTimestampAnontation = <D>(plotRef: RefObject<Plot<D>>) => {
    return () => {
        const { current: plot } = plotRef;
        if (!plot) {return null;}

        plot.annotations.pop();
        const timestamp = timestampHoveredAtom.get();
        if (!timestamp) {
            plot.redraw();
            return;
        }

        const {x, yProc} = timestamp;
        const [yBegin, yEnd] = plot.yScale.domain();
        const d = plot._findClosestPoint(x, yBegin + (yEnd - yBegin) * yProc);

        plot._addAnnotation(d);
    };
};

/** Callback for plot timestamp hover event, assigns value for shared timestamp */
export const setTimestampFromPoint = <D>(plotRef: RefObject<Plot<D>>) => {
    return ([coord]: { x: number, y: number }[]) => {
        const { current: plot } = plotRef;
        if (!plot) {return null;}

        if (!coord) {
            console.debug("Missing coordinates");
            timestampHoveredAtom.set(null);
            return;
        }

        // find the closes datapoint to the pointer
        const x = plot.xScale.invert(coord.x as d3.NumberValue);
        const y = plot.yScale.invert(coord.y as d3.NumberValue);
        const [yBegin, yEnd] = plot.yScale.domain();
        timestampHoveredAtom.set({
            x,
            yProc: (y - yBegin) / (yEnd - yBegin),
        });
    };
};

/** Creates timestamp plot callbacks, linking hover with Speedscope and other plots */
export const useTimestampCallbacks = <D>(plotRef: RefObject<Plot<D>>) => {
    return {
        onPoint: setTimestampFromPoint(plotRef),
        onTimestampHover: addTimestampAnontation(plotRef),
    };
};

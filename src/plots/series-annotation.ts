/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with wrapping d3-svg-annotation to fit into d3fc API.
 */

import * as d3 from 'd3';
import * as fc from 'd3fc';
import Annotation, { annotation } from 'd3-svg-annotation';


// Disable due to the d3fc any type usage
/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */

/**
 * The SVG anntotaion object compatible with d3fc.
 * @template T type of the data accessed by the annotations
 */
export default function seriesSvgAnnotation<T>(): Annotation<T> {
    // the underlying component wrapped for d3fc
    const d3Annotation = annotation();

    let xScale = d3.scaleLinear();
    let yScale = d3.scaleLinear();

    const join = fc.dataJoin("g", "annotation");

    const series = selection => {
        selection.each((data, index, group) => {
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
            const projectedData = data.map(d => ({
                ...d,
                x: xScale(d.x as d3.NumberValue),
                y: yScale(d.y as d3.NumberValue),
            }));

            d3Annotation.annotations(projectedData as any[]);

            join(d3.select(group[index]), projectedData).call(d3Annotation);
        });
    };

    series.xScale = (...args: any[]) => {
        if (!args.length) {
            return xScale;
        }
        xScale = args[0];
        return series;
    };

    series.yScale = (...args: any[]) => {
        if (!args.length) {
            return yScale;
        }
        yScale = args[0];
        return series;
    };

    fc.rebindAll(series, d3Annotation);

    return series;
};



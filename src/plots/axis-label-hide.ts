/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with axis adapter hiding overlapping labels.
 */

import * as d3 from "d3";
import { rebindAll, exclude } from '@d3fc/d3fc-rebind';
import measureLabels from '@d3fc/d3fc-axis/src/measureLabels';
import { CartesianChart, Scale } from '@d3fc/d3fc-chart/src/cartesian';


// Disable due to the d3fc any type usage
/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */

/**
 * The adapter hiding overlapping labels and adjusting the width of Y axis.
 * @param adaptee The axis with labels.
 */
export default (adaptee: any) => {

    let decorate = (_) => { };
    let series: CartesianChart<Scale, Scale> | null = null;

    const isVertical = () =>
        adaptee.orient() === 'left' || adaptee.orient() === 'right';

    const decorateHide = (selection: d3.Selection<d3.BaseType, any, any, any>) => {
        const { maxHeight, maxWidth, labelCount } = measureLabels(adaptee)(selection);
        const vertical = isVertical();
        const range = adaptee.scale().range()[vertical ? 0 : 1];
        const domain = adaptee.scale().domain();

        // Calculate how many levels are needed to fit all labels
        const offsetLevels = Math.floor(((vertical ? maxHeight : maxWidth) * labelCount) / range) + 1;

        // Display labels only at the first level and in domain
        selection.select('text')
            .attr('visibility', (x, i) => {
                const inDomain = x >= domain[0] && x <= domain[1];
                const firstLevel = ((i % offsetLevels) === 0);
                return inDomain && firstLevel ? 'visible' : 'hidden';
            });
        selection.select('path')
            .attr('visibility', (x) => x >= domain[0] && x <= domain[1] ? 'visible' : 'hidden');
        if (series && vertical) {
            // Increase width of Y axis - max width of label + tick + padding
            series.yAxisWidth(`max(${Math.ceil(maxWidth as number) + 10 + 2}px, 3rem)`);
        }
    };

    const axisLabelHide = (arg): any => adaptee(arg);

    adaptee.decorate((s: d3.Selection<d3.BaseType, any, any, any>) => {
        decorateHide(s);
        decorate(s);
    });

    axisLabelHide.decorate = (...args) => {
        if (!args.length) {
            return decorate;
        }
        decorate = args[0];
        return axisLabelHide;
    };

    axisLabelHide.series = (...args) => {
        if (!args.length) {
            return series;
        }
        series = args[0];
        return axisLabelHide;
    };

    rebindAll(axisLabelHide, adaptee, exclude('decorate', 'series'));

    return axisLabelHide;
};

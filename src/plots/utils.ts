/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module with plot related utilities..
 */

import * as d3 from 'd3';

export const PLOT_COLORS = [
    "#00E58D",  // green500
    "#0093E5",  // blue500
    "#E56000",  // orange500
    "#007F8C",  // teal500
    "#159500",  // lime500
    "#DE1135",  // red500
    "#9E1FDA",  // purple500
    "#E59700",  // yellow500
];

export function getCSSColorByIdx(i: number, totalCount: number): string {
    if (totalCount <= 8) {
        return PLOT_COLORS[i % 8];
    } else if (totalCount <= 10) {
        return d3.schemeTableau10[i % 10];
    } else {
        const t = (i / (totalCount - 1)) * 0.96 + 0.04;
        return d3.interpolateTurbo(t);
    }
}

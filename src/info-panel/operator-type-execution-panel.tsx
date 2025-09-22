/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator type execution time plot.
 */

import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW } from '@/utils/tiling-component';
import { getOpTypeExecutionData } from '@/utils/model';
import { OpExecutionData } from '@/event-types';
import { OpExecutionTimePlot } from '@/plots/operator-execution-plot';


/** Panel with Operator Type Execution Time plot */
function OpTypeExecutionTimePanel({ plotData }: { plotData: OpExecutionData[][] }) {
    return (
        <PanelTemplate>
            <OpExecutionTimePlot plotData={plotData} orient='horizontal' order='ascending' />
        </PanelTemplate>
    );
};

export default tilingComponent(OpTypeExecutionTimePanel, "Operator Type Execution Time", {
    dataProvider: getOpTypeExecutionData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

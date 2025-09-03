/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator execution time plot.
 */

import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW } from '@/utils/tiling-component';
import { getOpData } from '@/utils/model';
import { OpExecutionEvent } from '@/event-types';
import { OpTypeExecutionTimePlot } from '@/plots/operator-type-plot';


/** Panel with Operator Type Execution Time plot */
function OperatorTypeExecutionPanel({ plotData }: { plotData: OpExecutionEvent[][] }) {
    return (
        <PanelTemplate>
            <OpTypeExecutionTimePlot plotData={plotData} orient='horizontal' order='ascending' />
        </PanelTemplate>
    );
};

export default tilingComponent(OperatorTypeExecutionPanel, "Operator Type Execution Time", {
    dataProvider: getOpData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

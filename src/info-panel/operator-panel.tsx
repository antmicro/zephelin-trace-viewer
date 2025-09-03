/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator execution time plot.
 */

import { useTheme } from '@speedscope/views/themes/theme';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW } from '@/utils/tiling-component';
import { getOpData } from '@/utils/model';
import { OpExecutionEvent } from '@/event-types';
import { OpExecutionTimePlot } from '@/plots/operator-plot';


/** Panel with Operator Execution Time plot */
function OperatorExecutionPanel({ plotData }: { plotData: OpExecutionEvent[][] }) {
    const theme = useTheme();
    return (
        <PanelTemplate>
            <OpExecutionTimePlot plotData={plotData} orient='horizontal' order='ascending' theme={theme} />
        </PanelTemplate>
    );
};

export default tilingComponent(OperatorExecutionPanel, "Operator Execution Time", {
    dataProvider: getOpData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

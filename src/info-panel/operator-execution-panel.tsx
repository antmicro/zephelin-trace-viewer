/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator execution time plot.
 */

import { Theme, useTheme } from '@speedscope/views/themes/theme';
import { useRef } from 'preact/compat';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW } from '@/utils/tiling-component';
import { getOpExecutionData } from '@/utils/model';
import { OpExecutionEvent } from '@/event-types';
import { useFrameCallbacks } from '@/utils/frame-provider';
import { OpExecutionTimePlot } from '@/plots/operator-execution-plot';
import { BarPlotProps } from '@/plots/bar-plot';

/** Panel with Operator Execution Time plot */
function OpExecutionTimePanel({ plotData }: { plotData: OpExecutionEvent[][] }) {
    const theme = useTheme();
    const plotRef = useRef<OpExecutionTimePlot<OpExecutionEvent, BarPlotProps<OpExecutionEvent> & { theme: Theme }>>(null);

    return (
        <PanelTemplate>
            <OpExecutionTimePlot
                ref={plotRef}
                plotData={plotData}
                orient='horizontal'
                order='ascending'
                theme={theme}
                {...useFrameCallbacks(plotRef)}
            />
        </PanelTemplate>
    );
};

export default tilingComponent(OpExecutionTimePanel, "Operator Execution Time", {
    dataProvider: getOpExecutionData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

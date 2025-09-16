/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator size plot.
 */

import { Theme, useTheme } from '@speedscope/views/themes/theme';
import { useRef } from 'preact/compat';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW } from '@/utils/tiling-component';
import { OpSizeData } from '@/event-types';
import { useFrameCallbacks } from '@/utils/frame-provider';
import { OpSizePlot } from '@/plots/operator-size-plot';
import { BarPlotProps } from '@/plots/bar-plot';
import { getOpSizeData } from '@/utils/model';

/** Panel with Operator Size plot */
function OpSizePanel({ plotData }: { plotData: OpSizeData[][] }) {
    const theme = useTheme();
    const plotRef = useRef<OpSizePlot<OpSizeData, BarPlotProps<OpSizeData> & { theme: Theme }>>(null);

    return (
        <PanelTemplate>
            <OpSizePlot
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

export default tilingComponent(OpSizePanel, "OP Size", {
    dataProvider: getOpSizeData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

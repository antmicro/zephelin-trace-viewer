/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator execution time plot.
 */

import { Theme, useTheme } from '@speedscope/views/themes/theme';
import { useRef } from 'preact/compat';
import { useAtom } from '@speedscope/lib/atom';
import { profileGroupAtom } from '@speedscope/app-state';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW, TilingComponent } from '@/utils/tiling-component';
import { getOpExecutionData } from '@/utils/model';
import { OpExecutionData } from '@/event-types';
import { useFrameCallbacks } from '@/utils/frame-provider';
import { OpExecutionTimePlot } from '@/plots/operator-execution-plot';
import { BarPlotProps } from '@/plots/bar-plot';

export interface OpExecutionTimeProps {
    /** The data for Op Execution Time plot */
    plotData: OpExecutionData[][],
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<OpExecutionTimeProps>
}


function OpExecutionTimePlotWrapper({ activeGroup, theme, tilingComponent }: {
    activeGroup: string,
    theme: Theme,
    tilingComponent: TilingComponent<OpExecutionTimeProps>
}) {
    const plotRef = useRef<OpExecutionTimePlot<OpExecutionData, BarPlotProps<OpExecutionData> & { theme: Theme }>>(null);
    const data = tilingComponent.dataProvider?.(activeGroup);
    const displayData = data?.plotData ?? [];

    return (
        <OpExecutionTimePlot
            key={activeGroup}
            ref={plotRef}
            plotData={displayData}
            activeGroup={activeGroup}
            orient='horizontal'
            order='ascending'
            theme={theme}
            {...useFrameCallbacks(plotRef, activeGroup)}
        />
    );
}

/** Panel with Operator Execution Time plot */
function OpExecutionTimePanel({ tilingComponent }: OpExecutionTimeProps ) {
    const theme = useTheme();

    const renderPlot = (activeGroup: string) => {

        const profileGroup = useAtom(profileGroupAtom);
        const activeProfileIndex = profileGroup?.indexToView;

        return  (
            <OpExecutionTimePlotWrapper
                key={`${activeGroup}:${activeProfileIndex }`}
                activeGroup={activeGroup}
                theme={theme}
                tilingComponent={tilingComponent}
            />
        );};

    return (
        <PanelTemplate
            tilingComponent={tilingComponent}
            allowGroupSelection={true}
        >
            {renderPlot}
        </PanelTemplate>
    );
};

export default tilingComponent(OpExecutionTimePanel, "OP Execution Time", {
    dataProvider: (groupName: string) => getOpExecutionData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

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


function OpExecutionTimePlotWrapper({ activeGroups, theme, tilingComponent }: {
    activeGroups: string[],
    theme: Theme,
    tilingComponent: TilingComponent<OpExecutionTimeProps>
}) {
    const plotRef = useRef<OpExecutionTimePlot<OpExecutionData, BarPlotProps<OpExecutionData> & { theme: Theme }>>(null);

    const displayData = activeGroups.map(name =>
        tilingComponent.dataProvider?.(name)?.plotData.flat() ?? [],
    );

    return (
        <OpExecutionTimePlot
            key={activeGroups.join(",")}
            ref={plotRef}
            plotData={displayData}
            activeGroups={activeGroups}
            orient='horizontal'
            order='ascending'
            theme={theme}
            {...useFrameCallbacks(plotRef, activeGroups, theme)}
        />
    );
}

/** Panel with Operator Execution Time plot */
function OpExecutionTimePanel({ tilingComponent }: OpExecutionTimeProps ) {
    const theme = useTheme();

    const renderPlot = (activeGroups: string[]) => {

        const profileGroup = useAtom(profileGroupAtom);
        const activeProfileIndex = profileGroup?.indexToView;

        return  (
            <OpExecutionTimePlotWrapper
                key={`${activeGroups.join(",")}:${activeProfileIndex}`}
                activeGroups={activeGroups}
                theme={theme}
                tilingComponent={tilingComponent}
            />
        );};

    return (
        <PanelTemplate
            tilingComponent={tilingComponent}
            allowGroupSelection={true}
            allowMultiplePlots={true}
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

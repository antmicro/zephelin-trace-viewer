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
import { useAtom } from '@speedscope/lib/atom';
import { profileGroupAtom } from '@speedscope/app-state';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW, TilingComponent } from '@/utils/tiling-component';
import { OpSizeData } from '@/event-types';
import { useFrameCallbacks } from '@/utils/frame-provider';
import { OpSizePlot } from '@/plots/operator-size-plot';
import { BarPlotProps } from '@/plots/bar-plot';
import { getOpSizeData } from '@/utils/model';


export interface OpSizeProps {
    /** The data for Op Size plot */
    plotData: OpSizeData[][],
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<OpSizeProps>
}

function OpSizePlotWrapper({ activeGroup, theme, tilingComponent }: {
    activeGroup: string,
    theme: Theme,
    tilingComponent: TilingComponent<OpSizeProps>
}) {
    const plotRef = useRef<OpSizePlot<OpSizeData, BarPlotProps<OpSizeData> & { theme: Theme }>>(null);
    const data = tilingComponent.dataProvider?.(activeGroup);
    const displayData = data?.plotData ?? [];

    return (
        <OpSizePlot
            key={activeGroup}
            ref={plotRef}
            plotData={displayData}
            orient='horizontal'
            order='ascending'
            theme={theme}
            {...useFrameCallbacks(plotRef, activeGroup)}
        />
    );
}

/** Panel with Operator Size plot */
function OpSizePanel({ tilingComponent }: OpSizeProps) {
    const theme = useTheme();

    const profileGroup = useAtom(profileGroupAtom);
    const activeProfileIndex = profileGroup?.indexToView;

    const renderPlot = (activeGroup: string) => {
        return  (
            <OpSizePlotWrapper
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

export default tilingComponent(OpSizePanel, "OP Size", {
    dataProvider: (groupName: string) => getOpSizeData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

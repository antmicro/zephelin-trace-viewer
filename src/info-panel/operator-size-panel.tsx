/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
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

function OpSizePlotWrapper({ activeGroups, theme, tilingComponent }: {
    activeGroups: string[],
    theme: Theme,
    tilingComponent: TilingComponent<OpSizeProps>
}) {
    const plotRef = useRef<OpSizePlot<OpSizeData, BarPlotProps<OpSizeData> & { theme: Theme }>>(null);

    const displayData = activeGroups.map(name =>
        tilingComponent.dataProvider?.(name)?.plotData.flat() ?? [],
    );

    return (
        <OpSizePlot
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

/** Panel with Operator Size plot */
function OpSizePanel({ tilingComponent }: OpSizeProps) {
    const theme = useTheme();

    const profileGroup = useAtom(profileGroupAtom);
    const activeProfileIndex = profileGroup?.indexToView;

    const renderPlot = (activeGroups: string[]) => {
        return  (
            <OpSizePlotWrapper
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

export default tilingComponent(OpSizePanel, "OP Size", {
    dataProvider: (groupName: string) => getOpSizeData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

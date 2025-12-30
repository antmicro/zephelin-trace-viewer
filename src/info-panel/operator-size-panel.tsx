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
import { useRef, useState } from 'preact/compat';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW, getTilingComponent, TilingComponent } from '@/utils/tiling-component';
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

/** Panel with Operator Size plot */
function OpSizePanel({ tilingComponent }: OpSizeProps) {
    const theme = useTheme();
    const plotRef = useRef<OpSizePlot<OpSizeData, BarPlotProps<OpSizeData> & { theme: Theme }>>(null);

    const [activeGroupNameSt, setActiveGroupNameSt] = useState(tilingComponent.targetGroupName);

    const newData = tilingComponent?.dataProvider?.(activeGroupNameSt);
    const displayData = newData?.plotData ?? [];

    const handleGroupChange = (name: string) => {
        setActiveGroupNameSt(name);
        tilingComponent.setTargetGroup(name);
    };

    const isValid = (name: string) => {
        const component = getTilingComponent("OP Size");
        return !!component?.dataProvider?.(name);
    };

    if (!tilingComponent) {return null;}

    return (
        <PanelTemplate
            selectedGroupName={activeGroupNameSt}
            isValidGroup={isValid}
            onGroupChange={handleGroupChange}
            allowGroupSelection={true}>
            <OpSizePlot
                key={activeGroupNameSt}
                ref={plotRef}
                plotData={displayData}
                orient='horizontal'
                order='ascending'
                theme={theme}
                {...useFrameCallbacks(plotRef)}
            />
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

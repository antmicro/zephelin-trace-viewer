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
import { useRef, useState } from 'preact/compat';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW, getTilingComponent, TilingComponent } from '@/utils/tiling-component';
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


/** Panel with Operator Execution Time plot */
function OpExecutionTimePanel({ tilingComponent }: OpExecutionTimeProps ) {
    const theme = useTheme();
    const plotRef = useRef<OpExecutionTimePlot<OpExecutionData, BarPlotProps<OpExecutionData> & { theme: Theme }>>(null);

    const [activeGroupNameSt, setActiveGroupNameSt] = useState(tilingComponent.targetGroupName);

    const newData = tilingComponent.dataProvider?.(activeGroupNameSt);
    const displayData = newData?.plotData ?? [];

    const handleGroupChange = (name: string) => {
        setActiveGroupNameSt(name);
        tilingComponent.setTargetGroup(name);
    };

    const isValid = (name: string) => {
        const component = getTilingComponent("OP Execution Time");
        return !!component?.dataProvider?.(name);
    };

    if (!tilingComponent) {return null;}
    return (
        <PanelTemplate
            selectedGroupName={activeGroupNameSt}
            isValidGroup={isValid}
            onGroupChange={handleGroupChange}
            allowGroupSelection={true}>
            <OpExecutionTimePlot
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

export default tilingComponent(OpExecutionTimePanel, "OP Execution Time", {
    dataProvider: (groupName: string) => getOpExecutionData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

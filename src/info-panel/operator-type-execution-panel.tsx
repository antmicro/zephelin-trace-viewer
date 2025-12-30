/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator type execution time plot.
 */

import { useState } from 'preact/compat';
import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW, getTilingComponent, TilingComponent } from '@/utils/tiling-component';
import { getOpTypeExecutionData } from '@/utils/model';
import { OpExecutionData } from '@/event-types';
import { OpExecutionTimePlot } from '@/plots/operator-execution-plot';


export interface OpTypeExecutionTimeProps {
    /** The data for Op Execution Time plot */
    plotData: OpExecutionData[][],
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<OpTypeExecutionTimeProps>
}

/** Panel with Operator Type Execution Time plot */
function OpTypeExecutionTimePanel({ tilingComponent }: OpTypeExecutionTimeProps) {
    const [activeGroupNameSt, setActiveGroupNameSt] = useState(tilingComponent.targetGroupName);

    const newData = tilingComponent?.dataProvider?.(activeGroupNameSt);
    const displayData = newData?.plotData ?? [];

    const handleGroupChange = (name: string) => {
        setActiveGroupNameSt(name);
        tilingComponent.setTargetGroup(name);
    };

    const isValid = (name: string) => {
        const component = getTilingComponent("OP Type Execution Time");
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
                plotData={displayData}
                orient='horizontal'
                order='ascending' />
        </PanelTemplate>
    );
};

export default tilingComponent(OpTypeExecutionTimePanel, "OP Type Execution Time", {
    dataProvider: (groupName: string) => getOpTypeExecutionData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

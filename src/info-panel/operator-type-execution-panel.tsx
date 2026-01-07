/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with panel containing operator type execution time plot.
 */

import PanelTemplate from './common';
import tilingComponent, { CSS_ENABLING_OVERFLOW, TilingComponent } from '@/utils/tiling-component';
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
    const renderPlot = (activeGroup: string) => {
        const data = tilingComponent.dataProvider?.(activeGroup);
        const displayData = data?.plotData ?? [];

        return (
            <OpExecutionTimePlot
                key={activeGroup}
                plotData={displayData}
                orient='horizontal'
                order='ascending'
            />
        );
    };
    return (
        <PanelTemplate
            tilingComponent={tilingComponent}
            allowGroupSelection={true}
        >
            {renderPlot}
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

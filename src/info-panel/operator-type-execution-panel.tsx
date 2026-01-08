/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
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

const alignGroupData = (groups: OpExecutionData[][]): OpExecutionData[][] => {
    const masterOpList = Array.from(new Set(groups.flatMap(g => g.map(d => d.name))));

    return groups.map(group => {
        const groupLookup = new Map(group.map(d => [d.name, d]));

        return masterOpList.map(name => {
            return groupLookup.get(name) ?? {
                name,
                duration: { total: 0, average: 0 },
            };
        });
    });
};

/** Panel with Operator Type Execution Time plot */

function OpTypeExecutionTimePanel({ tilingComponent }: OpTypeExecutionTimeProps) {
    const renderPlot = (activeGroups: string[]) => {
        const rawGroups = activeGroups.map(name =>
            tilingComponent.dataProvider?.(name)?.plotData.flat() ?? [],
        );

        const displayData = alignGroupData(rawGroups);

        return (
            <OpExecutionTimePlot
                key={activeGroups.join(",")}
                plotData={displayData}
                orient='horizontal'
                order='ascending'
                showTypeLabel={true}
            />
        );
    };

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


export default tilingComponent(OpTypeExecutionTimePanel, "OP Type Execution Time", {
    dataProvider: (groupName: string) => getOpTypeExecutionData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 200,
        minWidth: 300,
    },
});

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { memo, useRef } from "preact/compat";

import PanelTemplate from "./common";
import { getCPULoadData } from "@/utils/cpuload";
import { CPULoadPlot } from "@/plots/load-plot";
import tilingComponent, { CSS_ENABLING_OVERFLOW, TilingComponent } from "@/utils/tiling-component";
import { CPULoadEventType } from "@/event-types";
import { useTimestampCallbacks } from "@/utils/time-sync";

export interface CPULoadPanelProps {
    /** The data for CPU load plot */
    fullData: CPULoadEventType[],
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<CPULoadPanelProps>,
}

/**
 * The panel with CPU usage plot,
 * it's created directly from the tiling layout only when metadata changes.
 */
const CPULoadPanel = memo(({tilingComponent}: CPULoadPanelProps) => {
    const plotRef = useRef<CPULoadPlot>(null);


    const renderPlot = (activeGroups: string[]) => {
        const displayData  = activeGroups.map(name => {
            const data = tilingComponent.dataProvider?.(name);
            return data?.fullData ?? [];
        });

        return (
            <CPULoadPlot
                key={activeGroups.join(",")}
                ref={plotRef}
                plotData={displayData}
                {...useTimestampCallbacks(plotRef)}
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
});

export default tilingComponent(CPULoadPanel, "CPU Load", {
    dataProvider: (groupName: string) => getCPULoadData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minWidth: 150,
        minHeight: 150,
    },
})!;

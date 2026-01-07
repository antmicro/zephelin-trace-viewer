/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { memo, useRef } from "preact/compat";
import PanelTemplate from "./common";
import { getDieTempData } from "@/utils/dietemp";
import { DieTempPlot } from "@/plots/temp-plot";
import tilingComponent, { CSS_ENABLING_OVERFLOW, TilingComponent } from "@/utils/tiling-component";
import { TempEventType } from "@/event-types";
import { useTimestampCallbacks } from "@/utils/time-sync";

export interface DieTempPanelProps {
    /** The data for Die temperature plot */
    fullData: TempEventType[][],
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<DieTempPanelProps>,
}

/**
 * The panel with Die temperatures plot,
 * it's created directly from the tiling layout only when metadata changes.
 */
const DieTempPanel = memo(({tilingComponent}: DieTempPanelProps) => {
    const plotRef = useRef<DieTempPlot>(null);

    const renderPlot = (activeGroups: string[]) => {
        const displayData  = activeGroups.flatMap(name => {
            const data = tilingComponent.dataProvider?.(name);
            return data?.fullData ?? [];
        });

        return (
            <DieTempPlot
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
            {...useTimestampCallbacks(plotRef)}
        >
            {renderPlot}
        </PanelTemplate>
    );
});

export default tilingComponent(DieTempPanel, "Die temperature", {
    dataProvider: (groupName: string) => getDieTempData(groupName),
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 150,
        minWidth: 150,
    },
})!;

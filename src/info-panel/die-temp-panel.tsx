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
    /** Name of the selected group */
    selectedGroup?: string,
}

/**
 * The panel with Die temperatures plot,
 * it's created directly from the tiling layout only when metadata changes.
 */
const DieTempPanel = memo(({fullData, tilingComponent, selectedGroup}: DieTempPanelProps) => {
    const plotRef = useRef<DieTempPlot>(null);

    const activeGrupName = selectedGroup ?? tilingComponent.targetGroupName;

    if (!tilingComponent) {
        console.info("Tiling Component is not available");
        return null;
    }
    return (
        <PanelTemplate
            selectedGroupName={activeGrupName}
            onGroupChange={(name) => tilingComponent.setTargetGroup(name)}>
            <DieTempPlot
                key={tilingComponent.targetGroupName}
                ref={plotRef}
                plotData={fullData}
                {...useTimestampCallbacks(plotRef)} />
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

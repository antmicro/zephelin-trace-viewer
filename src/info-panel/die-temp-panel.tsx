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
import tilingComponent, { CSS_ENABLING_OVERFLOW } from "@/utils/tiling-component";
import { TempEventType } from "@/event-types";
import { useTimestampCallbacks } from "@/utils/time-sync";

export interface DieTempPanelProps {
    /** The data for Die temperature plot */
    fullData: TempEventType[][],
}

/**
 * The panel with Die temperatures plot,
 * it's created directly from the tiling layout only when metadata changes.
 */
const DieTempPanel = memo(({fullData}: DieTempPanelProps) => {
    const plotRef = useRef<DieTempPlot>(null);
    return (
        <PanelTemplate>
            <DieTempPlot ref={plotRef} plotData={fullData} {...useTimestampCallbacks(plotRef)} />
        </PanelTemplate>
    );
});

export default tilingComponent(DieTempPanel, "Die temperature", {
    dataProvider: getDieTempData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 150,
        minWidth: 150,
    },
})!;

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { memo } from "preact/compat";

import PanelTemplate from "./common";
import { getCPULoadData } from "@/utils/cpuload";
import { CPULoadPlot } from "@/plots/load-plot";
import tilingComponent, { CSS_ENABLING_OVERFLOW } from "@/utils/tiling-component";
import { CPULoadEventType } from "@/event-types";

export interface CPULoadPanelProps {
    /** The data for CPU load plot */
    fullData: CPULoadEventType[],
}

/**
 * The panel with CPU usage plot,
 * it's created directly from the tiling layout only when metadata changes.
 */
const CPULoadPanel = memo(({fullData}: CPULoadPanelProps) => {
    return (
        <PanelTemplate>
            <CPULoadPlot plotData={[fullData]} />
        </PanelTemplate>
    );
});

export default tilingComponent(CPULoadPanel, "CPU Load", {
    dataProvider: getCPULoadData,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minWidth: 150,
        minHeight: 150,
    },
})!;

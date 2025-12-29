/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { memo, useRef, useState, useEffect } from "preact/compat";

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
const CPULoadPanel = memo(({fullData: initialData, tilingComponent}: CPULoadPanelProps) => {
    const plotRef = useRef<CPULoadPlot>(null);

    const [activeGroupNameSt, setActiveGroupNameSt] = useState(tilingComponent.targetGroupName);
    const [displayDataSt, setDisplayDataSt] = useState(initialData);

    useEffect(() => {
        const newData = tilingComponent.dataProvider?.(activeGroupNameSt);
        if (newData) {
            setDisplayDataSt(newData.fullData ?? []);
        }
    }, [activeGroupNameSt, tilingComponent]);

    const handleGroupChange = (name: string) => {
        setActiveGroupNameSt(name);
        tilingComponent.setTargetGroup(name);
    };

    const isValid = (name: string) => {
        return !!tilingComponent?.dataProvider?.(name);
    };

    if (!tilingComponent) {
        console.info("Tiling Component is not available");
        return null;
    }
    return (
        <PanelTemplate
            selectedGroupName={activeGroupNameSt}
            isValidGroup={isValid}
            onGroupChange={handleGroupChange}
            allowGroupSelection={true}>
            <CPULoadPlot
                key={activeGroupNameSt}
                ref={plotRef}
                plotData={[displayDataSt]}
                {...useTimestampCallbacks(plotRef)} />
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

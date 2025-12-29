/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { memo, useEffect, useRef, useState } from "preact/compat";
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
const DieTempPanel = memo(({fullData: initialData, tilingComponent}: DieTempPanelProps) => {
    const plotRef = useRef<DieTempPlot>(null);

    const [activeGroupNameSt, setActiveGroupNameSt] = useState(tilingComponent.targetGroupName);
    const [displayDataSt, setDisplayDataSt] = useState(initialData);

    useEffect(() => {
        const newData = tilingComponent.dataProvider?.(activeGroupNameSt);
        if (newData) {
            setDisplayDataSt(newData.fullData ?? {});
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
            <DieTempPlot
                key={activeGroupNameSt}
                ref={plotRef}
                plotData={displayDataSt}
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

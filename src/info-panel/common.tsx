/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module implementing common utilities for info panels.
 */

import styles from "@styles/info-panel.module.scss";
import { VNode } from "preact";
import { getGroupNames } from "@speedscope/app-state/utils";
import { useMemo, useState } from "preact/hooks";
import { TilingComponent } from "@/utils/tiling-component";

interface PanelTemplateProps {
    /** Children embedded in the panel */
    children: (activeGroup: string) => VNode<any> | VNode<any>[] | null;
    /** Reference to the Tiling Component */
    tilingComponent: TilingComponent<any> | null,
    /** Optional class name added to content section */
    additionalContentClass?: string,
    /** Toggle the panel header */
    allowGroupSelection?: boolean,
}

/** The basic panel template */
export default function PanelTemplate({
    children,
    tilingComponent,
    additionalContentClass,
    allowGroupSelection = false,
}: PanelTemplateProps) {
    if (!tilingComponent) {
        console.info("Tiling Component is not available");
        return null;
    }

    const [activeGroupSt, setActiveGroupSt] = useState(tilingComponent.targetGroupName);

    const unfilteredGroupNames = getGroupNames();

    const groupNames = useMemo(() => {
        return getGroupNames().filter(name => !!tilingComponent.dataProvider?.(name));
    }, [tilingComponent]);

    const onGroupChange = (name: string) => {
        setActiveGroupSt(name);
        tilingComponent.setTargetGroup(name);
    };

    const getOptions = useMemo(() => {
        return groupNames.map((name) => (
            <option key={name} value={name}>
                {name}
            </option>
        ));
    }, [groupNames]);

    const showHeader = allowGroupSelection && unfilteredGroupNames.length > 1;

    return (
        <div className={styles["panel-element"]}>
            {showHeader && (
                <div className={styles["panel-header"]}>
                    <label htmlFor="group-select">Source:</label>
                    <select
                        id="group-select"
                        value={activeGroupSt}
                        onChange={(e) => onGroupChange((e.target as HTMLSelectElement).value)}
                    >
                        {getOptions}
                    </select>
                </div>
            )}
            <div className={styles["section-content"] + ` ${additionalContentClass ?? ''}`}>
                {children(activeGroupSt)}
            </div>
        </div>
    );
}


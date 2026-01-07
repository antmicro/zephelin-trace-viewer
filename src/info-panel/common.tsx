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
import { CirclePlusIcon, CloseIcon } from "@/icons";

interface PanelTemplateProps {
    /** Children embedded in the panel */
    children: (activeGroups: string[]) => VNode<any> | VNode<any>[] | null;
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<any> | null,
    /** Optional class name added to content section */
    additionalContentClass?: string,
    /** Toggle the panel header */
    allowGroupSelection?: boolean,
    /** Toggle to allow multiple plots */
    allowMultiplePlots?: boolean,

}


/** The basic panel template */
export default function PanelTemplate({
    children,
    tilingComponent,
    additionalContentClass,
    allowGroupSelection = false,
    allowMultiplePlots = false,
}: PanelTemplateProps) {
    if (!tilingComponent) {
        console.info("Tiling Component is not available");
        return null;
    }

    const [activeGroupsSt, setActiveGroupsSt] = useState<string[]>([tilingComponent.targetGroupName]);

    const unfilteredGroupNames = getGroupNames();

    const groupNames = useMemo(() => {
        return getGroupNames().filter(name => !!tilingComponent.dataProvider?.(name));
    }, [tilingComponent]);

    const onGroupChange = (names: string[] | string) => {
        const nameArray = Array.isArray(names) ? names: [names];
        setActiveGroupsSt(nameArray);
        if (nameArray.length > 0) {
            tilingComponent.setTargetGroup(nameArray[0]);
        }
    };

    const getOptions = useMemo(() => {
        return groupNames.map((name) => (
            <option key={name} value={name}>
                {name}
            </option>
        ));
    }, [groupNames]);

    const showHeader = allowGroupSelection && unfilteredGroupNames.length > 1;

    const triggerChange = (updatedGroups: string[]) => {
        onGroupChange(allowMultiplePlots ? updatedGroups : updatedGroups[0]);
    };

    const handleAddDropdown = () => {
        const updated = [...activeGroupsSt, groupNames[0] || ""];
        setActiveGroupsSt(updated);
        triggerChange(updated);
    };

    const handleUpdateGroup = (index: number, newValue: string) => {
        const updated = [...activeGroupsSt];
        updated[index] = newValue;
        setActiveGroupsSt(updated);
        triggerChange(updated);
    };

    const handleRemoveDropdown = (index: number) => {
        const updated = activeGroupsSt.filter((_, i) => i !== index);
        setActiveGroupsSt(updated);
        triggerChange(updated);
    };

    return (
        <div className={styles["panel-element"]}>
            {showHeader && (
                <div className={styles["panel-header"]}>
                    <label>Sources:</label>
                    <div className={styles["selectors-wrapper"]}>
                        {activeGroupsSt.map((group, index) => (
                            <div key={`${group}-${index}`} className={styles["selector-container"]}>
                                <select
                                    className={styles["group-select"]}
                                    value={group}
                                    onChange={(e) => {
                                        const val = (e.target as HTMLSelectElement).value;
                                        handleUpdateGroup(index, val);
                                    }}
                                >
                                    {getOptions}
                                </select>
                                {allowMultiplePlots && activeGroupsSt.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles["remove-button"]}
                                        onClick={() => handleRemoveDropdown(index)}
                                        title="Remove source"
                                    >
                                        <CloseIcon />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {allowMultiplePlots && (
                        <button
                            type="button"
                            className={styles["add-button"]}
                            onClick={handleAddDropdown}
                        >
                            <CirclePlusIcon />
                        </button>
                    )}
                </div>
            )}
            <div className={styles["section-content"] + ` ${additionalContentClass ?? ''}`}>
                {children(activeGroupsSt)}
            </div>
        </div>
    );
}


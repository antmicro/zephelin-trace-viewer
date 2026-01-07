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
import {getCSSColorByIdx } from "@/plots/utils";

interface PanelTemplateProps {
    /** Children embedded in the panel */
    children: (activeGroups: string[] | string) => VNode<any> | VNode<any>[] | null;
    /** Reference to the tilingComponent instance */
    tilingComponent: TilingComponent<any> | null,
    /** Optional class name added to content section */
    additionalContentClass?: string,
    /** Toggle the panel header */
    allowGroupSelection?: boolean,
    /** Toggle to allow multiple plots */
    allowMultiplePlots?: boolean,

}

interface SourceSelectorProps {
    value: string;
    options: string[];
    onUpdate: (val: string) => void;
    onRemove?: () => void;
    color: string;
}

const SourceSelector = ({ value, options, onUpdate, onRemove, color}: SourceSelectorProps) => (
    <div className={styles["selector-container"]}>
        <span
            className={styles["legend-indicator"]}
            style={{ backgroundColor: color}}
        />
        <select
            className={styles["group-select"]}
            value={value}
            onChange={(e) => onUpdate((e.target as HTMLSelectElement).value)}
        >
            {options.map((name) => (
                <option key={name} value={name}>
                    {name}
                </option>
            ))};
        </select>
        {onRemove && (
            <button
                type="button"
                className={styles["remove-button"]}
                onClick={onRemove}
                title="Remove source"
            >
                <CloseIcon />
            </button>
        )}
    </div>
);

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

    const groupsPool = useMemo(() => {
        return unfilteredGroupNames.filter(name => !!tilingComponent.dataProvider?.(name));
    }, [tilingComponent, unfilteredGroupNames]);

    const updateGroups = (newGroups: string[]) => {
        setActiveGroupsSt(newGroups);
        if (newGroups.length > 0) {
            tilingComponent.setTargetGroup(newGroups[0]);
        }
    };

    const handleAddDropdown = () => {
        const nextAvailable = groupsPool.find(name => !activeGroupsSt.includes(name));
        if (nextAvailable) {
            updateGroups([...activeGroupsSt, nextAvailable]);
        }
    };

    const handleUpdateGroup = (index: number, newValue: string) => {
        const updated = [...activeGroupsSt];
        updated[index] = newValue;
        updateGroups(updated);
    };

    const handleRemoveDropdown = (index: number) => {
        updateGroups(activeGroupsSt.filter((_, i) => i !== index));
    };

    const showHeader = allowGroupSelection && unfilteredGroupNames.length > 1;
    const isPoolExhausted = activeGroupsSt.length >= groupsPool.length;
    const canAddMoreSources = allowMultiplePlots && !isPoolExhausted;
    const canRemove = allowMultiplePlots && activeGroupsSt.length > 1;

    return (
        <div className={styles["panel-element"]}>
            {showHeader && (
                <div className={styles["panel-header"]}>
                    <label>Sources:</label>
                    <div className={styles["selectors-wrapper"]}>
                        {activeGroupsSt.map((group, index) => {
                            const filteredOptions = groupsPool.filter(
                                (opt) => opt === group || !activeGroupsSt.includes(opt));
                            return (
                                <SourceSelector
                                    key={`${group}-${index}`}
                                    value={group}
                                    options={filteredOptions}
                                    onUpdate={(val) => handleUpdateGroup(index, val)}
                                    onRemove={canRemove
                                        ? () => handleRemoveDropdown(index)
                                        : undefined
                                    }
                                    color={getCSSColorByIdx(index, activeGroupsSt.length)}
                                />
                            );
                        })}
                    </div>

                    {canAddMoreSources && (
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
                {children(allowMultiplePlots ? activeGroupsSt : activeGroupsSt[0])}
            </div>
        </div>
    );
}


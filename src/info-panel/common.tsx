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

interface PanelTemplateProps {
    /** Children embedded in the panel */
    children: (VNode<any> | null)[] | VNode<any>,
    /** Optional class name added to content section */
    additionalContentClass?: string,
    /** Currently selected group name for this panel */
    selectedGroupName? : string,
    /** Callback when different group is chosen */
    onGroupChange?: (name: string) => void,
}

/** The basic panel template */
export default function PanelTemplate({
    children,
    additionalContentClass,
    selectedGroupName,
    onGroupChange,
}: PanelTemplateProps) {
    const groupNames = getGroupNames();

    return (
        <div className={styles["panel-element"]}>
            <div className={styles["panel-header"]}>
                <label htmlFor="group-select">Source:</label>
                <select
                    id="group-select"
                    value={selectedGroupName}
                    onChange={(e) => {
                        const selectedGroup = (e.target as HTMLSelectElement).value;
                        if (onGroupChange) {onGroupChange(selectedGroup);}
                    }}
                >
                    {groupNames.length > 0 ? (
                        groupNames.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))
                    ) : (
                        <option value="">No Groups Available</option>
                    )}
                </select>
            </div>

            <div className={styles["section-content"] + ` ${additionalContentClass ?? ''}`}>
                {children}
            </div>
        </div>
    );
}


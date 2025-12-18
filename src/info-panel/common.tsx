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

interface PanelTemplateProps {
    /** Children embedded in the panel */
    children: (VNode<any> | null)[] | VNode<any>,
    /** Optional class name added to content section */
    additionalContentClass?: string,
}

/** The basic panel template */
export default function PanelTemplate({children, additionalContentClass}: PanelTemplateProps) {
    return (
        <div className={styles["panel-element"]}>
            <div className={styles["panel-header"]}>
                <label htmlFor="group-select">Source:</label>
                <select id="group-select">
                    <option value="0">Dummy Profile 1</option>
                    <option value="1">Dummy Profile 2</option>
                </select>
            </div>

            <div className={styles["section-content"] + ` ${additionalContentClass ?? ''}`}>
                {children}
            </div>
        </div>
    );
}


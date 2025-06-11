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
            <div className={styles["section-content"] + ` ${additionalContentClass ?? ''}`}>
                {children}
            </div>
        </div>
    );
}


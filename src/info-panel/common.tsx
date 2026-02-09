/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module implementing common utilities for info panels.
 */

import styles from "@styles/info-panel.module.scss";
import { VNode } from "preact";
import { getGroupNames } from "@speedscope/app-state/utils";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import ChevronDownIcon from "@speedscope/views/icons/chevron-down";
import { useTheme } from "@speedscope/views/themes/theme";
import { getStyle } from "@speedscope/views/profile-select";
import { css } from "aphrodite";
import { MouseEvent } from "preact/compat";
import { getCSSColorByIdx } from "@/plots/utils";
import { CirclePlusIcon, CloseIcon } from "@/icons";
import { TilingComponent } from "@/utils/tiling-component";
import { css as joinCss } from "@/utils/css";

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
    /** Toggle to display legend dot */
    toggleDot?: boolean,

}

interface SourceSelectorProps {
    value: string;
    options: string[];
    onUpdate: (val: string) => void;
    onRemove?: () => void;
    color: string;
    toggleDot?: boolean;
}

const SourceSelector = ({ value, options, onUpdate, onRemove, color, toggleDot }: SourceSelectorProps) => {
    const [profileSelectShown, setProfileSelectShown] = useState(false);
    const groupCount = getGroupNames().length;
    const style = getStyle(useTheme())(groupCount);
    const ref = useRef<HTMLDivElement | null>(null);

    const [hoveredOption, setHoveredOption] = useState(0);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent<HTMLElement>) => {
            if (ref.current && !ref.current.contains(event.target as HTMLElement)) {
                setProfileSelectShown(false);
            }
        };

        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, [ref, setProfileSelectShown]);

    // Hover selected node by default
    useEffect(() => {
        if (profileSelectShown) {
            const hovered = options.indexOf(value);
            setHoveredOption(hovered === -1 ? 0 : hovered);
        }
    }, [profileSelectShown]);

    // Calculate the largest size of the dropdown item
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        canvasRef.current ??= document.createElement("canvas");
        const ctx = canvasRef.current.getContext("2d");

        const font = ref.current && (window.getComputedStyle(ref.current)).font;
        if (!font || !ctx) {return;}
        ctx.font = font;

        setWidth(Math.ceil(options.reduce((m, s) => {
            const w = ctx.measureText(String(s)).width;
            return w > m ? w : m;
        }, 0)));
    }, [options, ref]);

    const ProfileGroupRow = (props: { name: string, index: number }) => {
        const selected = props.name === value;
        const hovered = props.index === hoveredOption;
        return (
            <div
                className={joinCss(css(
                    style.profileRow,
                    selected && style.profileRowSelected,
                    hovered && style.profileRowHovered,
                ), styles["profile-row"])}
                onMouseEnter={() => setHoveredOption(props.index)}
                onClick={() => onUpdate(props.name)}
            >
                <span>{props.name}</span>
            </div>
        );
    };

    return (
        <div
            ref={ref} className={styles["selector-container"]}
            onClick={() => setProfileSelectShown(!profileSelectShown)}
        >
            {toggleDot && (
                <span
                    className={styles["legend-indicator"]}
                    style={{ backgroundColor: color}}
                />
            )}
            <div className={styles["group-select"]} style={{ width: width }}>
                {value}
            </div>
            <ChevronDownIcon up={profileSelectShown} />
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
            <div className={styles["profile-dropdown"]} style={{display: profileSelectShown ? 'block' : 'none'}}>
                <div className={joinCss(css(style.profileSelectOuter), styles["profile-select-outer"])}>
                    <div className={joinCss(css(style.profileSelectBox), styles["profile-select-box"])}>
                        <div className={css(style.profileSelectScrolling)}>
                            {options.map((name, i) => <ProfileGroupRow name={name} index={i} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** The basic panel template */
export default function PanelTemplate({
    children,
    tilingComponent,
    additionalContentClass,
    allowGroupSelection = false,
    allowMultiplePlots = false,
    toggleDot = true,
}: PanelTemplateProps) {
    if (!tilingComponent) {
        console.info("Tiling Component is not available");
        return null;
    }


    const [activeGroupsSt, setActiveGroupsSt] = useState<string[]>(() => {
        return tilingComponent.targetGroups;
    });

    const unfilteredGroupNames = getGroupNames();

    const groupsPool = useMemo(() => {
        return unfilteredGroupNames.filter(name => !!tilingComponent.dataProvider?.(name));
    }, [tilingComponent, unfilteredGroupNames]);

    const groupsToColors = Object.fromEntries(
        unfilteredGroupNames.map((name, index) => [name, getCSSColorByIdx(index, activeGroupsSt.length)]),
    );

    const updateGroups = (newGroups: string[]) => {
        setActiveGroupsSt(newGroups);
        tilingComponent.targetGroups = newGroups;
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
                                <div className={styles["selector-wrapper"]}>
                                    <SourceSelector
                                        key={`${group}-${index}`}
                                        value={group}
                                        options={filteredOptions}
                                        onUpdate={(val) => handleUpdateGroup(index, val)}
                                        onRemove={canRemove
                                            ? () => handleRemoveDropdown(index)
                                            : undefined
                                        }
                                        color={groupsToColors[group]}
                                        toggleDot={toggleDot}
                                    />
                                </div>
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


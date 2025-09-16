/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module defining container for buttons displayed on top bar.
 */

import { VNode } from "preact";
import { memo, useRef } from "preact/compat";
import ClickAwayListener from "react-click-away-listener";

import style from "@styles/top-bar.module.scss";
import { cssOptions } from "@/utils/css";


interface ButtonsContainerProps {
    /** The name of the buttons category, displayed at the top */
    name: string | VNode
    /** The buttons displayed in the dropdown section */
    children: (VNode<HTMLButtonElement> | null)[]
    left?: boolean,
    right?: boolean,
    onClickAwayCallback?: () => void,
}

/** The container for button that displays their category and on hover opens dropdown list with buttons */
export const ButtonsContainer = memo(({name, left, right, children, onClickAwayCallback}: ButtonsContainerProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const hideDropdown = () => {
        if (!ref.current?.classList.contains(style.clicked)) { return; }
        ref.current?.classList.remove(style.clicked);
        if (onClickAwayCallback) { onClickAwayCallback(); }
    };

    const onClickButton = (e: MouseEvent) => {
        if (ref.current?.classList.contains(style.clicked)) { return; }
        ref.current?.classList.add(style.clicked);
        e.stopImmediatePropagation();
    };
    const onClickContainer = (e: MouseEvent) => {
        if (!ref.current?.classList.contains(style.clicked)) { return; }
        hideDropdown();
        e.stopPropagation();
    };

    return (
        <ClickAwayListener onClickAway={hideDropdown}>
            <div ref={ref} className={style.category} onClick={onClickContainer}>
                <button onClick={onClickButton}>{name}</button>
                <div ref={dropdownRef} className={cssOptions({
                    [style.dropdown]: true,
                    [style.left]: left ?? false,
                    [style.right]: right ?? false,
                })}>
                    {children}
                </div>
            </div>
        </ClickAwayListener>
    );
});


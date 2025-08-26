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
import { memo, useEffect, useRef } from "preact/compat";
import ClickAwayListener from "react-click-away-listener";

import style from "@styles/app.module.scss";


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
        ref.current?.classList.remove(style.clicked);
        if (onClickAwayCallback) { onClickAwayCallback(); }
    };

    useEffect(() => {
        for (const ch of dropdownRef.current?.childNodes ?? []) {
            if (!(ch instanceof HTMLButtonElement)) {continue;}
            ch.addEventListener('click', hideDropdown);
        }
    });
    const dropdownClassNames = [style.dropdown];
    if (left) {
        dropdownClassNames.push(style.left);
    }
    if (right) {
        dropdownClassNames.push(style.right);
    }
    return (
        <ClickAwayListener onClickAway={hideDropdown}>
            <div ref={ref} className={style.category}>
                <button
                    onClick={() => ref.current?.classList.add(style.clicked)}
                >{name}</button>
                <div ref={dropdownRef} className={dropdownClassNames.join(" ")}>
                    {children}
                </div>
            </div>
        </ClickAwayListener>
    );
});


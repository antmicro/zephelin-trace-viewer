/**
 * The module defining container for buttons displayed on top bar.
 */

import { VNode } from "preact";
import { memo, useEffect, useRef } from "preact/compat";
import ClickAwayListener from "react-click-away-listener";

import style from "@styles/app.module.scss";


interface ButtonsContainerProps {
    /** The name of the buttons category, displayed at the top */
    name: string
    /** The buttons displayed in the dropdown section */
    children: (VNode<HTMLButtonElement> | null)[]
}

/** The container for button that displays their category and on hover opens dropdown list with buttons */
export const ButtonsContainer = memo(({name, children}: ButtonsContainerProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const hideDropdown = () => ref.current?.classList.remove(style.clicked);

    useEffect(() => {
        for (const ch of dropdownRef.current?.childNodes ?? []) {
            if (!(ch instanceof HTMLButtonElement)) {continue;}
            ch.addEventListener('click', hideDropdown);
        }
    });
    return (
        <ClickAwayListener onClickAway={hideDropdown}>
            <div ref={ref} className={style.category}>
                <button
                    onClick={() => ref.current?.classList.add(style.clicked)}
                >{name}</button>
                {/* Fills gap between category and dropdown, to make sure the hover is not interrupted */}
                <div className={style['gap-filler']} />
                <div ref={dropdownRef} className={style.dropdown}>
                    {children}
                </div>
            </div>
        </ClickAwayListener>
    );
});


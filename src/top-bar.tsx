/**
 * The module defining top bar of the application.
 */

import { JSX, VNode } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { memo } from "preact/compat";

import style from '@styles/app.module.scss';
import { useAtom } from "@speedscope/lib/atom";
import { appRefAtom, profileGroupAtom } from "@speedscope/app-state";
import ClickAwayListener from "react-click-away-listener";

import ImportIcon from "./icons/import";
import ExportIcon from "./icons/export";


interface ButtonsContainerProps {
    /** The name of the buttons category, displayed at the top */
    name: string
    /** The buttons displayed in the dropdown section */
    children: (VNode<HTMLButtonElement> | null)[]
}

/** The container for button that displays their category and on hover opens dropdown list with buttons */
const ButtonsContainer = memo(({name, children}: ButtonsContainerProps) => {
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

/** The top bar of the application */
export default  memo((): JSX.Element => {
    const appRefSt = useAtom(appRefAtom);
    const [traceLoadedSt, setTraceLoadedSt] = useState<boolean>(false);

    profileGroupAtom.subscribe(() => {
        setTraceLoadedSt((profileGroupAtom.get()?.profiles.length ?? 0) > 0);
    });

    const buttons = (
        <div className={style['category-container']}>
            <ButtonsContainer name="File">
                <button onClick={appRefSt?.current?.browseForFile}>
                    <ImportIcon /><p>Import trace</p>
                </button>
                {traceLoadedSt ? <button onClick={appRefSt?.current?.saveFile}>
                    <ExportIcon /><p>Export trace</p>
                </button> : null}
            </ButtonsContainer>
        </div>
    );

    return (
        <div id={style['top-bar']}>
            <h1>Zephelin Trace Viewer</h1>
            {appRefSt?.current && buttons}
        </div>
    );
});

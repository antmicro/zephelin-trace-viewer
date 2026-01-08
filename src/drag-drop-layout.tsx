/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module implementing drag&drop feature that loads traces into Speedscope.
 */

import { useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { VNode } from 'preact';
import { useTheme } from '@speedscope/views/themes/theme';

import style from '@styles/app.module.scss';
import { useSpeedscopeLoader } from './speedscope';


interface DragDropLayoutProps {
    /** Whether pointer events should be enabled */
    enabled?: boolean,
    /** ID of drag&drop section */
    id?: string,
    /** The callback triggered at the beginning of drop */
    onDropStart?: () => void,
    /** The callback triggered at the end of drop */
    onDropEnd?: () => void,
    /** The callback triggered at error */
    onDropAbort?: () => void,
    /** The children rendered inside the layout */
    children: VNode,
}

/**
 * The wrapper for tiling layout, implementing drag&drop feature,
 * as well as managing pointer-events values.
 */
export default memo(({enabled=true, id, onDropStart, onDropEnd, onDropAbort, children}: DragDropLayoutProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const borderRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();
    let timeouts: NodeJS.Timeout[] = [];

    const loader = useSpeedscopeLoader();

    // Functions toggling drag&drop effects
    const setDrag = () => {
        if (timeouts.length > 0) {
            timeouts.forEach(t => clearTimeout(t));
            timeouts = [];
        }
        ref.current && (ref.current.classList.add(style['on-drag'], style['block-pointer-events']));
        if (borderRef.current) {
            borderRef.current.classList.add(style['on-drag']);
            borderRef.current.style.borderColor = theme.selectionPrimaryColor;
        }
    };
    const unsetDrag = () => {
        ref.current && (ref.current.classList.remove(style['on-drag'], style['block-pointer-events']));
        borderRef.current && (borderRef.current.classList.remove(style['on-drag']));
    };

    // Functions triggering drag&drop border and loading on drop
    const dragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer?.dropEffect !== "copy" && e.dataTransfer?.effectAllowed !== 'copy') {
            // Do not show boarder when drag is not a file
            return;
        }
        setDrag();
    };
    const dragLeave = (e: DragEvent) => {
        /*
         * Unset drag&drop effect after in timeout (which can be cancelled by dragover event)
         * preventing from twitch in some browsers
         */
        timeouts.push(setTimeout(unsetDrag, 150));
        e.preventDefault();
        e.stopImmediatePropagation();
    };
    const drop = (e: DragEvent) => {
        if (onDropStart) {onDropStart();}
        unsetDrag();
        e.preventDefault();
        e.stopPropagation();

        return loader.loadDropFile(e)
            .then(onDropEnd)
            .catch((err) => {console.error("Trace load failed:", err); onDropAbort?.();});
    };

    return (
        <div
            id={id}
            className={style['layout-container']} ref={ref}
            style={enabled ? {} : {pointerEvents: "none"}}
            onDragOver={dragOver}
            onDrop={(e) => {drop(e).catch(er => console.error(er));}}
            onDragLeave={dragLeave}
        >
            {children}
            <div
                ref={borderRef}
                style={{pointerEvents: 'none', zIndex: 11}}
            />
        </div>
    );
});

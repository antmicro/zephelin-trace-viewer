/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with tiling panel wrapper that sets proper background color with z-index -2.
 */


import { memo, useContext } from "preact/compat";
import { createContext, VNode } from "preact";
import style from "@styles/app.module.scss";
import { focusedPanelAtom } from "@speedscope/app-state";
import { useAtom } from "@speedscope/lib/atom";
import { TabNode } from "flexlayout-react";

export const GlobalShortcutContext = createContext<(ev: KeyboardEvent) => boolean>(() => false);
export const FocusContext = createContext<(ev?: KeyboardEvent) => boolean>(() => false);

interface TilingPanelProps {
    node: TabNode
    children: VNode,
}

export default memo(({node, children}: TilingPanelProps) => {
    const focusedPanel = useAtom(focusedPanelAtom);
    const nodeId = node.getId();

    const globalShortcutHandler = useContext(GlobalShortcutContext);

    const isFocused = (ev?: KeyboardEvent) => {

        // Focused component catches the event and passes it to globalShortcutHandler
        if (ev) { globalShortcutHandler(ev);}

        return focusedPanelAtom.get() === nodeId;
    };

    return (
        <div className={style["tiling-panel"]} data-focused={focusedPanel === nodeId}>
            {/* Use non-reactive focused panel value to avoid invalid states*/}
            <FocusContext.Provider value={isFocused} children={children} />
            <div className={style.background} />
        </div>
    );
});


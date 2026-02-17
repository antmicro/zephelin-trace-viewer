/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with tiling panel wrapper that sets proper background color with z-index -2.
 */


import { memo } from "preact/compat";
import { createContext, VNode } from "preact";
import style from "@styles/app.module.scss";
import { focusedPanelAtom } from "@speedscope/app-state";
import { useAtom } from "@speedscope/lib/atom";
import { Action, Actions, TabNode } from "flexlayout-react";
import { getTilingComponent, TilingComponent } from "./tiling-component";

export const FocusContext = createContext<(ev?: KeyboardEvent) => boolean>(() => false);

interface TilingPanelProps {
    node: TabNode
    doAction: (action: Action) => void
    children: VNode,
}
const isAutoFocusable = (component: TilingComponent<any>, ev: KeyboardEvent) => {
    // TODO (@achmutov) We should accept case in which multiple instances are registered, but only one is shown
    if (component.instances.get() !== 1) {return false;}

    return !!component.keyboardShortcuts?.some((shortcut) => {
        const ctrlMatch =
            shortcut.ctrl === undefined ||
            shortcut.ctrl === ev.ctrlKey ||
            shortcut.ctrl === ev.metaKey;
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === ev.shiftKey;
        return ctrlMatch && shiftMatch && shortcut.key === ev.key;
    });
};

// TODO (@achmutov): FocusContext along with its infra should be moved upper in the DOM, and only pass focusedPanel string in this component
export default memo(({node, children, doAction}: TilingPanelProps) => {
    const focusedPanel = useAtom(focusedPanelAtom);
    const nodeId = node.getId();

    const autoFocus = (ev: KeyboardEvent) => {
        const nodeComponent = node.getComponent();
        if (!nodeComponent) {return false;}

        const currentComponent = getTilingComponent(nodeComponent);
        if (!currentComponent || !isAutoFocusable(currentComponent, ev)) {return false;}

        const tabsetNode = node.getParent();
        if (!tabsetNode) {return false;}

        // "Focus"
        doAction(Actions.setActiveTabset(tabsetNode.getId()));

        // Select tab if it was hidden
        doAction(Actions.selectTab(node.getId()));

        return true;
    };

    const isFocused = (ev?: KeyboardEvent) => {
        let result = false;

        // If event is set, try to autofocus
        if (ev) {result = autoFocus(ev);}

        return result || focusedPanelAtom.get() === nodeId;
    };

    return (
        <div className={style["tiling-panel"]} data-focused={focusedPanel === nodeId}>
            {/* Use non-reactive focused panel value to avoid invalid states*/}
            <FocusContext.Provider value={isFocused} children={children} />
            <div className={style.background} />
        </div>
    );
});


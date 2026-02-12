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
import { VNode } from "preact";
import style from "@styles/app.module.scss";
import { focusedPanelAtom } from "@speedscope/app-state";
import { useAtom } from "@speedscope/lib/atom";
import { TabNode } from "flexlayout-react";


export default memo(({node, children}: {node: TabNode, children: VNode}) => {
    const focusedPanel = useAtom(focusedPanelAtom);

    return (
        <div className={style["tiling-panel"]} data-focused={focusedPanel === node.getId()}>
            {children}
            <div className={style.background} />
        </div>
    );
});


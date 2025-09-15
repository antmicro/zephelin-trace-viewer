/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module defining custom button used to spawn new tiling panels.
 */

import { memo } from "preact/compat";
import { useAtom } from "@speedscope/lib/atom";
import CheckIcon from "@speedscope/views/icons/check";

import style from "@styles/top-bar.module.scss";
import { TilingComponent } from "@/utils/tiling-component";
import { TilingLayoutProps } from "@/tiling-layout";
import { cssOptions } from "@/utils/css";


/** Stores information about currently dragged button (represented by panel title) */
let DRAGGED_BUTTON: string | undefined = undefined;

/** Returns currently dragged button */
export function getDraggedButtonTitle() {
    return DRAGGED_BUTTON;
}

interface TilingComponentButtonProps extends Pick<TilingLayoutProps, "tilingRef"> {
    /** The component definition */
    component: TilingComponent<any>,
}

/** The button representing tiling component, displayed only when it is available and disabled if max instance count is reached */
export const TilingComponentButton = memo(({component, tilingRef}: TilingComponentButtonProps) => {
    const availableSt = useAtom(component.available);
    const instancesSt = useAtom(component.instances);

    const onClick = (_e: Event) => {
        if (!tilingRef?.current) {
            console.warn(`New panel (${component.title}) cannot be added, due to missing reference`);
            return;
        }
        tilingRef.current.addNode(component);
    };
    const checkSize = "12px";
    const maxInstanceCountReached = instancesSt >= component.maxInstances;
    return (
        <div
            onDragStart={() => DRAGGED_BUTTON = component.title}
            onDragEnd={() => DRAGGED_BUTTON = undefined}
            draggable={!maxInstanceCountReached}
            className={cssOptions({[style["panel-button"]]: true, [style.disabled]: maxInstanceCountReached})}
            style={availableSt ? {} : {display: "none"}}
            onClick={!maxInstanceCountReached ? onClick : undefined}
        >
            <div>{component.title}</div>
            {maxInstanceCountReached ?
                <CheckIcon color="var(--colors-gray-6)" size={checkSize} /> :
                <div style={{width: checkSize, height: checkSize}} />}
        </div>
    );
});


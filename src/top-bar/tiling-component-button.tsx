/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module defining custom button used to spawn new tiling panels.
 */

import { memo, useEffect, useRef } from "preact/compat";
import { useAtom } from "@speedscope/lib/atom";
import CheckIcon from "@speedscope/views/icons/check";

import style from "@styles/top-bar.module.scss";
import { Dispatch, StateUpdater } from "preact/hooks";
import { TilingComponent } from "@/utils/tiling-component";
import { TilingLayoutProps } from "@/tiling-layout";
import { cssOptions } from "@/utils/css";


/** Stores information about currently dragged button (represented by panel title) */
let DRAGGED_BUTTON: string | undefined = undefined;
let CLICKED_POINT: [number, number] | undefined = undefined;

/** Returns currently dragged button */
export function getDraggedButtonTitle() {
    return DRAGGED_BUTTON;
}

/** The tooltip that follows the pointer with copy of dragged element */
export function DragTooltip({draggedElement}: {draggedElement: HTMLDivElement}) {
    const ref = useRef<HTMLDivElement | null>(null);
    // Has to be calculated immediately, otherwise element will not be visible, and width will be 0
    const originalBoundingRect = draggedElement.getBoundingClientRect();

    if (!CLICKED_POINT) {
        console.warn("Missing clicked point, tooltip will not be displayed");
        return null;
    }
    const offsetX = CLICKED_POINT[0] - originalBoundingRect.left;
    const offsetY = CLICKED_POINT[1] - originalBoundingRect.top;


    const setElementPos = (x: number, y: number) => {
        if (!ref.current) {return;}
        ref.current.style.left = `${x - offsetX}px`;
        ref.current.style.top = `${y - offsetY}px`;
    };
    const onMouseMove = (e: MouseEvent) => {
        setElementPos(e.clientX, e.clientY);
    };

    useEffect(() => {
        const newNode = draggedElement.cloneNode(true) as HTMLDivElement;
        newNode.style.width = `${originalBoundingRect.width}px`;
        newNode.style.height = `${originalBoundingRect.height}px`;
        ref.current?.appendChild(newNode);
        if (CLICKED_POINT) {
            setElementPos(...CLICKED_POINT);
        }

        window.addEventListener("mousemove", onMouseMove);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            ref.current?.removeChild(newNode);
        };
    });
    return (
        <div ref={ref} className={style["drag-tooltip"]} />
    );
}

function createDragEvent(name: "dragenter" | "dragover" | "dragleave" | "drop", originalEvent?: MouseEvent) {
    return new DragEvent(name, originalEvent ? {clientX: originalEvent.clientX, clientY: originalEvent.clientY} : {});
}



interface TilingComponentButtonProps extends Pick<TilingLayoutProps, "tilingRef"> {
    /** The component definition */
    component: TilingComponent<any>,
    /** The state updater indicating that element is dragged */
    setCustomDraggingSt: Dispatch<StateUpdater<HTMLDivElement | null>>,
}

/** The button representing tiling component, displayed only when it is available and disabled if max instance count is reached */
export const TilingComponentButton = memo(({component, tilingRef, setCustomDraggingSt}: TilingComponentButtonProps) => {
    const availableSt = useAtom(component.available);
    const instancesSt = useAtom(component.instances);
    const ref = useRef<HTMLDivElement | null>(null);

    const layoutRef = () => tilingRef.current?.getRef().current?.base as HTMLDivElement | undefined;
    const cleanupListeners = () => {
        const lRef = layoutRef();
        if (lRef) {
            lRef.removeEventListener("mouseenter", onMouseEnter);
            lRef.removeEventListener("mousemove", onMouseMove);
            lRef.removeEventListener("mouseleave", onMouseLeave);
        }
        window.removeEventListener("click", onMouseClick);
        window.removeEventListener("keydown", onKeyPressed);
        DRAGGED_BUTTON = undefined;
        setCustomDraggingSt(null);
    };

    const onMouseMove = (e: MouseEvent) => {
        layoutRef()?.dispatchEvent(createDragEvent("dragover", e));
    };
    const onMouseEnter = (e : MouseEvent) => {
        layoutRef()?.dispatchEvent(createDragEvent("dragenter", e));
    };
    const onMouseLeave = (e : MouseEvent) => {
        layoutRef()?.dispatchEvent(createDragEvent("dragleave", e));
    };
    const onMouseClick = (e : MouseEvent) => {
        const lRef = layoutRef();
        cleanupListeners();
        const boundingRect = lRef?.getBoundingClientRect();
        if (  // Check if click is not outside of tiling layout
            lRef && boundingRect
            && boundingRect.left <= e.clientX && e.clientX <= boundingRect.right
            && boundingRect.top <= e.clientY && e.clientY <= boundingRect.bottom
        ) {
            lRef.dispatchEvent(createDragEvent("drop", e));
        }
    };
    const onKeyPressed = (e: KeyboardEvent) => {
        switch (e.key) {
        case "Escape":
            cleanupListeners();
            layoutRef()?.dispatchEvent(createDragEvent("dragleave"));
            break;
        }
    };

    const onClick = (e: MouseEvent) => {
        if (ref.current === null) {
            return;
        }

        const lRef = layoutRef();
        // Stop dragging
        if (DRAGGED_BUTTON === component.title) {
            window.removeEventListener("mousemove", onMouseMove);
            cleanupListeners();
            ref.current.dispatchEvent(createDragEvent("dragleave"));
        }
        // Initialize drag
        if (DRAGGED_BUTTON === undefined) {
            if (lRef) {
                lRef.addEventListener("mouseenter", onMouseEnter);
                lRef.addEventListener("mousemove", onMouseMove);
                lRef.addEventListener("mouseleave", onMouseLeave);
            }
            window.addEventListener("click", onMouseClick);
            window.addEventListener("keydown", onKeyPressed);

            ref.current.dispatchEvent(createDragEvent("dragenter", e));
            DRAGGED_BUTTON = component.title;

            // Initialize tooltip
            if (ref.current instanceof HTMLDivElement) {
                CLICKED_POINT = [e.clientX, e.clientY];
                setCustomDraggingSt(ref.current);
            } else {
                console.warn("Cannot find reference to the clicked element, tooltip will not be created");
            }
        }
        e.preventDefault();
    };
    const checkSize = "12px";
    const maxInstanceCountReached = instancesSt >= component.maxInstances;
    return (
        <div
            ref={ref}
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


/**
 * The module implementing drag&drop feature that loads traces into Speedscope.
 */

import { useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useTheme } from '@speedscope/views/themes/theme';
import { appRefAtom } from '@speedscope/app-state';

import style from '@styles/app.module.scss';
import TilingLayout, { TilingLayoutProps } from './tiling-layout';


/**
 * The wrapper for tiling layout, implemening drag&drop feature,
 * as well as managing pointer-events values.
 */
export default memo(({tilingRef}: Pick<TilingLayoutProps, "tilingRef">) => {
    const ref = useRef<HTMLDivElement>(null);
    const borderRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();
    let timeouts: NodeJS.Timeout[] = [];

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
        unsetDrag();
        e.preventDefault();
        e.stopPropagation();
        const appRef = appRefAtom.get();
        if (!appRef?.current) {
            console.warn("Speedscope reference is not available - trace cannot be loaded");
            return;
        }
        appRef.current.loadDropFile(e);
    };

    return (
        <div
            id={style['layout-container']} ref={ref}
            onDragOver={dragOver}
            onDrop={drop}
            onDragLeave={dragLeave}
        >
            <TilingLayout tilingRef={tilingRef} />
            <div
                ref={borderRef}
                style={{pointerEvents: 'none', zIndex: 11}}
            />
        </div>
    );
}, (_prev, _new) => true);

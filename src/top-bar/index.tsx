/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module defining top bar of the application.
 */

import { JSX } from "preact";
import { useState } from "preact/hooks";
import { memo } from "preact/compat";

import { useAtom } from "@speedscope/lib/atom";
import { appRefAtom, errorAtom, profileGroupAtom } from "@speedscope/app-state";

import style from '@styles/top-bar.module.scss';
import ChevronDownIcon from "@speedscope/views/icons/chevron-down";
import { DragTooltip, TilingComponentButton } from "./tiling-component-button";
import { ButtonsContainer } from "./buttons-container";
import { getAllComponents } from "@/utils/tiling-component";
import { TilingLayoutProps } from "@/tiling-layout";
import CirclePlusIcon from "@/icons/circle-plus";
import LogoIcon from "@/icons/logo";
import { DocsIcon, GitIcon, ImportIcon, ExportIcon } from "@/icons";


interface TopBarProps extends Pick<TilingLayoutProps, "tilingRef"> {
    /** Whether title should be displayed */
    displayTitle?: boolean,
}


/** The top bar of the application */
export default memo(({tilingRef, displayTitle=true}: TopBarProps): JSX.Element => {
    const appRefSt = useAtom(appRefAtom);
    const [customDraggingSt, setCustomDraggingSt] = useState<HTMLDivElement | null>(null);
    const [traceLoadedSt, setTraceLoadedSt] = useState<boolean>(false);
    const isErrorSt = useAtom<boolean>(errorAtom);

    profileGroupAtom.subscribe(() => {
        setTraceLoadedSt((profileGroupAtom.get()?.profiles.length ?? 0) > 0);
    });

    const [titleActiveSt, setTitleActiveSt] = useState<boolean>(false);
    const titleDiv = (
        <div className={style["left-button"]} onClick={() => setTitleActiveSt(true)}>
            <div><LogoIcon /></div>
            <div><ChevronDownIcon up={titleActiveSt} /></div>
        </div>
    );
    const panelsDiv = (
        <div id={style.panels}><CirclePlusIcon /> <h2>Panels</h2></div>
    );

    return (
        <div id={style["top-bar"]}>
            <div id={style["left-buttons"]}>
                <ButtonsContainer name={titleDiv} onClickAwayCallback={() => setTitleActiveSt(false)}>
                    <button onClick={() => appRefSt?.current?.browseForFile()}>
                        <ImportIcon /><p>Import trace</p>
                    </button>
                    {traceLoadedSt && !isErrorSt ? <button onClick={appRefSt?.current?.saveFile}>
                        <ExportIcon /><p>Export trace</p>
                    </button> : null}
                    <hr />
                    <a href="https://github.com/antmicro/zephelin-trace-viewer">
                        <GitIcon /><p>Repository</p>
                    </a>
                    <a href="https://antmicro.github.io/zephelin/">
                        <DocsIcon /><p>Documentation</p>
                    </a>
                </ButtonsContainer>
            </div>
            <div id={style["top-title"]} hidden={!displayTitle}>
                Zephelin Trace Viewer
            </div>
            <div id={style["right-buttons"]}>
                {(appRefSt?.current && traceLoadedSt) ? <ButtonsContainer name={panelsDiv} right={true}>
                    {getAllComponents().map(v => <TilingComponentButton component={v} tilingRef={tilingRef} setCustomDraggingSt={setCustomDraggingSt} />)}
                </ButtonsContainer> : null }
                {customDraggingSt ? <DragTooltip draggedElement={customDraggingSt} /> : null}
            </div>
        </div>
    );
});

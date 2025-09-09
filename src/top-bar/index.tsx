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
import { appRefAtom, profileGroupAtom } from "@speedscope/app-state";

import style from '@styles/top-bar.module.scss';
import ChevronDownIcon from "@speedscope/views/icons/chevron-down";
import iconstyle from "@styles/icons.module.scss";
import { TilingComponentButton } from "./tiling-component-button";
import { ButtonsContainer } from "./buttons-container";
import ImportIcon from "@/icons/import";
import ExportIcon from "@/icons/export";
import { getAllComponents } from "@/utils/tiling-component";
import { TilingLayoutProps } from "@/tiling-layout";
import CirclePlusIcon from "@/icons/circle-plus";
import LogoIcon from "@/icons/logo";


/** The top bar of the application */
export default memo(({tilingRef}: Pick<TilingLayoutProps, "tilingRef">): JSX.Element => {
    const appRefSt = useAtom(appRefAtom);
    // const components = useAtom(availableComponentsAtom);
    const [traceLoadedSt, setTraceLoadedSt] = useState<boolean>(false);

    profileGroupAtom.subscribe(() => {
        setTraceLoadedSt((profileGroupAtom.get()?.profiles.length ?? 0) > 0);
    });

    const [titleActiveSt, setTitleActiveSt] = useState<boolean>(false);
    const titleDiv = (
        <div id={style['title-button']} class={iconstyle.icon} onClick={() => setTitleActiveSt(true)}>
            <div id={style.title}><LogoIcon /></div>
            <div><ChevronDownIcon up={titleActiveSt} /></div>
        </div>
    );
    const panelsDiv = (
        <div id={style.panels}><CirclePlusIcon /> <h2>Panels</h2></div>
    );

    return (
        <div id={style['top-bar']}>
            <div>
                <ButtonsContainer name={titleDiv} left={true} onClickAwayCallback={() => setTitleActiveSt(false)}>
                    <button onClick={appRefSt?.current?.browseForFile}>
                        <ImportIcon /><p>Import trace</p>
                    </button>
                    {traceLoadedSt ? <button onClick={appRefSt?.current?.saveFile}>
                        <ExportIcon /><p>Export trace</p>
                    </button> : null}
                </ButtonsContainer>
            </div>
            <div>
                {(appRefSt?.current && traceLoadedSt) ? <ButtonsContainer name={panelsDiv} right={true}>
                    {getAllComponents().map(v => <TilingComponentButton component={v} tilingRef={tilingRef} />)}
                </ButtonsContainer> : null }
            </div>
        </div>
    );
});

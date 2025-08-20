/**
 * The module defining top bar of the application.
 */

import { JSX } from "preact";
import { useState } from "preact/hooks";
import { memo } from "preact/compat";

import { useAtom } from "@speedscope/lib/atom";
import { appRefAtom, profileGroupAtom } from "@speedscope/app-state";

import style from '@styles/app.module.scss';
import { TilingComponentButton } from "./tiling-component-button";
import { ButtonsContainer } from "./buttons-container";
import ImportIcon from "@/icons/import";
import ExportIcon from "@/icons/export";
import { getAllComponents } from "@/utils/tiling-component";
import { TilingLayoutProps } from "@/tiling-layout";


/** The top bar of the application */
export default memo(({tilingRef}: Pick<TilingLayoutProps, "tilingRef">): JSX.Element => {
    const appRefSt = useAtom(appRefAtom);
    // const components = useAtom(availableComponentsAtom);
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
            {traceLoadedSt ? <ButtonsContainer name="Panels">
                {getAllComponents().map(v => <TilingComponentButton component={v} tilingRef={tilingRef} />)}
            </ButtonsContainer> : null }
        </div>
    );

    return (
        <div id={style['top-bar']}>
            <h1>Zephelin Trace Viewer</h1>
            {appRefSt?.current && buttons}
        </div>
    );
});

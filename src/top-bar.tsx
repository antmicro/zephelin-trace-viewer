/**
 * The module defining top bar of the application.
 */

import { JSX } from "preact";
import { useTheme } from "@speedscope/views/themes/theme";

import style from '@styles/app.module.scss';
import { useAtom } from "@speedscope/lib/atom";
import { appRefAtom, profileGroupAtom } from "@speedscope/app-state";
import { ButtonHTMLAttributes } from "preact/compat";


/** The Speedscope like button template */
function Button(props: Omit<ButtonHTMLAttributes, "style" | "onMouseEnter" | "onMouseLeave">) {
    const theme = useTheme();

    const buttonStyle: JSX.CSSProperties = {
        backgroundColor: theme.selectionPrimaryColor,
    };
    return (
        <button
            style={buttonStyle}
            onMouseEnter={(e) => e.target instanceof HTMLButtonElement && (e.target.style.backgroundColor = theme.selectionSecondaryColor)}
            onMouseLeave={(e) => e.target instanceof HTMLButtonElement && (e.target.style.backgroundColor = theme.selectionPrimaryColor)}
            {...props}
        >{props.children}</button>
    );
}

/** The top bar of the application */
export default function TopBar(): JSX.Element {
    const appRefSt = useAtom(appRefAtom);
    const profileGroup = useAtom(profileGroupAtom);

    const buttons = (
        <div className={style['button-container']}>
            <Button
                onClick={appRefSt?.current?.browseForFile}
            >IMPORT</Button>
            {profileGroup && <Button onClick={appRefSt?.current?.saveFile}>EXPORT</Button>}
        </div>
    );

    return (
        <div id={style['top-bar']}>
            <h1>Zephelin Trace Viewer</h1>
            {appRefSt?.current && buttons}
        </div>
    );
}

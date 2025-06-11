/**
 * The module defining top bar of the application.
 */

import { JSX } from "preact";

import style from '@styles/app.module.scss';

/** The top bar of the application */
export default function TopBar(): JSX.Element {
    return (
        <div id={style['top-bar']}>
            <h1>Zephelin Trace Viewer</h1>
        </div>
    );
}

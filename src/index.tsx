/**
 * The entry point of the application, defining main layout and triggering rendering.
 */

import { render } from 'preact';

import '@styles/flexlayout.scss';
import style from '@styles/app.module.scss';
import TopBar from "./top-bar";
import TilingLayout from './tiling-layout';


/**
 * The entrypoint of the application, defining top bar,
 * Speedscope and the panel with additional information.
 */
export function App() {
    return (
        <div id={style.app}>
            <TopBar />
            <TilingLayout />
        </div>
    );
}

render(<App />, document.getElementById('mountpoint')!);

/**
 * The entry point of the application, defining main layout and triggering rendering.
 */

import { render } from 'preact';

import '@styles/flexlayout.scss';
import style from '@styles/app.module.scss';
import { useRef } from 'preact/hooks';
import TopBar from "./top-bar";
import DragDropLayout from './drag-drop-layout';


/**
 * The entrypoint of the application, defining top bar,
 * Speedscope and the panel with additional information.
 */
export function App() {
    const tilingRef = useRef(null);

    return (
        <div id={style.app}>
            <TopBar tilingRef={tilingRef} />
            <DragDropLayout tilingRef={tilingRef} />
        </div>
    );
}

render(<App />, document.getElementById('mountpoint')!);

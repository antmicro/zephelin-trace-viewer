/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The entry point of the application, defining main layout and triggering rendering.
 */

import { render } from 'preact';

import style from '@styles/app.module.scss';
import '@styles/flexlayout.scss';
import { useRef } from 'preact/hooks';
import { ThemeProvider } from '@speedscope/views/themes/theme';
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
            <ThemeProvider>
                <TopBar tilingRef={tilingRef} />
                <DragDropLayout tilingRef={tilingRef} />
            </ThemeProvider>
        </div>
    );
}

render(<App />, document.getElementById('mountpoint')!);

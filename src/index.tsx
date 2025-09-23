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
import { lazy, Suspense } from 'preact/compat';

import style from '@styles/app.module.scss';
import '@styles/flexlayout.scss';
import { ThemeProvider } from '@speedscope/views/themes/theme';
import { errorAtom, isImmediatelyLoading } from '@speedscope/app-state';
import { useAtom } from '@speedscope/lib/atom';
import { useRef, useState } from 'preact/hooks';

import TopBar from "./top-bar";
import DragDropLayout from './drag-drop-layout';
import WelcomeScreen from './welcome-screen';
import LoadingScreen from './loading-screen';
import { configureSpeedscope } from './speedscope';
const LazyTilingLayout = lazy(() => import("@/tiling-layout"));


// Configure Speedscope - only once before application starts
configureSpeedscope();

/**
 * The entrypoint of the application, defining top bar,
 * tiling layout and welcome screen.
 */
export function App() {
    const tilingRef = useRef(null);
    const [welcomeSt, setWelcomeSt] = useState<boolean>(!isImmediatelyLoading);
    const isErrorSt = useAtom<boolean>(errorAtom);

    const displayWelcome = welcomeSt || isErrorSt;

    return (
        <div id={style.app}>
            <ThemeProvider>
                <TopBar tilingRef={tilingRef} displayTitle={!displayWelcome} />
                <DragDropLayout id={style["tiling-container"]} enabled={!displayWelcome}>
                    <Suspense fallback={<LoadingScreen />}>
                        <LazyTilingLayout tilingRef={tilingRef} />
                    </Suspense>
                </DragDropLayout>
                {/* Overlay welcome screen on top of lazy loaded application to have access to Speedscope state */}
                {displayWelcome ? <WelcomeScreen setWelcomeScreenSt={setWelcomeSt} /> : null }
            </ThemeProvider>
            <div id={style.background} />
        </div>
    );
}

render(<App />, document.getElementById('mountpoint')!);

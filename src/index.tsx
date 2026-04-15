/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
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
import { errorAtom, isImmediatelyLoading, loadingCallbacksAtom, rawTefEventsAtom } from '@speedscope/app-state';
import { useAtom } from '@speedscope/lib/atom';
import { useRef, useState, useEffect } from 'preact/hooks';
import { io, Socket } from 'socket.io-client';

import { importProfilesFromBase64 } from '@speedscope/lib/profile-loader';
import TopBar from "./top-bar";
import DragDropLayout from './drag-drop-layout';
import WelcomeScreen from './welcome-screen';
import LoadingScreen from './loading-screen';
import { configureSpeedscope, useSpeedscopeLoader } from './speedscope';
const LazyTilingLayout = lazy(() => import("@/tiling-layout"));

// Initial trace example

/*
 * import initialTraces from '../public/advanced.json';
 * window.initialTraces = btoa(JSON.stringify(initialTraces))
 */

/*
 * There is an option to bake trace data into the html post-build, by adding a
 * <script> tag assigning base64-encoded traces to the initialTraces key in window.
 * The code below handles that.
 */
const tracesBaked = 'initialTraces' in window;
if (tracesBaked) {
    useSpeedscopeLoader(false)
        .loadProfile(() => importProfilesFromBase64('tracefile', window.initialTraces as string))
        .catch(e => console.error(e));
}

interface Message {
    command: string;
    data: unknown;
}
window.addEventListener('message', (event) => {
    const message = event.data as Message;
    if (message?.command === 'reloadTrace' && typeof message.data === 'string') {
        useSpeedscopeLoader(false)
            .loadProfile(() => importProfilesFromBase64('tracefile', message.data))
            .catch(e => console.error(e));
    }
});

// Configure Speedscope - only once before application starts
configureSpeedscope();


interface RpcNotification {
    jsonrpc: string;
    method: string;
    params: {
        events: Record<string, unknown>[];
        overlap_count?: number;
        total_count: number;
    };
}

/**
 * The entrypoint of the application, defining top bar,
 * tiling layout and welcome screen.
 */
export function App() {
    const tilingRef = useRef(null);
    const [welcomeSt, setWelcomeSt] = useState<boolean>(!isImmediatelyLoading);
    loadingCallbacksAtom.set({onstart() {setWelcomeSt(false);}});
    const isErrorSt = useAtom<boolean>(errorAtom);

    const [liveEvents, setLiveEvents] = useState<Record<string, unknown>[]>([]);
    const [eventCount, setEventCount] = useState<number>(0);

    const [isStreaming, setIsStreaming] = useState<boolean>(false);

    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io();
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to Zephelin backend');

            socket.emit("rpc_request", {
                jsonrpc: "2.0",
                method: "trace.connect",
                id: Date.now(),
            });
        });

        socket.on('rpc_notification', (data: RpcNotification) => {
            if (data.method === 'trace.events') {
                const newEvents = data.params.events;
                const overlap = data.params.overlap_count ?? 0;

                setLiveEvents(prevEvents => {
                    if (prevEvents.length === 0) {return newEvents;}

                    const safeIndex = Math.max(0, prevEvents.length - overlap);
                    const safePreviousEvents = prevEvents.slice(0, safeIndex);

                    return [...safePreviousEvents, ...newEvents];
                });
                setEventCount(data.params.total_count);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleToggleStreaming = () => {
        if (!socketRef.current) {return;}

        const targetMethod = isStreaming ? "trace.stream_stop" : "trace.stream_start";

        console.log(`Sending RPC: ${targetMethod}`);

        socketRef.current.emit("rpc_request", {
            jsonrpc: "2.0",
            method: targetMethod,
            id: Date.now(),
        });

        setIsStreaming(!isStreaming);
    };

    useEffect(() => {
        if (liveEvents.length > 0) {

            const traceData = {
                traceEvents: liveEvents,
                displayTimeUnit: "ns",
                systemTraceEvents: "Trace from Zephelin Server",
            };

            rawTefEventsAtom.set(liveEvents);

            const jsonString = JSON.stringify(traceData);
            const asciiData = btoa(jsonString);

            useSpeedscopeLoader(false)
                .loadProfile(() => importProfilesFromBase64('Live Trace Snapshot', asciiData))
                .then(() => setWelcomeSt(false))
                .catch(e => console.error("Snapshot injection failed:", e));
        };

    }, [eventCount]);

    const displayWelcome = ((welcomeSt || isErrorSt) && (!tracesBaked));

    return (
        <div id={style.app}>
            <ThemeProvider>
                <TopBar
                    tilingRef={tilingRef}
                    displayTitle={!displayWelcome}
                    eventCount={eventCount}
                    isStreaming={isStreaming}
                    onToggleStreaming={handleToggleStreaming}
                />
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

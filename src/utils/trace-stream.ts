/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'preact/hooks';
import { io, Socket } from 'socket.io-client';
import { importProfilesFromBase64 } from '@speedscope/lib/profile-loader';
import { rawTefEventsAtom } from '@speedscope/app-state';
import { useSpeedscopeLoader } from '../speedscope';

export interface RpcNotification {
    jsonrpc: string;
    method: string;
    params: {
        events: Record<string, unknown>[];
        overlap_count?: number;
        total_count: number;
    };
}

export function useTraceStream(setWelcomeSt: (state: boolean) => void) {
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

    const toggleStreaming = () => {
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

    }, [eventCount, liveEvents, setWelcomeSt]);

    return {
        eventCount,
        isStreaming,
        toggleStreaming,
    };
}

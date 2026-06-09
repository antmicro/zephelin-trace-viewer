/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { io, Socket } from 'socket.io-client';
import { Atom } from '@speedscope/lib/atom';
import { metadataAtom } from '@speedscope/app-state';
import { liveViewportProxy } from '@speedscope/views/live-viewport-proxy';
import { useSpeedscopeLoader } from '../speedscope';
import { GroupDataCache } from './cache';
import { LiveTraceParser } from './live-trace-parser';

// 30 FPS
const TRACE_RENDER_THROTTLE_MS = 33;

// 2 FPS
const INFO_PANEL_THROTTLE_MS = 500;

// Tracks the amount of ingested trace batches
export const liveTraceTickAtom = new Atom<number>(0, 'live-trace-tick');

// Injected by the VS Code extension
declare global {
    interface Window {
        ZEPHELIN_SERVER_URL?: string;
    }
}

export type TraceEvent = Record<string, unknown> & { ph?: string };

export interface RpcNotification {
    jsonrpc: string;
    method: string;
    params: {
        events?: TraceEvent[];
        overlap_count?: number;
        total_count: number;
    };
}

export interface RpcResponse {
    result?: {
        status: string;
        message?: string;
        data?: {
            events: TraceEvent[];
            overlap_count?: number;
            total_count: number;
        };
    };
    error?: string;
}

function useThrottle<T extends (...args: any[]) => void>(callback: T, delay: number) {
    const lastCall = useRef(0);
    return useCallback((...args: Parameters<T>) => {
        const now = performance.now();
        if (now - lastCall.current >= delay) {
            callback(...args);
            lastCall.current = now;
        }
    }, [callback, delay]);
}

export function useTraceStream(setWelcomeSt: (state: boolean) => void) {
    const [eventCount, setEventCount] = useState<number>(0);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const parserRef = useRef<LiveTraceParser | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const hasMetadataRef = useRef<boolean>(false);

    const updateInfoPanels = useThrottle(() => {
        GroupDataCache.clear();
        liveTraceTickAtom.set(liveTraceTickAtom.get() + 1);
    }, INFO_PANEL_THROTTLE_MS);

    const renderTraceBlocks = useThrottle((snapshotGroup) => {
        useSpeedscopeLoader(false, true)
            .loadProfile(() => Promise.resolve(snapshotGroup))
            .then(() => setWelcomeSt(false))
            .catch(e => console.error("Snapshot injection failed:", e));
    }, TRACE_RENDER_THROTTLE_MS);

    useEffect(() => {
        const vscodeServerUrl = window.ZEPHELIN_SERVER_URL;

        /*
         * If used outside of VS Code extension assume frontend is hosted
         * by the server and let Socket.io default to window's origin.
         */
        const socket = vscodeServerUrl
            ? io(vscodeServerUrl , {transports: ['websocket'] })
            : io({ transports: ['websocket'] });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to Zephelin backend');
            setIsConnected(true);

            socket.emit("rpc_request", {
                jsonrpc: "2.0",
                method: "trace.connect",
                id: Date.now(),
            });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Zephelin backend');
            setIsConnected(false);
            setIsStreaming(false);
        });

        const processIncomingTrace = (incomingEvents: TraceEvent[], overlap: number, totalCount: number) => {
            if (incomingEvents.length === 0) {return;}

            parserRef.current ??= new LiveTraceParser('Live Trace Stream');
            parserRef.current.ingest(incomingEvents);

            if (!hasMetadataRef.current && socketRef.current) {
                hasMetadataRef.current = true;
                socketRef.current.emit("rpc_request", {
                    jsonrpc: "2.0",
                    method: "trace.metadata",
                    id: Date.now(),
                });
            }

            const hasTraceEvents = incomingEvents.some(e => e.ph === 'B' || e.ph === 'E');
            if (hasTraceEvents) {
                const snapshotGroup = parserRef.current.getSnapshot();
                renderTraceBlocks(snapshotGroup);
                updateInfoPanels();
            } else {
                if (parserRef.current) {
                    metadataAtom.set(parserRef.current.getRawMetadata());
                }
            }

            if (totalCount !== undefined) {
                setEventCount(totalCount);
            }

        };

        socket.on('rpc_notification', (data: RpcNotification) => {
            if (data.method === 'trace.events' && data.params.events) {
                processIncomingTrace(
                    data.params.events,
                    data.params.overlap_count ?? 0,
                    data.params.total_count,
                );
            }
            else if (data.method === 'trace.status') {
                setEventCount(data.params.total_count);
            }
        });

        socket.on('rpc_response', (data: RpcResponse) => {
            if (data?.result?.status === 'success') {
                if (data.result.data?.events) {
                    processIncomingTrace(
                        data.result.data.events,
                        data.result.data.overlap_count ?? 0,
                        data.result.data.total_count,
                    );
                }
            } else if (data?.error || data?.result?.status === 'error') {
                console.error("Backend Error:", data.error ?? data.result.message);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [setWelcomeSt]);

    const toggleStreaming = () => {
        if (!socketRef.current) {return;}

        const targetMethod = isStreaming ? "trace.stream_stop" : "trace.stream_start";

        console.log(`Sending RPC: ${targetMethod}`);

        socketRef.current.emit("rpc_request", {
            jsonrpc: "2.0",
            method: targetMethod,
            id: Date.now(),
        });

        const nextStreamingState = !isStreaming;
        setIsStreaming(nextStreamingState);
        liveViewportProxy.isLiveMode = nextStreamingState;

        if (nextStreamingState) {
            liveViewportProxy.autoPanToRight = true;
        }
    };

    const toggleAutoPan = () => {
        liveViewportProxy.autoPanToRight = !liveViewportProxy.autoPanToRight;
    };

    const isAutoPanEnabled = liveViewportProxy.autoPanToRight;

    const triggerCollect = () => {
        if (!socketRef.current) {return;}
        console.log("Sending RPC: trace.collect");

        socketRef.current.emit("rpc_request", {
            jsonrpc: "2.0",
            method: "trace.collect",
            id: Date.now(),
        });
    };

    return {
        eventCount,
        isStreaming,
        toggleStreaming,
        triggerCollect,
        isConnected,
        isAutoPanEnabled,
        toggleAutoPan,
    };
}

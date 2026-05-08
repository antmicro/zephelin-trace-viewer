/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'preact/hooks';
import { io, Socket } from 'socket.io-client';
import { importProfilesFromRaw } from '@speedscope/lib/profile-loader';
import { rawTefEventsAtom } from '@speedscope/app-state';
import { Atom } from '@speedscope/lib/atom';
import { useSpeedscopeLoader } from '../speedscope';
import { GroupDataCache } from './cache';

// Tracks the amount of ingested trace batches
export const liveTraceTickAtom = new Atom<number>(0, 'live-trace-tick');

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

export function useTraceStream(setWelcomeSt: (state: boolean) => void) {
    const [eventCount, setEventCount] = useState<number>(0);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const liveEventsRef = useRef<TraceEvent[]>([]);
    const hasMetadataRef = useRef<boolean>(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socket = io();
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
            if (incomingEvents.length === 0) { return incomingEvents; }

            const prevEvents = liveEventsRef.current;
            const newMetadata = incomingEvents.filter(e => e.ph === 'M');
            const newTrace = incomingEvents.filter(e => e.ph !== 'M');

            const safeIndex = Math.max(0, prevEvents.length - overlap);
            const safePreviousEvents = prevEvents.slice(0, safeIndex);

            const updatedEvents = [...newMetadata, ...safePreviousEvents, ...newTrace];
            liveEventsRef.current = updatedEvents;

            rawTefEventsAtom.set(updatedEvents);

            if (!hasMetadataRef.current) {
                hasMetadataRef.current = true;
                socketRef.current.emit("rpc_request", {
                    jsonrpc: "2.0",
                    method: "trace.metadata",
                    id: Date.now(),
                });
            }

            const traceData = {
                traceEvents: updatedEvents,
                displayTimeUnit: "ns",
                systemTraceEvents: "Trace from Zephelin Server",
            };

            useSpeedscopeLoader(false, true)
                .loadProfile(() => importProfilesFromRaw('Live Trace Snapshot', traceData))
                .then(() => {
                    setWelcomeSt(false);
                    GroupDataCache.clear();
                    liveTraceTickAtom.set(liveTraceTickAtom.get() + 1);
                })
                .catch(e => console.error("Snapshot injection failed:", e));

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

    };

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
    };
}

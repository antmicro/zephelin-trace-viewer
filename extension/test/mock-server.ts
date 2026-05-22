/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * Implementation of mock Zephelin server.
 * Responds to JSON RPC requests with dummy TEF style data.
 */

import { Server, Socket } from 'socket.io';

export class ZephelinMockServer {
    private io: Server | undefined;
    public activeClient: Socket | undefined;

    private streamInterval: NodeJS.Timeout | undefined;

    public start(port = 8000): void {
        this.io = new Server(port, {
            cors: { origin: '*'},
        });

        this.io.on('connection', (socket) => {
            console.log("[MockServer] Webview connected to backend.");
            this.activeClient = socket;

            socket.on('rpc_request', (req: { method?: string }) => {
                this.handleRpcRequest(socket, req);
            });

            socket.on('disconnect', () => {
                console.log("[MockServer] Webview disconnected.");
                this.activeClient = undefined;
                this.clearStream();
            });
        });
    }

    public stop(): void {
        if (this.io) {
            void this.io.close();
            this.io = undefined;
        }
        this.activeClient = undefined;
    }

    private clearStream(): void {
        if (this.streamInterval) {
            clearInterval(this.streamInterval);
            this.streamInterval = undefined;
        }
    }

    private handleRpcRequest(socket: Socket, req: { method?: string }): void {
        if (req.method === 'trace.connect') {
            socket.emit('rpc_response', {
                result: { status: 'success', message: 'Connected to the mock server' },
            });
        }

        if (req.method === 'trace.collect') {
            socket.emit('rpc_response', {
                result: {
                    status: 'success',
                    data: {
                        events: [
                            { name: "dummy_event", cat: "zephyr", ph: "B", pid: 0, tid: 1, ts: 5000 },
                            { name: "dummy_event", cat: "zephyr", ph: "E", pid: 0, tid: 1, ts: 6000 },
                        ],
                        overlap_count: 0,
                        total_count:2,
                    },
                },
            });
            console.log(" [Mock] Handled trace.collect request.");
        }

        if (req.method === 'trace.stream_start') {
            socket.emit('rpc_response', { result: { status: 'success'} });
            console.log("[MockServer] Streaming started.");

            let accumulatedCount = 0;
            this.streamInterval = setInterval(() => {
                accumulatedCount += 2;
                socket.emit('rpc_notification', {
                    jsonrpc: "2.0",
                    method: "trace.events",
                    params: {
                        events: [
                            { name: `stream_event_${accumulatedCount}`, cat: "zephyr", ph: "B", pid: 0, tid: 1, ts: 1000 * accumulatedCount },
                            { name: `stream_event_${accumulatedCount}`, cat: "zephyr", ph: "E", pid: 0, tid: 1, ts: 1000 * accumulatedCount + 500 },
                        ],
                        overlap_count: 0,
                        total_count: accumulatedCount,
                    },
                });
            }, 1000);
        }

        if (req.method === 'trace.stream_stop') {
            socket.emit('rpc_respone', { result: { status: 'success' } });
            this.clearStream();
            console.log("[MockServer] Streaming stopped.");
        }
    }
}

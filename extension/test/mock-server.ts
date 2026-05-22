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
    }
}

/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as vscode from 'vscode';

export class ZephelinServer {
    private process?: ChildProcess;

    constructor(private context: vscode.ExtensionContext) { }

    public async start(port: number): Promise<void> {
        if (this.process) {
            return Promise.resolve();
        }

        const config = vscode.workspace.getConfiguration('zephelin');
        const repoPath = config.get<string>('backendPath');

        if (!repoPath || !fs.existsSync(repoPath)) {
            vscode.window.showErrorMessage(
                "Zephelin: backendPath not configured. Please set 'zephelin.backendPath' in extension settings.",
            );
            throw new Error("Configuration missing.");
        }

        const scriptPath = path.join(repoPath, 'server', 'run_backend.py');
        const buildDirPath = path.join(repoPath, 'build');

        const pythonCmd = 'python3';

        const args = [
            scriptPath,
            '--backend-port', port.toString(),
            '--verbosity', 'DEBUG',
            '--build-dir', buildDirPath
        ];

        this.process = spawn(pythonCmd, args, {
            cwd: repoPath,
        });

        this.process.stderr?.on('data', (data) => {
            console.log(data.toString());
        });

        try {
            // Wait before server loads before opening the webview
            await this.waitForPort(port, 10000);
            console.log(`[Extension] Backend successfully bound to port ${port}`);
        } catch (error) {
            console.error(`[Extension] Failed to start backend: ${error}`);
            this.stop();
            throw error;
        }
    }

    public stop() {
        if (this.process) {
            this.process.kill();
            this.process = undefined;
        }
    }

    /**
     * Pings the given port every 200ms until it connects or times out.
     */
    private waitForPort(port: number, timeoutMs: number): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkPort = () => {
                const socket = new net.Socket();

                socket.on('connect', () => {
                    socket.destroy();
                    resolve();
                });

                socket.on('error', (err) => {
                    socket.destroy();
                    if (Date.now() - startTime > timeoutMs) {
                        reject(new Error(`Timeout waiting for port ${port} to open.`));
                    } else {
                        setTimeout(checkPort, 200);
                    }
                });

                socket.connect(port, '127.0.0.1');
            };

            checkPort();
        });
    }
}

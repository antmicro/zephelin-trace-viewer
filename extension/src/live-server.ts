/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import * as vscode from 'vscode';

export interface ZephelinConfig {
    backendPath?: string;
    pythonPath?: string;
    tcpServerHost?: string;
    tcpServerPort?: number;
    backendHost?: string;
    backendPort?: number;
    buildDir?: string;
    tflmModelPaths?: string[];
    tvmModelPaths?: string[];
    tvmModelMetadataPaths?: string[];
};

export class ZephelinServer {
    private config: ZephelinConfig;
    private process?: ChildProcess;

    constructor(
        private context: vscode.ExtensionContext,
        config: ZephelinConfig,
    ) {
        this.config = config;
    }

    public async start(): Promise<void> {
        if (this.process) {
            return Promise.resolve();
        }

        const repoPath = this.config.backendPath;
        const tcpServerHost = this.config.tcpServerHost;
        const tcpServerPort = this.config.tcpServerPort;
        const backendHost = this.config.backendHost;
        const backendPort = this.config.backendPort;
        const buildDir = this.config.buildDir ?? 'build';
        const tflmModelPaths = this.config.tflmModelPaths;
        const tvmModelPaths = this.config.tvmModelPaths;
        const tvmModelMetadataPaths = this.config.tvmModelMetadataPaths;

        if (!repoPath || !fs.existsSync(repoPath)) {
            vscode.window.showErrorMessage(
                "Zephelin: backendPath not configured. Please set 'zephelin.backendPath' in extension settings.",
            );
            throw new Error("Configuration missing.");
        }

        const scriptPath = path.join(repoPath, 'server', 'run_backend.py');
        const buildDirPath = path.isAbsolute(buildDir) ? buildDir : path.join(repoPath, buildDir);

        const pythonCmd = this.resolvePythonCommand();

        const args = [
            scriptPath,
            '--build-dir', buildDirPath,
        ];

        if (backendHost) {
            args.push('--backend-host', backendHost);
        }
        if (backendPort) {
            args.push('--backend-port', backendPort.toString());
        }
        if (tcpServerHost) {
            args.push('--tcp-server-host', tcpServerHost);
        }
        if (tcpServerPort) {
            args.push('--tcp-server-port', tcpServerPort.toString());
        }
        if (tflmModelPaths && tflmModelPaths.length > 0) {
            args.push('--tflm-model-paths', ...tflmModelPaths);
        }
        if (tvmModelPaths && tvmModelPaths.length > 0) {
            args.push('--tvm-model-paths', ...tvmModelPaths);
        }
        if (tvmModelMetadataPaths && tvmModelMetadataPaths.length > 0) {
            args.push('--tvm-model-metadata-paths', ...tvmModelMetadataPaths);
        }

        this.process = spawn(pythonCmd, args, {
            cwd: repoPath,
            stdio: ['ignore', 'inherit', 'pipe'],
        });

        this.process.stderr?.on('data', (data) => {
            console.log(String(data));
        });

        try {
            // Wait before server loads before opening the webview
            await this.waitForPort(backendHost, backendPort, 10000);
            console.log(`[Extension] Backend successfully bound to port ${backendPort}`);
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
     * Resolves the Python executable.
     */
    private resolvePythonCommand(): Promise<string> {
        if (this.config.pythonPath) {
            return this.config.pythonPath;
        }

        return 'python';
    }

    /**
     * Pings the given port every 200ms until it connects or times out.
     */
    private waitForPort(address: string, port: number, timeoutMs: number): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkPort = () => {
                const socket = new net.Socket();

                socket.on('connect', () => {
                    socket.destroy();
                    resolve();
                });

                socket.on('error', (_err) => {
                    socket.destroy();
                    if (Date.now() - startTime > timeoutMs) {
                        reject(new Error(`Timeout waiting for port ${port} on address ${address} to open.`));
                    } else {
                        setTimeout(checkPort, 200);
                    }
                });

                socket.connect(port, address);
            };

            checkPort();
        });
    }
}

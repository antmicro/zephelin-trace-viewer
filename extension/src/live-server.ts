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
    zephyrBase?: string;
    tflmModelPaths?: string[];
    tvmModelPaths?: string[];
    tvmModelMetadataPaths?: string[];
    mockTraceFile?: string;
    mockPlaybackSpeed?: number;
};

/** How long to let the backend exit cleanly before forcefully killing it. */
const SHUTDOWN_GRACE_MS = 5000;

/** How long to wait for a stopped backend to release its port. */
const PORT_RELEASE_TIMEOUT_MS = 5000;

/**
 * How much of the backend's stderr to quote back when it fails to start.
 */
const STDERR_TAIL_LINES = 3;

export class ZephelinServer {
    private config: ZephelinConfig;
    private process?: ChildProcess;
    private stopping?: Promise<void>;

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
        const zephyrBase = this.config.zephyrBase;
        const buildDir = this.config.buildDir ?? 'build';
        const tflmModelPaths = this.config.tflmModelPaths;
        const tvmModelPaths = this.config.tvmModelPaths;
        const tvmModelMetadataPaths = this.config.tvmModelMetadataPaths;
        const mockTraceFile = this.config.mockTraceFile;
        const mockPlaybackSpeed = this.config.mockPlaybackSpeed;

        if (!repoPath) {
            throw new Error(
                "'zephelin.backendPath' is not set. Point it at your Zephelin repository, "
                + 'the directory containing server/run_backend.py.',
            );
        }
        if (!fs.existsSync(repoPath)) {
            throw new Error(`'zephelin.backendPath' points at '${repoPath}', which does not exist.`);
        }

        const scriptPath = path.join(repoPath, 'server', 'run_backend.py');
        const buildDirPath = path.isAbsolute(buildDir) ? buildDir : path.join(repoPath, buildDir);

        if (!fs.existsSync(scriptPath)) {
            throw new Error(
                `'${repoPath}' does not look like a Zephelin repository - `
                + `there is no '${scriptPath}'.`,
            );
        }

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
        if (mockTraceFile) {
            args.push('--mock-trace-file', mockTraceFile);
            if (mockPlaybackSpeed) {
                args.push('--mock-playback-speed', mockPlaybackSpeed.toString());
            }
        }

        console.log(`[Extension] Spawning backend: ${pythonCmd} ${args.join(' ')}`);
        if (zephyrBase) {
            console.log(`[Extension] Backend ZEPHYR_BASE: ${zephyrBase}`);
        }
        const child = spawn(pythonCmd, args, {
            cwd: repoPath,
            stdio: ['ignore', 'inherit', 'pipe'],
            env: {
                ...process.env,
                ...(zephyrBase ? { ZEPHYR_BASE: zephyrBase } : {}),
            },
        });
        this.process = child;

        let stderrTail: string[] = [];

        child.stderr?.on('data', (data) => {
            const text = String(data);
            console.log(text);
            stderrTail = [...stderrTail, ...text.split('\n').filter(l => l.trim() !== '')]
                .slice(-STDERR_TAIL_LINES);
        });
        child.on('exit', (code, signal) => {
            console.log(`[Extension] Backend process exited (code=${code}, signal=${signal})`);
        });

        const died = new Promise<never>((_resolve, reject) => {
            child.on('error', (err: NodeJS.ErrnoException) => {
                reject(new Error(err.code === 'ENOENT'
                    ? `Python executable '${pythonCmd}' was not found. Set 'zephelin.pythonPath' `
                        + 'to the interpreter of the environment Zephelin is installed in.'
                    : `Could not run '${pythonCmd}': ${err.message}`));
            });
            child.on('close', (code, signal) => {
                const how = signal ? `was killed by ${signal}` : `exited with code ${code}`;
                reject(new Error(
                    `The backend ${how} before it started listening. `
                    + (stderrTail.length > 0
                        ? stderrTail.join(' ')
                        : 'It printed nothing - check that Zephelin is installed in the '
                            + 'Python environment used to run it.'),
                ));
            });
        });
        died.catch(() => undefined);

        try {
            // Wait before server loads before opening the webview
            await Promise.race([this.waitForPort(backendHost, backendPort, 60000), died]);
            console.log(`[Extension] Backend successfully bound to port ${backendPort}`);
        } catch (error) {
            console.error(`[Extension] Failed to start backend: ${error}`);
            await this.stop();
            throw error;
        }
    }

    /**
     * Stops the backend and waits for it to exit and release its port.
     */
    public async stop(): Promise<void> {
        this.stopping ??= this.doStop().finally(() => {
            this.stopping = undefined;
        });

        return this.stopping;
    }

    private async doStop(): Promise<void> {
        const child = this.process;

        if (!child) {
            return;
        }

        this.process = undefined;

        if (child.exitCode !== null || child.signalCode !== null) {
            return;
        }

        await new Promise<void>((resolve) => {
            const killTimer = setTimeout(() => {
                console.warn(
                    `[Extension] Backend did not exit within ${SHUTDOWN_GRACE_MS}ms. Sending SIGKILL.`,
                );
                child.kill('SIGKILL');
            }, SHUTDOWN_GRACE_MS);

            child.once('exit', () => {
                clearTimeout(killTimer);
                resolve();
            });

            child.kill();
        });

        /*
         * Hold the port until it is free so waitForPort
         * cannot be satisfied by the process being replaced.
         */
        const { backendHost, backendPort } = this.config;

        if (backendHost && backendPort) {
            const released = await this.waitForPortFree(
                backendHost,
                backendPort,
                PORT_RELEASE_TIMEOUT_MS,
            );

            if (!released) {
                console.warn(
                    `[Extension] Port ${backendPort} is still held after stopping the backend.`,
                );
            }
        }
    }

    /**
     * Resolves true once nothing is listening on the port, false on timeout.
     */
    private waitForPortFree(address: string, port: number, timeoutMs: number): Promise<boolean> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const checkPort = () => {
                const socket = new net.Socket();

                socket.on('connect', () => {
                    socket.destroy();
                    if (Date.now() - startTime > timeoutMs) {
                        resolve(false);
                    } else {
                        setTimeout(checkPort, 200);
                    }
                });

                socket.on('error', () => {
                    socket.destroy();
                    resolve(true);
                });

                socket.connect(port, address);
            };

            checkPort();
        });
    }

    /**
     * Resolves the Python executable.
     */
    private resolvePythonCommand(): string {
        const configured = this.config.pythonPath;

        if (!configured) {
            return 'python';
        }

        if (configured.includes(path.sep) && !fs.existsSync(configured)) {
            throw new Error(
                `'zephelin.pythonPath' points at '${configured}', which does not exist.`,
            );
        }

        return configured;
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

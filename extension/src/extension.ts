/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { ZephelinConfig, ZephelinServer } from './live-server';

/**
 * Reads the Zephelin configuration from VS Code settings and merges it with
 * optional overrides.
 */
function getZephelinConfig(overrides?: Partial<ZephelinConfig>): ZephelinConfig {
    const wsConfig = vscode.workspace.getConfiguration('zephelin');

    return {
        backendPath: overrides?.backendPath ?? wsConfig.get<string>('backendPath'),
        pythonPath: overrides?.pythonPath ?? wsConfig.get<string>('pythonPath'),
        tcpServerHost: overrides?.tcpServerHost ?? wsConfig.get<string>('tcpServerHost'),
        tcpServerPort: overrides?.tcpServerPort ?? wsConfig.get<number>('tcpServerPort'),
        backendHost: overrides?.backendHost ?? wsConfig.get<string>('backendHost'),
        backendPort: overrides?.backendPort ?? wsConfig.get<number>('backendPort'),
        buildDir: overrides?.buildDir ?? wsConfig.get<string>('buildDir') ?? 'build',
        tflmModelPaths: overrides?.tflmModelPaths ?? wsConfig.get<string[]>('tflmModelPaths'),
        tvmModelPaths: overrides?.tvmModelPaths ?? wsConfig.get<string[]>('tvmModelPaths'),
        tvmModelMetadataPaths: overrides?.tvmModelMetadataPaths ?? wsConfig.get<string[]>('tvmModelMetadataPaths'),
    };
}

let sidecar: ZephelinServer | undefined;

export function activate(context: vscode.ExtensionContext): void {
    const provider = new TraceEditorProvider(context);

    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            TraceEditorProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
            },
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('zephelin.openLiveViewer', (externalConfig?: Partial<ZephelinConfig>) => {

            if (sidecar) {
                sidecar.stop();
            }

            const zephelinConfig = getZephelinConfig(externalConfig);

            sidecar = new ZephelinServer(context, zephelinConfig);

            void provider.openLiveViewer();
        }),
    );
}

export function deactivate(): void {
    if (sidecar) {
        sidecar.stop();
    }
}

class TraceEditorProvider implements vscode.CustomTextEditorProvider {
    static readonly viewType = 'zephelinTraceViewer';

    constructor(private readonly context: vscode.ExtensionContext) { }

    /**
     * Opens the Live Viewer in a dedicated Webview panel.
     */
    public async openLiveViewer(): Promise<void> {
        const distPath = this.getDistPath();
        const config = getZephelinConfig();

        const panel = vscode.window.createWebviewPanel(
            'zephelinLiveViewer',
            'Zephelin Trace Viewer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(distPath)],
                retainContextWhenHidden: true,
            },
        );

        if (sidecar) {
            try {
                await sidecar.start();
            } catch {
                vscode.window.showErrorMessage("Failed to start Zephelin backend.");
            }
        }

        panel.webview.html = this.getWebviewHtml(panel.webview, "", distPath, config);
    }

    /**
     * Resolves the custom text editor for viewing static trace files.
     */
    resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken,
    ): void {
        const distPath = this.getDistPath();
        const config = getZephelinConfig();

        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(distPath)],
        };

        webviewPanel.webview.html = this.getWebviewHtml(
            webviewPanel.webview,
            document.getText(),
            distPath,
            config,
        );

        const updateWebview = () => {
            const text = document.getText();
            const base64 = Buffer.from(text).toString('base64');
            webviewPanel.webview.postMessage({ command: 'reloadTrace', data: base64 });
        };

        let debounceTimer: ReturnType<typeof setTimeout> | undefined;
        const changeSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() !== document.uri.toString()) {
                return;
            }
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(updateWebview, 300);
        });

        webviewPanel.onDidDispose(() => void changeSubscription.dispose());
        this.context.subscriptions.push(changeSubscription);
    }

    /**
     * Resolves the path to the built webapp dist/ folder.
     * Looks for it at `../dist` relative to the extension directory.
     */
    private getDistPath(): string {
        const extensionRoot = this.context.extensionPath;
        return this.context.extensionMode === vscode.ExtensionMode.Development ?
            path.join(extensionRoot, '..', 'dist') :
            path.join(extensionRoot, 'dist');
    }

    /**
     * Generates the webview HTML content.
     *
     * Reads the built index.html from dist/, rewrites asset paths
     * to webview URIs, injects the trace data as base64 into
     * window.initialTraces, and adds a CSP meta tag with a nonce.
     */
    private getWebviewHtml(
        webview: vscode.Webview,
        traceContent: string,
        distPath: string,
        config: ZephelinConfig,
    ): string {
        const nonce = this.getNonce();
        const distUri = vscode.Uri.file(distPath);
        const zephelinServerUrl = `http://${config.backendHost}:${config.backendPort}`;
        const wsUrl = `ws://${config.backendHost}:${config.backendPort}`;

        // Read the built index.html
        const indexHtmlPath = path.join(distPath, 'index.html');
        let html: string;
        try {
            html = fs.readFileSync(indexHtmlPath, 'utf-8');
        } catch {
            return this.getErrorHtml(
                'Webapp not built',
                'Could not find dist/index.html. Run <code>yarn build</code> in the project root first.',
            );
        }

        // Rewrite relative asset paths (href="./..." and src="./...") to webview URIs
        html = html.replace(
            /(href|src)="\.\/([^"]+)"/g,
            (_match: string, attr: string, relativePath: string): string => {
                const assetUri = webview.asWebviewUri(
                    vscode.Uri.joinPath(distUri, relativePath),
                );
                return `${attr}="${assetUri.toString()}"`;
            },
        );

        // Add nonce to all <script> tags
        html = html.replace(
            /<script(\s)/g,
            `<script nonce="${nonce}"$1`,
        );

        // Inject CSP meta tag and the initialTraces script into <head>
        const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource} 'wasm-unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; img-src ${webview.cspSource} data:; font-src ${webview.cspSource} https://fonts.gstatic.com; connect-src ${webview.cspSource} ${zephelinServerUrl} ${wsUrl} http://vscode-webview ws://vscode-webview;">`;
        let scriptContent = `window.ZEPHELIN_SERVER_URL = "${zephelinServerUrl}";`;

        if (traceContent) {
            const base64Content = String(Buffer.from(traceContent).toString('base64'));
            scriptContent = `window.initialTraces = "${base64Content}";\n ${scriptContent}`;
        }

        const traceScript = `<script nonce="${nonce}">${scriptContent}</script>`;

        html = html.replace(
            '</head>',
            `${cspMeta}\n${traceScript}\n</head>`,
        );

        return html;
    }

    /**
     * Returns a fallback error page if the webapp build is missing.
     */
    private getErrorHtml(title: string, message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Error</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			display: flex;
			align-items: center;
			justify-content: center;
			height: 100vh;
			margin: 0;
		}
		.error-container {
			text-align: center;
			max-width: 500px;
			padding: 2rem;
		}
		h1 { color: var(--vscode-errorForeground); }
		code {
			background: var(--vscode-textCodeBlock-background);
			padding: 2px 6px;
			border-radius: 3px;
		}
	</style>
</head>
<body>
	<div class="error-container">
		<h1>${title}</h1>
		<p>${message}</p>
	</div>
</body>
</html>`;
    }

    /**
     * Generates a random nonce string for CSP.
     */
    private getNonce(): string {
        return String(crypto.randomBytes(16).toString('hex'));
    }
}

/*
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
			}
		)
	);
}

export function deactivate(): void {
	// Nothing to dispose
}

class TraceEditorProvider implements vscode.CustomTextEditorProvider {
	static readonly viewType = 'zephelinTraceViewer';

	constructor(private readonly context: vscode.ExtensionContext) { }

	async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		const distPath = this.getDistPath();

		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(distPath)],
		};

		webviewPanel.webview.html = this.getWebviewHtml(
			webviewPanel.webview,
			document,
			distPath
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

		webviewPanel.onDidDispose(() => changeSubscription.dispose());
		this.context.subscriptions.push(changeSubscription);
	}

	/**
	 * Resolves the path to the built webapp dist/ folder.
	 * Looks for it at `../dist` relative to the extension directory.
	 */
	private getDistPath(): string {
		const extensionRoot = this.context.extensionPath;
		return path.join(extensionRoot, '..', 'dist');
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
		document: vscode.TextDocument,
		distPath: string
	): string {
		const nonce = this.getNonce();
		const distUri = vscode.Uri.file(distPath);

		// Read the built index.html
		const indexHtmlPath = path.join(distPath, 'index.html');
		let html: string;
		try {
			html = fs.readFileSync(indexHtmlPath, 'utf-8');
		} catch {
			return this.getErrorHtml(
				'Webapp not built',
				'Could not find dist/index.html. Run <code>yarn build</code> in the project root first.'
			);
		}

		// Base64-encode the document content for injection
		const traceContent = document.getText();
		const base64Content = Buffer.from(traceContent).toString('base64');

		// Rewrite relative asset paths (href="./..." and src="./...") to webview URIs
		html = html.replace(
			/(href|src)="\.\/([^"]+)"/g,
			(_match, attr, relativePath) => {
				const assetUri = webview.asWebviewUri(
					vscode.Uri.joinPath(distUri, relativePath)
				);
				return `${attr}="${assetUri}"`;
			}
		);

		// Add nonce to all <script> tags
		html = html.replace(
			/<script(\s)/g,
			`<script nonce="${nonce}"$1`
		);

		// Inject CSP meta tag and the initialTraces script into <head>
		const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource} 'wasm-unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com; img-src ${webview.cspSource} data:; font-src ${webview.cspSource} https://fonts.gstatic.com; connect-src ${webview.cspSource};">`;
		const traceScript = `<script nonce="${nonce}">window.initialTraces = "${base64Content}";</script>`;

		html = html.replace(
			'</head>',
			`${cspMeta}\n${traceScript}\n</head>`
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
		return crypto.randomBytes(16).toString('hex');
	}
}

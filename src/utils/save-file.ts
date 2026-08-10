/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module saving generated files, both from a web browser and VS Code extension's webview.
 */

/** The subset of the VS Code webview API used by the viewer */
interface VsCodeApi {
    postMessage(message: unknown): void;
}

// Injected by the VS Code webview host
declare global {
    interface Window {
        acquireVsCodeApi?: () => VsCodeApi;
    }
}

/** The request asking the extension to write a file to disk */
export interface SaveFileMessage {
    command: 'saveFile';
    data: {
        filename: string,
        contents: string,
    };
}

let vscodeApi: VsCodeApi | undefined;
let vscodeApiResolved = false;

/*
 * Caches VS Code api for all the calls from a single session.
 */
function getVsCodeApi(): VsCodeApi | undefined {
    if (!vscodeApiResolved) {
        vscodeApi = window.acquireVsCodeApi?.();
        vscodeApiResolved = true;
    }

    return vscodeApi;
}

/**
 * Saves the given contents under the given file name.
 */
export function saveFile(
    filename: string,
    contents: string,
    mimeType = 'application/json',
): void {
    const api = getVsCodeApi();

    // VS Code extension webview flow
    if (api) {
        const message: SaveFileMessage = {
            command: 'saveFile',
            data: { filename, contents },
        };
        api.postMessage(message);
        return;
    }

    // Web browser flow
    const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;

    // Wrap it in <a> so it works in Firefox
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
}

/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import { VSBrowser, EditorView, Workbench, By, until, WebView } from 'vscode-extension-tester';
import { expect } from 'chai';
describe('Zephelin Trace Viewer - Extension Tests', function () {
    this.timeout(60000);

    before(async function () {
        const browser = VSBrowser.instance;
        await browser.waitForWorkbench();

        // Mount the mock workspace to initialize workspace-level settings
        const workspacePath = path.resolve(__dirname, '..', 'test', 'test-workspace');
        await browser.openResources(workspacePath);
        await browser.waitForWorkbench();
    });

    after(async function () {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
    });

    it('should open the Zephelin Trace Viewer webview', async () => {
        const editorView = new EditorView();

        const openTabs = await editorView.getOpenEditorTitles();

        expect(openTabs).to.include('Zephelin Trace Viewer');
    });
});

/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * Tests for the live tracing in Zephelin Trace VS Code extension.
 */

import * as path from 'path';
import { VSBrowser, EditorView, Workbench, By, until, WebView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { ZephelinMockServer } from './mock-server';

describe('Zephelin Trace Viewer - Extension Tests', function () {
    this.timeout(60000);

    const mockServer = new ZephelinMockServer();

    before(async function () {
        mockServer.start(8000);

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

        mockServer.stop();
    });

    it('should open the Zephelin Trace Viewer webview', async () => {
        const editorView = new EditorView();

        const openTabs = await editorView.getOpenEditorTitles();

        expect(openTabs).to.include('Zephelin Trace Viewer');
    });
});

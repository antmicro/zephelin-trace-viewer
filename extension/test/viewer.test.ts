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

    beforeEach(async function () {
        const browser = VSBrowser.instance;
        const driver = browser.driver;
        const workbench = new Workbench();

        // Focus on the VS Code window
        const body = await driver.findElement(By.tagName('body'));
        await body.click();
        await new Promise(resolve => setTimeout(resolve, 500));

        const prompt = await workbench.openCommandPrompt();
        await prompt.setText('> zephelin.openLiveViewer');
        await new Promise(resolve => setTimeout(resolve, 100));
        await prompt.confirm();
    });

    afterEach(async function () {
        const editorView = new EditorView();
        await editorView.closeAllEditors();

        await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should open the Zephelin Trace Viewer webview', async () => {
        const editorView = new EditorView();
        const openTabs = await editorView.getOpenEditorTitles();
        expect(openTabs).to.include('Zephelin Trace Viewer');
    });

    it('should fetch new trace events when the Collect button is pressed', async () => {
        const editorView = new EditorView();
        const webview = await editorView.openEditor('Zephelin Trace Viewer') as WebView;

        await webview.switchToFrame();
        const driver = webview.getDriver();

        try {
            const collectBtn = await driver.wait(
                until.elementLocated(By.xpath("//button[contains(., 'Collect')]")),
                5000,
            );

            await collectBtn.click();

            const bufferStatus = await driver.wait(
                until.elementLocated(By.xpath("//span[contains(text(), 'Live Buffer:')]")),
                5000,
            );

            await driver.wait(
                until.elementTextContains(bufferStatus, '2'),
                4000,
                "Live buffer count did not update.",
            );

            const canvas = await driver.wait(
                until.elementLocated(By.tagName('canvas')),
                5000,
                "Trace canvas did not mount.",
            );

            const isCanvasVisible = await canvas.isDisplayed();
            expect(isCanvasVisible).to.be.true;

        } finally {
            await webview.switchBack();
        }
    });

        } finally {
            await webview.switchBack();
        }
    });
});

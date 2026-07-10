/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * Tests for Zephelin Trace VS Code extension.
 */

import * as path from 'path';
import { VSBrowser, EditorView, Workbench, By, Key, until, WebView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { ZephelinMockServer } from './mock-server';

const TIMEOUTS = {
    UI_SETTLE: 1000,
    TAB_MOUNT: 4000,
    ELEMENT_SEARCH: 8000,
    CANVAS_MOUNT: 25000,
    STREAMING: 5000,
    GLOBAL: 60000,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/*
 * Opens a file through quick open, driven from inside the tested VS Code window.
 */
async function openFileViaQuickOpen(filePath: string): Promise<void> {
    const driver = VSBrowser.instance.driver;
    const editorView = new EditorView();
    const fileName = path.basename(filePath);
    // The input widget interaction is flaky, hence retries
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const input = await new Workbench().openCommandPrompt();
            await input.setText(filePath);
            await sleep(TIMEOUTS.UI_SETTLE);
            await input.confirm();

            await driver.wait(
                async () => (await editorView.getOpenEditorTitles()).includes(fileName),
                TIMEOUTS.ELEMENT_SEARCH,
            );
            return;
        } catch (e) {
            console.warn(`Quick open attempt ${attempt}/${attempts} failed. Error: ${e}`);
            await driver.actions().sendKeys(Key.ESCAPE).perform();
            await sleep(TIMEOUTS.UI_SETTLE);
        }
    }
    throw new Error(`Failed to open '${fileName}' via quick open.`);
}

/*
 * Opens a file as an editor tab of the tested VS Code window.
 */
async function openTraceFile(filePath: string): Promise<void> {
    const browser = VSBrowser.instance;
    await browser.openResources(filePath);
    await browser.waitForWorkbench();
    await sleep(TIMEOUTS.TAB_MOUNT);

    const openTabs = await new EditorView().getOpenEditorTitles();
    if (!openTabs.includes(path.basename(filePath))) {
        await openFileViaQuickOpen(filePath);
    }
}

describe('Zephelin Trace Viewer - Extension Tests', function () {
    this.timeout(TIMEOUTS.GLOBAL);
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
        try {
            const editorView = new EditorView();
            await editorView.closeAllEditors();
        } catch (e) {
            console.warn(`Failed to close editors. Error: ${e}`);
        } finally {
            mockServer.stop();
        }
    });

    beforeEach(async function () {
        const browser = VSBrowser.instance;
        const driver = browser.driver;
        const workbench = new Workbench();

        // Focus on the VS Code window
        const body = await driver.findElement(By.tagName('body'));
        await body.click();
        await sleep(TIMEOUTS.UI_SETTLE);

        const prompt = await workbench.openCommandPrompt();
        await prompt.setText('> zephelin.openLiveViewer');
        await sleep(TIMEOUTS.UI_SETTLE);
        await prompt.confirm();

        await sleep(TIMEOUTS.TAB_MOUNT);
    });

    afterEach(async function () {
        try {
            const editorView = new EditorView();
            await editorView.closeAllEditors();
            await sleep(TIMEOUTS.UI_SETTLE);
        } catch (e) {
            console.warn(`Failed to close editors. Error: ${e}`);
        }
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
                TIMEOUTS.ELEMENT_SEARCH,
            );
            await collectBtn.click();

            const bufferStatus = await driver.wait(
                until.elementLocated(By.xpath("//span[contains(text(), 'Live Buffer:')]")),
                TIMEOUTS.ELEMENT_SEARCH,
            );

            await driver.wait(
                until.elementTextContains(bufferStatus, '2'),
                TIMEOUTS.ELEMENT_SEARCH,
                "Live buffer count did not update.",
            );

            const canvas = await driver.wait(
                until.elementLocated(By.tagName('canvas')),
                TIMEOUTS.CANVAS_MOUNT,
                "Trace canvas did not mount.",
            );
            const isCanvasVisible = await canvas.isDisplayed();
            expect(isCanvasVisible).to.be.true;

        } finally {
            await webview.switchBack();
        }
    });

    it('should autonomously fetch trace events continuously when streaming is started', async () => {
        const editorView = new EditorView();
        const webview = await editorView.openEditor('Zephelin Trace Viewer') as WebView;

        await sleep(TIMEOUTS.UI_SETTLE);
        await webview.switchToFrame();

        const driver = webview.getDriver();

        try {
            const streamToggleBtn = await driver.wait(
                until.elementLocated(By.xpath("//button[contains(., 'Start Streaming')]")),
                TIMEOUTS.ELEMENT_SEARCH,
            );
            await streamToggleBtn.click();

            const bufferStatus = await driver.wait(
                until.elementLocated(By.xpath("//span[contains(text(), 'Live Buffer:')]")),
                TIMEOUTS.ELEMENT_SEARCH,
            );

            for (let expectedCount = 2; expectedCount <= 10; expectedCount += 2) {
                await driver.wait(
                    until.elementTextContains(bufferStatus, expectedCount.toString()),
                    TIMEOUTS.ELEMENT_SEARCH,
                    `Live buffer did not update to ${expectedCount} during stream.`,
                );
            }

            const canvas = await driver.wait(
                until.elementLocated(By.tagName('canvas')),
                TIMEOUTS.CANVAS_MOUNT,
            );
            expect(await canvas.isDisplayed()).to.be.true;

            await sleep(TIMEOUTS.STREAMING);

            const stopStreamBtn = await driver.wait(
                until.elementLocated(By.xpath("//button[contains(., 'Stop Streaming')]")),
                TIMEOUTS.ELEMENT_SEARCH,
            );
            await stopStreamBtn.click();

        } finally {
            await webview.switchBack();
        }
    });
});

describe('Zephelin Trace Viewer - Static Trace Tests', function () {
    this.timeout(TIMEOUTS.GLOBAL);
    const traceName = 'static-trace.tef';
    const tracePath = path.resolve(__dirname, '..', 'test', 'test-workspace', traceName);

    before(async function () {
        const browser = VSBrowser.instance;
        await browser.waitForWorkbench();
    });

    beforeEach(async function () {
        await openTraceFile(tracePath);
        await sleep(TIMEOUTS.TAB_MOUNT);
    });

    afterEach(async function () {
        try {
            const editorView = new EditorView();
            await editorView.closeAllEditors();
            await sleep(TIMEOUTS.UI_SETTLE);
        } catch (e) {
            console.warn(`Failed to close editors. Error: ${e}`);
        }
    });

    it('should open a *.tef file in the Zephelin custom editor', async () => {
        const editorView = new EditorView();
        const openTabs = await editorView.getOpenEditorTitles();
        expect(openTabs).to.include(traceName);
    });

    it('should render the trace from the opened file', async () => {
        const editorView = new EditorView();
        const webview = await editorView.openEditor(traceName) as WebView;

        await webview.switchToFrame();
        const driver = webview.getDriver();

        try {
            const canvas = await driver.wait(
                until.elementLocated(By.tagName('canvas')),
                TIMEOUTS.CANVAS_MOUNT,
                "Trace canvas did not mount.",
            );
            expect(await canvas.isDisplayed()).to.be.true;

            const title = await driver.wait(
                until.elementLocated(By.xpath("//div[contains(text(), 'Zephelin Trace Viewer')]")),
                TIMEOUTS.ELEMENT_SEARCH,
            );
            expect(await title.isDisplayed()).to.be.true;

        } finally {
            await webview.switchBack();
        }
    });

    it('should not expose live tracing controls when viewing a static trace', async () => {
        const editorView = new EditorView();
        const webview = await editorView.openEditor(traceName) as WebView;

        await webview.switchToFrame();
        const driver = webview.getDriver();

        try {
            await driver.wait(
                until.elementLocated(By.tagName('canvas')),
                TIMEOUTS.CANVAS_MOUNT,
                "Trace canvas did not mount.",
            );

            for (const label of ['Collect', 'Start Streaming', 'Stop Streaming']) {
                const buttons = await driver.findElements(
                    By.xpath(`//button[contains(., '${label}')]`),
                );
                expect(buttons, `'${label}' button should not be rendered in static mode.`).to.be.empty;
            }

            const bufferStatus = await driver.findElements(
                By.xpath("//span[contains(text(), 'Live Buffer:')]"),
            );
            expect(bufferStatus, "Live buffer counter should not be rendered in static mode.").to.be.empty;

        } finally {
            await webview.switchBack();
        }
    });
});

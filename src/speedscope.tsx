/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The Speedscope component with adjustments like default dark theme and custom welcome message.
 */

import { Fragment, JSX, VNode } from 'preact';
import { useTheme } from '@speedscope/views/themes/theme';
import { ColorScheme, colorSchemeAtom } from '@speedscope/app-state/color-scheme';
import { ApplicationContainer } from '@speedscope/views/application-container';
import { appRefAtom, customWelcomeMessagesAtom, toolbarConfigAtom } from '@speedscope/app-state';
import { darkTheme } from '@speedscope/views/themes/dark-theme';
import { lightTheme } from '@speedscope/views/themes/light-theme';

import style from '@styles/app.module.scss';
import { useEffect, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import tilingComponent from './utils/tiling-component';


interface SelectTraceMessageProps {
    /** CSS class name for P elements */
    pClass: string,
    /** CSS class name for links */
    aClass: string,
    /** Element to embed into this message, usually browse button */
    children: VNode<HTMLButtonElement>,
}

/** Creates element defining how and which traces can be provided */
function SelectTraceMessage({pClass, children}: SelectTraceMessageProps) {
    const theme = useTheme();
    const spanStyle = {
        backgroundColor: theme.selectionSecondaryColor,
    };
    return (
        <Fragment>
            <p className={pClass}>
                Drag and drop a trace in TEF (Trace Event Format) onto this window to get started,
                or click the big blue button below to browse for a file to explore.
            </p>
            {children}
            <p className={pClass}>
                To convert CTF (Common Trace Format) trace received from Zephyr, use
                {' '}<span style={spanStyle} className={style['welcome-message-code']}>west zpl-prepare-trace</span>{' '}
                command from the Zephelin library.
            </p>
        </Fragment>
    );
}

/**
 * Creates element with a welcome message.
 * @param divClass CSS class name for DIV elements
 * @param pClass CSS class name for P elements
 * @param aClass CSS class name for links
 * @param browseButton An element with a button that allows to select the file with a trace
 */
function WelcomeMessage(divClass: string, pClass: string, aClass: string, browseButton: VNode<HTMLButtonElement>) {
    return (
        <div className={divClass}>
            <p className={pClass}>
                Hi there! Welcome to Zephelin Trace Viewer, an interactive visualizer for{' '}
                <a
                    className={aClass}
                    href="https://docs.zephyrproject.org/latest/services/tracing/index.html"
                    target="_blank"
                >
                    Zephyr traces
                </a>.
            </p>
            <SelectTraceMessage pClass={pClass} aClass={aClass}>
                {browseButton}
            </SelectTraceMessage>
        </div>
    );
}


/**
 * Setups Speedscope theme to dark, customizes colors and toolbar.
 * It should be executed before Speedscope is rendered.
 */
export function configureSpeedscope() {
    // Remove title and additional buttons from Speedscope toolbar
    toolbarConfigAtom.set({
        title: '', dragImport: false, changeDocumentTile: false,
    });
    // Adjust Speedscope theme colors
    darkTheme.selectionPrimaryColor = "#6e32ca";  // --colors-purple
    darkTheme.selectionSecondaryColor = "#8a59d5";  // --colors-purple-2
    darkTheme.bgCanvas = "#00000000";  // transparent
    darkTheme.bgSecondaryColor = "#242424";  // --colors-gray-1
    darkTheme.altBgPrimaryColor = "#1a1a1a"; // --colors-gray-bg
    darkTheme.altBgSecondaryColor = "#1a1a1a"; // --colors-gray-bg
    lightTheme.selectionPrimaryColor = "#8a59d5";  // --colors-purple-2
    lightTheme.selectionSecondaryColor = "#a781dd";  // --colors-purple-3
    lightTheme.bgCanvas = "#00000000";  // transparent
    lightTheme.bgSecondaryColor = "#242424";  // --colors-gray-1
    lightTheme.altBgPrimaryColor = "#1a1a1a"; // --colors-gray-bg
    lightTheme.altBgSecondaryColor = "#1a1a1a"; // --colors-gray-bg
    // Set custom welcome message
    const customMsg = customWelcomeMessagesAtom.get();
    if (customMsg.default === undefined) {
        customWelcomeMessagesAtom.set({default: WelcomeMessage});
    }
    // For default value, set theme to Dark
    if (colorSchemeAtom.get() === ColorScheme.SYSTEM) {
        colorSchemeAtom.set(ColorScheme.DARK);
    }
}


/** Element representing Speedscope app */
const Speedscope = memo((): JSX.Element => {
    const redrawCanvas = () => {
        const appRef = appRefAtom.get()?.current;
        if (appRef === undefined) {
            console.warn("Reference to Speedscope is not present, cannot redraw canvas");
            return;
        }
        appRef.redrawCanvas();
    };

    /*
     * Create resize and scroll observer for Speedscope container
     * which sends window resize event in order to redraw webGL context
     */
    const divRef = useRef<HTMLDivElement>(null);
    const resizeOserver = new ResizeObserver((_) => redrawCanvas());
    // Register observer after div is rendered
    useEffect(() => {
        if (divRef.current !== null) {
            resizeOserver.observe(divRef.current);
        }
        document.body.addEventListener("scroll", redrawCanvas);

        // Disconnect all elements on cleanup
        return () => {
            resizeOserver.disconnect();
            document.body.removeEventListener("scroll", redrawCanvas);
        };
    }, []);

    return (
        <div id={style['speedscope-container']} ref={divRef}>
            <ApplicationContainer />
        </div>
    );
// Override comparison function to hardly ever reload the Speedscope
}, (_prevProps, _nextProps) => true);

export default tilingComponent(Speedscope, "Flamegraph", {
    additionalProps: {
        minHeight: 400,
        minWidth: 540,
        enableClose: false,
    },
})!;

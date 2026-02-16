/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
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
import { customWelcomeMessagesAtom, dragActiveAtom, errorAtom, flattenRecursionAtom, hashParamsAtom, loadingAtom, profileGroupAtom, toolbarConfigAtom, viewModeAtom } from '@speedscope/app-state';
import { darkTheme } from '@speedscope/views/themes/dark-theme';
import { lightTheme } from '@speedscope/views/themes/light-theme';

import style from '@styles/app.module.scss';
import { memo, useCallback, useLayoutEffect, useMemo, useState } from 'preact/compat';
import { ProfileLoader } from '@speedscope/lib/profile-loader';
import { Atom, useAtom } from '@speedscope/lib/atom';
import { getCanvasContext, getProfileToView } from '@speedscope/app-state/getters';
import { Rect, Vec2 } from '@speedscope/lib/math';
import { FlamechartID, FlamechartViewState, ProfileGroupAtom, ProfileGroupState, ProfileState } from '@speedscope/app-state/profile-group';
import { ApplicationProps } from '@speedscope/views/application';
import { CallTreeNode, Frame } from '@speedscope/lib/profile';
import { ActiveProfileState } from '@speedscope/app-state/active-profile-state';
import { ViewMode } from '@speedscope/lib/view-mode';
import { noop } from '@speedscope/lib/utils';
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

/** Creates loaders functions that changes the Speedscope state. */
export const useSpeedscopeLoader = (reactive = true) => new ProfileLoader({
    setLoading: (v) => loadingAtom.set(v),
    setError: (v) => errorAtom.set(v),
    setProfileGroup: (v) => profileGroupAtom.setProfileGroup(v),
    setDragActive: (v) => dragActiveAtom.set(v),
    setViewMode: (v) => viewModeAtom.set(v),
    profileGroup: reactive ? useAtom(profileGroupAtom) : profileGroupAtom.get(),
    hashParams: reactive ? useAtom(hashParamsAtom) : hashParamsAtom.get(),
});

/** Returns the state of active profile. */
function getActiveProfileState(flattenRecursion: boolean, profileGroupState: ProfileGroupState): ActiveProfileState | null {
    if (!profileGroupState) {return null;}
    if (profileGroupState.indexToView >= profileGroupState.profiles.length) {return null;}

    const index = profileGroupState.indexToView;
    const profileState = profileGroupState.profiles[index];
    return {
        ...profileGroupState.profiles[profileGroupState.indexToView],
        profile: getProfileToView({
            profile: profileState.profile,
            flattenRecursion,
        }),
        index: profileGroupState.indexToView,
    };
}

const initialFlameChartViewState: FlamechartViewState = {
    hover: null,
    selectedNode: null,
    configSpaceViewportRect: Rect.empty,
    logicalSpaceViewportSize: Vec2.zero,
};

const cloneProfile = (initGroup: ProfileGroupState): ProfileGroupState => (!initGroup ? null : {
    name: initGroup.name,
    indexToView: initGroup.indexToView,
    profiles: initGroup.profiles.map((profile) => {
        return {
            profile: profile.profile,
            // View states are set automatically
            chronoViewState: initialFlameChartViewState,
            leftHeavyViewState: initialFlameChartViewState,
            sandwichViewState: { callerCallee: null },
        };
    }),
});


/** Speedscope selection state. */
interface SelectionState {
    /** Selected frame (SANDWICH_VIEW) or node (CHRONO/LEFT_HEAVY) */
    frameOrNode: Frame | CallTreeNode
    /** Profile index which contains the given frame/node */
    indexToView: number
}

/** Stores global state pointing to selected node. */
export const selectedAtom = new Atom<SelectionState | null>(null, 'selected');

interface HoverState {
    /** Hovered node name */
    node: string,
    /** Hovered node group */
    source: string,
}
/** Stores global state pointing to selected node. */
export const hoveredAtom = new Atom<HoverState | null>(null, 'hovered');

/** Tracks which groups are active in each flamegraph. */
export const activeGroupAtom = new Atom<Record<string, string | undefined>>({}, 'active-group');

/*
 * Atom does not notify listeners if the value was the same.
 * Speedscope instances are not in sync with this atom, therefore sometimes they might have the same value, sometimes not.
 * Function is used to force-trigger the change.
 */
export const indexToViewAtom = new Atom<() => number>(() => 0, 'indexToView');

/** Element representing Speedscope app */
const Speedscope = memo((): JSX.Element => {
    const theme = useTheme();
    const [canvas, setGLCanvas] = useState<HTMLCanvasElement | null>(null);
    const canvasContext = useMemo(
        () => (canvas ? getCanvasContext({theme, canvas}) : null),
        [theme, canvas],
    );

    const flattenRecursion = useAtom(flattenRecursionAtom);
    const [profileGroupState, profileGroupStateSet] = useState<ProfileGroupState>(cloneProfile(profileGroupAtom.get()));
    const activeProfileState = getActiveProfileState(flattenRecursion, profileGroupState);

    const [viewMode, setViewMode] = useState(ViewMode.CHRONO_FLAME_CHART);
    const [appSetters, appSettersSet] = useState<Partial<ApplicationProps>>({});

    const getSelectedNode = useCallback((frame: Frame, activeProfile: ProfileState) => {
        let selectedNode: CallTreeNode | null = null;
        activeProfile.profile.forEachCall((node) => {
            if (node instanceof CallTreeNode && node.frame === frame) {
                selectedNode = node;
            }
        }, noop);
        return selectedNode;
    }, [profileGroupState]);

    useLayoutEffect(() => {
        const uuid = crypto.randomUUID();

        /*
         * `Atom` is used instead of `useState<ProfileGroupState>` to have
         * persistent state and to be able to change specific parts without
         * re-rendering the entire component.
         */
        const instanceProfileGroupAtom = new ProfileGroupAtom(profileGroupState, `state-${uuid}`);

        /*
         * Created separately from `viewMode` state to be able to acquire
         * value in callbacks defined here.
         */
        const viewModeAtom = new Atom<ViewMode>(ViewMode.CHRONO_FLAME_CHART, `viewMode-${uuid}`);

        // Atom-state sync
        const setInstanceState = () => {
            profileGroupStateSet(instanceProfileGroupAtom.get());
            if (activeGroupAtom.get()[uuid] !== instanceProfileGroupAtom.getActiveProfile()?.profile.getGroupName()) {
                activeGroupAtom.set({
                    ...activeGroupAtom.get(),
                    [uuid]: instanceProfileGroupAtom.getActiveProfile()?.profile.getGroupName()
                });
            }
        }
        const setViewModeState = () => setViewMode(viewModeAtom.get());

        // Sync on import
        const syncProfiles = () => {
            if (loadingAtom.get()) {return;}
            instanceProfileGroupAtom.set(cloneProfile(profileGroupAtom.get()));
        };

        // Sync view if e.g. other panel requests
        const syncIndexToView = () => {
            instanceProfileGroupAtom.setProfileIndexToView(indexToViewAtom.get()());
        };


        /**
         * Sync selected frame or node.
         *
         * Supports conversion between all configurations (Selected type x View type)
         */
        const syncSelectedFrameOrNode = () => {
            const selectedState = selectedAtom.get();
            const activeProfile = instanceProfileGroupAtom.getActiveProfile();
            if (!activeProfile) {return;}

            const maybeFrameOrNode = selectedState?.indexToView === instanceProfileGroupAtom.get()?.indexToView
                ? selectedState?.frameOrNode
                : null;

            const getFrame = (frameOrNode: Frame | CallTreeNode | null | undefined) => {
                if (!frameOrNode) {return null;}
                if (frameOrNode instanceof Frame) {return frameOrNode;}
                return frameOrNode.frame;
            };

            const getNode = (frameOrNode: Frame | CallTreeNode | null | undefined) => {
                if (!frameOrNode) {return null;}
                if (frameOrNode instanceof CallTreeNode) {return frameOrNode;}
                return getSelectedNode(frameOrNode, activeProfile);
            };

            /*
             * Delay update of selected node on other flamegraph to prevent
             * from invalidating `hoveredLabel` from views/flamechart-pan-zoom-view.tsx
             */
            setTimeout(() => {
                switch (viewModeAtom.get()) {
                case ViewMode.CHRONO_FLAME_CHART:
                    instanceProfileGroupAtom.setSelectedNode(FlamechartID.CHRONO, getNode(maybeFrameOrNode));
                    break;
                case ViewMode.LEFT_HEAVY_FLAME_GRAPH:
                    instanceProfileGroupAtom.setSelectedNode(FlamechartID.LEFT_HEAVY, getNode(maybeFrameOrNode));
                    break;
                case ViewMode.SANDWICH_VIEW:
                    instanceProfileGroupAtom.setSelectedFrame(getFrame(maybeFrameOrNode));
                    break;
                }
            });
        };
        // Set initial selected node
        syncSelectedFrameOrNode();

        appSettersSet(
            {
                setSelectedFrame: (frame: Frame | null) => {
                    const indexToView = instanceProfileGroupAtom.get()?.indexToView;

                    selectedAtom.unsubscribe(syncSelectedFrameOrNode);
                    selectedAtom.set((frame && indexToView !== undefined) ? { frameOrNode: frame, indexToView } : null);
                    selectedAtom.subscribe(syncSelectedFrameOrNode);

                    instanceProfileGroupAtom.setSelectedFrame(frame);
                },
                setSelectedNode: (id: FlamechartID, selectedNode: CallTreeNode | null) => {
                    const indexToView = instanceProfileGroupAtom.get()?.indexToView;

                    selectedAtom.unsubscribe(syncSelectedFrameOrNode);
                    selectedAtom.set((selectedNode && indexToView !== undefined) ? { frameOrNode: selectedNode, indexToView } : null);
                    selectedAtom.subscribe(syncSelectedFrameOrNode);

                    instanceProfileGroupAtom.setSelectedNode(id, selectedNode);
                },
                setProfileIndexToView: (indexToView: number) => {
                    instanceProfileGroupAtom.setProfileIndexToView(indexToView);
                    if (activeGroupAtom.get()[uuid] !== instanceProfileGroupAtom.getActiveProfile()?.profile.getGroupName()) {
                        activeGroupAtom.set({
                            ...activeGroupAtom.get(),
                            [uuid]: instanceProfileGroupAtom.getActiveProfile()?.profile.getGroupName()
                        });
                    }
                    syncSelectedFrameOrNode();
                },
                setViewMode: (state) => viewModeAtom.set(state),
                setFlamechartHoveredNode: (id, hover) => {
                    const activeProfile = instanceProfileGroupAtom.getActiveProfile();
                    if (!activeProfile) {return;}

                    hoveredAtom.set(hover && { node: hover.node.frame.name, source: activeProfile.profile.getGroupName()});
                    instanceProfileGroupAtom.setFlamechartHoveredNode(id, hover);
                },
                setConfigSpaceViewportRect: instanceProfileGroupAtom.setConfigSpaceViewportRect,
                setLogicalSpaceViewportSize: instanceProfileGroupAtom.setLogicalSpaceViewportSize,
            },
        );


        instanceProfileGroupAtom.subscribe(setInstanceState);
        viewModeAtom.subscribe(setViewModeState);
        loadingAtom.subscribe(syncProfiles);
        indexToViewAtom.subscribe(syncIndexToView);
        selectedAtom.subscribe(syncSelectedFrameOrNode);
        viewModeAtom.subscribe(syncSelectedFrameOrNode);

        return () => {
            instanceProfileGroupAtom.unsubscribe(setInstanceState);
            viewModeAtom.unsubscribe(setViewModeState);
            loadingAtom.unsubscribe(syncProfiles);
            indexToViewAtom.unsubscribe(syncIndexToView);
            selectedAtom.unsubscribe(syncSelectedFrameOrNode);
            viewModeAtom.unsubscribe(syncSelectedFrameOrNode);
        };
    }, []);

    return (
        <div className={style['speedscope-container']}>
            <ApplicationContainer
                glCanvas={canvas}
                canvasContext={canvasContext}
                setGLCanvas={setGLCanvas}
                viewMode={viewMode}
                profileGroup={profileGroupState}
                activeProfileState={activeProfileState}

                {...appSetters}
            />
        </div>
    );
// Override comparison function to hardly ever reload the Speedscope
}, (_prevProps, _nextProps) => true);

export default tilingComponent(Speedscope, "Flamegraph", {
    additionalProps: {
        minHeight: 400,
        minWidth: 540,
    },
})!;

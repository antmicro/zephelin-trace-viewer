/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { useMemo, useState } from "preact/hooks";
import { CallTreeNode, Frame, FrameInfo } from '@speedscope/lib/profile';
import { flattenRecursionAtom, hoveredAtom, profileGroupAtom, selectedAtom, viewModeAtom } from '@speedscope/app-state';
import { FlamechartID, FlamechartViewState, SandwichViewState } from '@speedscope/app-state/profile-group';
import { ViewMode } from '@speedscope/lib/view-mode';
import { Theme } from "@speedscope/views/themes/theme";
import { noop } from "@speedscope/lib/utils";
import { createGetCSSColorForFrame, getFrameToColorBucket } from "@speedscope/app-state/getters";
import { RefObject } from "preact";
import { getInvertedCallerProfile } from "@speedscope/views/inverted-caller-flamegraph-view";
import { getGroupNames, getProfilesForGroup } from "@speedscope/app-state/utils";
import { isOpFrame, normalizeOpName } from "./model";
import Plot, { PlotBaseProps } from "@/plots/base-plot";

/** Provides the view selected in the Speedscope */
export function useView(): { viewMode: ViewMode, activeView: FlamechartViewState | SandwichViewState } | null {
    const activeProfile = profileGroupAtom.getActiveProfile();
    if (!activeProfile) {return null;}

    const viewMode = viewModeAtom.get();
    let activeView: FlamechartViewState | SandwichViewState;
    switch (viewMode) {
    case ViewMode.CHRONO_FLAME_CHART:
        activeView = activeProfile.chronoViewState;
        break;
    case ViewMode.LEFT_HEAVY_FLAME_GRAPH:
        activeView = activeProfile.leftHeavyViewState;
        break;
    case ViewMode.SANDWICH_VIEW:
        activeView = activeProfile.sandwichViewState;
        break;
    }
    return { viewMode, activeView };
}


interface FrameState {
    /** The frame selected in Speedscope */
    frame?: FrameInfo,
    /** The parent of the selected frame */
    parent?: CallTreeNode | null,
}

interface ProfileContext {
    /** Absolute index of this profile within loaded profiles  */
    globalIndex: number,
    /** Map of operation names to their Frame objects representations */
    nameToFrame: Map<string, Frame>;
    /** Map of operation names to their CallTreeNode objects representations */
    nameToNode: Map<string, CallTreeNode>;
    /** Map of operation names to their corresponding colors in Speedscope */
    frameToColor: ((frame: Frame) => string) | null;
}


/** Checks if the currently selected group is a port of  active profile in Speedscope */
const _isPlotActive = (activeGroup: string): boolean => {
    const activeProfileState = profileGroupAtom.getActiveProfile();
    const activeProfile = activeProfileState?.profile;

    return activeProfile?.getGroupName() !== activeGroup;
};

/** Provides the frame selected in the Speedscope, returns statefull object */
export function useFrameProvider() {
    const [frameSt, setFrameSt] = useState<FrameState | undefined>(undefined);
    selectedAtom.subscribe(() => {
        const selectedNode = selectedAtom.get();
        if (selectedNode === null) {
            setFrameSt(undefined);
            return;
        }
        const view = useView();
        if (view === null) {
            setFrameSt(undefined);
            return;
        }
        const profile = profileGroupAtom.getActiveProfile()?.profile;
        if (profile === undefined) {
            setFrameSt(undefined);
            return;
        }
        const { viewMode } = view;
        if (viewMode === ViewMode.SANDWICH_VIEW && selectedNode instanceof Frame) {
            // inverted caller profile is memorized, so it will not be recalculated here
            const callerProf = getInvertedCallerProfile({profile, frame: selectedNode, flattenRecursion: flattenRecursionAtom.get()});
            const callers = callerProf.getAppendOrderCalltreeRoot().children[0].children;
            // Choosing first caller as MODEL events should be a child of only one INFERENCE event
            setFrameSt({frame: selectedNode, parent: callers[0]});
        } else if (viewMode !== ViewMode.SANDWICH_VIEW && selectedNode instanceof CallTreeNode) {
            setFrameSt({frame: selectedNode?.frame, parent: selectedNode?.parent});
        } else {
            setFrameSt(undefined);
            console.debug("Mismatch between viewMode and selected node type, setting frame state to undefined");
            return;
        }
    });

    return { frameSt };
}

/** Callback for plot click event, selects corresponding frame/node in Speedscope */
export function setSelectedFromClick(activeGroup: string, profileLookup: Map<string, ProfileContext[]>) {

    return (point: { name: string, groupName?: string }) => {
        if (!point) {return;}
        const { name } = point;

        const targetGroup = point.groupName ?? activeGroup;
        const profileContexts = profileLookup.get(targetGroup);

        if (!profileContexts || profileContexts.length === 0) {
            console.warn(`No indexed data for group: ${targetGroup}`);
            return;
        }

        // Find the first profile that contains selected operation
        let targetContext: ProfileContext | undefined = profileContexts.find(context => context.nameToFrame.has(name));
        if (!targetContext) {
            console.warn(`Operation "${name}" not found in any profile of group "${targetGroup}"`);
            [targetContext] = profileContexts;

        }

        const { globalIndex, nameToFrame, nameToNode } = targetContext;

        profileGroupAtom.setProfileIndexToView(globalIndex);

        const frame = nameToFrame.get(name);
        if (frame) {profileGroupAtom.setSelectedFrame(frame);}

        const node = nameToNode.get(name);
        const viewMode = viewModeAtom.get();
        const flamechartID = ({
            [ViewMode.CHRONO_FLAME_CHART]: FlamechartID.CHRONO,
            [ViewMode.LEFT_HEAVY_FLAME_GRAPH]: FlamechartID.LEFT_HEAVY,
        } as { [key in keyof typeof ViewMode]?: FlamechartID })[viewMode];

        if (node && flamechartID) {profileGroupAtom.setSelectedNode(flamechartID, node);}
    };
}

/** Event assuming that a frame/node name is contained in 'name' plot data field */
interface FrameEvent {
    /** Name of the frame/node */
    name: string,
    /** Name of the profil the frame comes from */
    sourceProfile?: string
}

/** Callback for Speedscope frame hover event, sets plot annotations according to hovered frame/node */
export const setAnnotationFromHover = <D extends FrameEvent, T extends PlotBaseProps<D>>(
    plotRef: RefObject<Plot<D, T>>,
    activeGroup: string,
) => {
    return () => {
        if (!plotRef.current) {return;}
        const { current: plot } = plotRef;

        plot.annotations.pop();

        if (_isPlotActive(activeGroup)) {
            plot.redraw();
            return;
        }

        const hovered = hoveredAtom.get();
        if (!hovered) {
            plot.redraw();
            return;
        }

        const hoveredFrame = 'frame' in hovered
            ? hovered.frame
            : hovered;

        const hoveredName = normalizeOpName(hoveredFrame.name);
        const d = plot.plotData?.flat().find(({ name }) => name === hoveredName);
        if (d) {plot._addAnnotation(d);}
        else {plot.redraw();}
    };
};

type PlotPropsWithTheme<D> = PlotBaseProps<D> & { theme: Theme };

/** Plot decoration callback, sets SVG colors according to Speedscope theme  */
export const applyFrameColors = <D extends FrameEvent, T extends PlotPropsWithTheme<D>>(
    plotRef: RefObject<Plot<D, T>>,
    activeGroup: string,
    profileLookup: Map<string, ProfileContext[]>,
) => {
    if (_isPlotActive(activeGroup)) {return;}
    return (defaultColor: string) => {
        const { current: plot } = plotRef;
        if (!plot) {return noop;}

        const activeProfile = profileGroupAtom.getActiveProfile()?.profile;
        if (!activeProfile) {return noop;}
        const frameToColorBucket = getFrameToColorBucket(activeProfile);
        const getCSSColorForFrame = createGetCSSColorForFrame({theme: plot.props.theme, frameToColorBucket});

        const nameToFrame = new Map<string, Frame>();
        activeProfile.forEachFrame((frame) => {
            if (!isOpFrame(frame)) {return;}
            const name = normalizeOpName(frame.name);
            if (!nameToFrame.has(name)) {nameToFrame.set(name, frame);}
        });

        const getHoveredFrameName = () => {
            const [annotation] = plot.annotations;
            if (!annotation) {return;}
            const { x, y } = annotation;
            const { name } = plot._findClosestPoint(x, y) ?? {};
            if (name) {
                return normalizeOpName(name);
            }
        };

        const getSelectedFrameName = () => {
            const frameOrNode = selectedAtom.get();
            if (!frameOrNode) {return;}
            const name = frameOrNode instanceof Frame
                ? frameOrNode.name
                : frameOrNode.frame.name;
            if (name) {return normalizeOpName(name);}
        };


        return (selection: d3.Selection<d3.BaseType, any, any, any>) => {
            selection
                .select('path')
                .attr('fill', ({ name }: FrameEvent) => {
                    const ownerContext = profileLookup.get(activeGroup)?.find(c => c.nameToFrame.has(name));
                    if (!ownerContext) {return defaultColor;}

                    const frame = ownerContext.nameToFrame.get(name);
                    if (!frame) {return defaultColor;}

                    return ownerContext.frameToColor?.(frame) ?? defaultColor;
                })
                .attr('stroke-width', ({ name }: FrameEvent) => {
                    if (getHoveredFrameName() === name) {
                        return 4;
                    } else if (getSelectedFrameName() === name) {
                        return 2;
                    }
                    return null;
                })
                .attr('stroke', ({ name }: FrameEvent) => {
                    const isSelected = getSelectedFrameName() === name;
                    const isHovered = getHoveredFrameName() === name;
                    if (isSelected && isHovered) {
                        return plot.props.theme.selectionPrimaryColor;
                    } else if (isSelected) {
                        return plot.props.theme.selectionSecondaryColor;
                    } else if (isHovered) {
                        return plot.props.theme.fgPrimaryColor;
                    }
                    return null;
                });
        };
    };
};

/** Callback for plot point event, sets hovered frame/node in Speedscope */
export const setHoverFromPoint = <D extends FrameEvent, T extends PlotPropsWithTheme<D>>(
    plotRef: RefObject<Plot<D, T>>,
    activeGroup: string,
    profileLookup: Map<string, ProfileContext[]>,
) => {
    return ([coord]: { x: number, y: number }[]) => {
        const { current: plot } = plotRef;
        if (!plot) {return;}

        if (!coord) {
            plot.annotations.pop();
            console.debug("Missing coordinates");
            hoveredAtom.set(null);
            return;
        }

        // find the closes datapoint to the pointer
        const x = plot.xScale.invert(coord.x as d3.NumberValue);
        const y = plot.yScale.invert(coord.y as d3.NumberValue);
        const d = plot._findClosestPoint(x, y);

        // if annotation for the point is already drawn - skip redraw
        if (d === plot.annotations[plot.annotations.length - 1]?._point) {return;}

        plot.annotations.pop();

        if (d) {
            const activeProfileName = profileGroupAtom.getActiveProfile()?.profile.getName();

            const contexts = profileLookup.get(activeGroup) ?? [];
            const ownerContext = contexts.find(c => c.nameToFrame.has(d.name));
            const allProfiles = profileGroupAtom.get()?.profiles;
            const ownerProfileName = (ownerContext && allProfiles)
                ? allProfiles[ownerContext.globalIndex].profile.getName()
                : undefined;

            const displaySource = (ownerProfileName && ownerProfileName !== activeProfileName)
                ? ownerProfileName
                : undefined;
            d.sourceProfile = displaySource;

        }

        plot._addAnnotation(d);

        if (_isPlotActive(activeGroup)) {return;}
        hoveredAtom.set(d ? { name: d.name } as Frame : null);
    };
};

/** Creates frame/node plot callbacks, linking selection, hover, colors with Speedscope and other plots */
export const useFrameCallbacks = <D extends FrameEvent, T extends PlotPropsWithTheme<D>>(
    plotRef: RefObject<Plot<D, T>>,
    groupName: string,
    theme: Theme,
) => {
    const redraw = () => plotRef.current?.redraw();
    const profileLookup = useMemo<Map<string, ProfileContext[]>>(() => {

        const profileGroup = profileGroupAtom.get();
        if (!profileGroup) {return new Map();}

        // Create a lookup that maps group to its profiles and operations they contain
        const lookup = new Map<string, ProfileContext[]>();

        const groupNames = getGroupNames();

        groupNames.forEach(groupName => {
            const groupProfiles = getProfilesForGroup(groupName);
            const allProfiles = profileGroup.profiles;

            const profileContexts: ProfileContext[]  = groupProfiles.map(profileWrapper => {
                const globalIndex = allProfiles.indexOf(profileWrapper);
                const nameToFrame = new Map<string, Frame>();
                const nameToNode = new Map<string, CallTreeNode>();

                profileWrapper.profile.forEachFrame((frame) => {
                    if (!isOpFrame(frame)) {return;}
                    const name = normalizeOpName(frame.name);
                    if (!nameToFrame.has(name)) {nameToFrame.set(name, frame);}
                });

                profileWrapper.profile.forEachCall((node) => {
                    if (!isOpFrame(node.frame)) {return;}
                    const name = normalizeOpName(node.frame.name);
                    if (!nameToNode.has(name)) {nameToNode.set(name, node);}
                }, () => {});

                const frameToColorBucket = getFrameToColorBucket(profileWrapper.profile);
                const frameToColor = createGetCSSColorForFrame({theme, frameToColorBucket});

                return { globalIndex, nameToFrame, nameToNode, frameToColor };
            });


            lookup.set(groupName, profileContexts);
        });

        return lookup;
    }, []);

    return {
        onFrameSelect: redraw,
        onFrameHover: setAnnotationFromHover(plotRef, groupName),
        useClick: () => setSelectedFromClick(groupName, profileLookup),
        decorateSvgSeries: applyFrameColors(plotRef, groupName, profileLookup),
        onPoint: setHoverFromPoint(plotRef, groupName, profileLookup),
    };
};

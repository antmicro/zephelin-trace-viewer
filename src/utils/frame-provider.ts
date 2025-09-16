/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { useState } from "preact/hooks";
import { CallTreeNode, Frame, FrameInfo } from '@speedscope/lib/profile';
import { hoveredAtom, profileGroupAtom, viewModeAtom } from '@speedscope/app-state';
import { FlamechartID, FlamechartViewState, SandwichViewState } from '@speedscope/app-state/profile-group';
import { ViewMode } from '@speedscope/lib/view-mode';
import { Theme } from "@speedscope/views/themes/theme";
import { noop } from "@speedscope/lib/utils";
import { createGetCSSColorForFrame, getFrameToColorBucket } from "@speedscope/app-state/getters";
import { RefObject } from "preact";
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

/** Provides the frame selected in the Speedscope, returns statefull object */
export function useFrameProvider() {
    const [frameSt, setFrameSt] = useState<FrameInfo | undefined>(undefined);
    profileGroupAtom.subscribe(() => {
        const view = useView();
        if (view === null) {
            setFrameSt(undefined);
            return;
        }
        const { viewMode, activeView } = view;
        if (viewMode === ViewMode.SANDWICH_VIEW) {
            setFrameSt((activeView as SandwichViewState)?.callerCallee?.selectedFrame);

        } else {
            setFrameSt((activeView as FlamechartViewState)?.selectedNode?.frame);
        }
    });

    return { frameSt };
}

/** Callback for plot click event, selects corresponding frame/node in Speedscope */
export function setSelectedFromClick() {
    const activeProfileState = profileGroupAtom.getActiveProfile();
    const activeProfile = activeProfileState?.profile;
    if (!activeProfile) {return;}

    const nameToFrame = new Map<string, Frame>();
    const nameToNode = new Map<string, CallTreeNode>();
    activeProfile.forEachFrame((frame) => {
        if (!isOpFrame(frame)) {return;}
        const name = normalizeOpName(frame.name);
        if (!nameToFrame.has(name)) {nameToFrame.set(name, frame);}
    });
    activeProfile.forEachCall(
        (node) => {
            const { frame } = node;
            if (!isOpFrame(frame)) {return;}
            const name = normalizeOpName(frame.name);
            if (!nameToNode.has(name)) {nameToNode.set(name, node);}
        },
        () => {},
    );

    return (point: { name: string }) => {
        if (!point) {return;}
        const { name } = point;

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
}

/** Callback for Speedscope frame hover event, sets plot annotations acording to hovered frame/node */
export const setAnnotationFromHover = <D extends FrameEvent, T extends PlotBaseProps<D>>(plotRef: RefObject<Plot<D, T>>) => {
    return () => {
        if (!plotRef.current) {return;}
        const { current: plot } = plotRef;

        plot.annotations.pop();

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
export const applyFrameColors = <D extends FrameEvent, T extends PlotPropsWithTheme<D>>(plotRef: RefObject<Plot<D, T>>) => {
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
            const activeView = useView()?.activeView;
            if (!activeView) {return;}
            const name = 'hover' in activeView
                ? activeView.selectedNode?.frame.name
                : activeView.callerCallee?.selectedFrame.name;
            if (name) {return normalizeOpName(name);}
        };


        return (selection: d3.Selection<d3.BaseType, any, any, any>) => {
            selection
                .select('path')
                .attr('fill', ({ name }: FrameEvent) => {
                    const frame = nameToFrame.get(name);
                    return frame ? getCSSColorForFrame(frame) : defaultColor;
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
export const setHoverFromPoint = <D extends FrameEvent, T extends PlotPropsWithTheme<D>>(plotRef: RefObject<Plot<D, T>>) => {
    return ([coord]: { x: number, y: number }[]) => {
        const { current: plot } = plotRef;
        if (!plot) {return;}

        plot.annotations.pop();

        if (!coord) {
            console.debug("Missing coordinates");
            hoveredAtom.set(null);
            return;
        }

        // find the closes datapoint to the pointer
        const x = plot.xScale.invert(coord.x as d3.NumberValue);
        const y = plot.yScale.invert(coord.y as d3.NumberValue);
        const d = plot._findClosestPoint(x, y);

        plot._addAnnotation(d);

        const { onFrameHover } = plot.props;
        if (onFrameHover) {hoveredAtom.unsubscribe(onFrameHover);}
        hoveredAtom.set(d ? { name: d.name } as Frame : null);
        if (onFrameHover) {hoveredAtom.subscribe(onFrameHover);}
    };
};

/** Creates frame/node plot callbacks, linking selection, hover, colors with Speedscope and other plots */
export const useFrameCallbacks = <D extends FrameEvent, T extends PlotPropsWithTheme<D>>(plotRef: RefObject<Plot<D, T>>) => {
    const redraw = () => plotRef.current?.redraw();
    return {
        onFrameSelect: redraw,
        onProfileChange: redraw,
        onFrameHover: setAnnotationFromHover(plotRef),
        useClick: setSelectedFromClick,
        decorateSvgSeries: applyFrameColors(plotRef),
        onPoint: setHoverFromPoint(plotRef),
    };
};

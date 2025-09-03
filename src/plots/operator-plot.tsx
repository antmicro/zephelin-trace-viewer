/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with Operator Execution Time plot definition.
 */



import { Theme } from '@speedscope/views/themes/theme';
import { hoveredAtom, profileGroupAtom, selectedAtom, viewModeAtom } from '@speedscope/app-state';
import { CallTreeNode, Frame } from '@speedscope/lib/profile';
import { FlamechartID } from '@speedscope/app-state/profile-group';
import { ViewMode } from '@speedscope/lib/view-mode';
import * as d3 from 'd3';
import { createGetCSSColorForFrame, getFrameToColorBucket } from '@speedscope/app-state/getters';
import { noop } from '@speedscope/lib/utils';
import { OpExecutionEvent } from '../event-types';
import { OpTypeExecutionTimePlot } from './operator-type-plot';
import { BarPlotProps } from './bar-plot';
import { isOpFrame, normalizeOpName } from '@/utils/model';
import { useView } from '@/utils/frame-provider';


interface OpExecutionPlotProps extends BarPlotProps<OpExecutionEvent> {
    theme: Theme,
}

export class OpExecutionTimePlot extends OpTypeExecutionTimePlot<OpExecutionEvent, OpExecutionPlotProps> {
    protected redrawCallback = () => {this.redraw();};
    protected redrawWithAnnotationsCallback = () => {
        this.annotations.pop();

        const hovered = hoveredAtom.get();
        if (!hovered) {
            this.redraw();
            return;
        }

        const hoveredFrame = 'frame' in hovered
            ? hovered.frame
            : hovered;

        const hoveredName = normalizeOpName(hoveredFrame.name);
        const d = this.plotData.flat().find(({ name }) => name === hoveredName);
        if (d) {this._addAnnotation(d);}
    };

    protected subscribed = false;

    override redraw() {
        super.redraw();

        const activeProfileState = profileGroupAtom.getActiveProfile();
        const activeProfile = activeProfileState?.profile;
        if (!activeProfile) {return [];}
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

        const svg = d3.select(this.containerRef.current).select(".svg-plot-area svg");
        svg.on('click', () => {
            const [annotation] = this.annotations;
            if (!annotation) {return;}
            const { x, y } = annotation;
            const point = this._findClosestPoint(x, y);
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
        });
    }

    override render() {
        // Unsubscribe & subscribe to not duplicate listeners
        profileGroupAtom.unsubscribe(this.redrawCallback);
        selectedAtom.unsubscribe(this.redrawCallback);
        hoveredAtom.unsubscribe(this.redrawWithAnnotationsCallback);

        profileGroupAtom.subscribe(this.redrawCallback);
        selectedAtom.subscribe(this.redrawCallback);
        hoveredAtom.subscribe(this.redrawWithAnnotationsCallback);

        return super.render();
    }

    protected override _decorateSvgSeries(color: string) {
        const activeProfile = profileGroupAtom.getActiveProfile()?.profile;
        if (!activeProfile) {return noop;}
        const frameToColorBucket = getFrameToColorBucket(activeProfile);
        const getCSSColorForFrame = createGetCSSColorForFrame({theme: this.props.theme, frameToColorBucket});

        const nameToFrame = new Map<string, Frame>();
        activeProfile.forEachFrame((frame) => {
            if (!isOpFrame(frame)) {return;}
            const name = normalizeOpName(frame.name);
            if (!nameToFrame.has(name)) {nameToFrame.set(name, frame);}
        });

        const getHoveredFrameName = () => {
            const [annotation] = this.annotations;
            if (!annotation) {return;}
            const { x, y } = annotation;
            const { name } = this._findClosestPoint(x, y);
            if (name) {return normalizeOpName(name);}
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
                .attr('fill', ({ name }: OpExecutionEvent) => {
                    const frame = nameToFrame.get(name);
                    return frame ? getCSSColorForFrame(frame) : color;
                })
                .attr('stroke-width', ({ name }: OpExecutionEvent) => {
                    if (getHoveredFrameName() === name) {
                        return 4;
                    } else if (getSelectedFrameName() === name) {
                        return 2;
                    }
                    return null;
                })
                .attr('stroke', ({ name }: OpExecutionEvent) => {
                    const isSelected = getSelectedFrameName() === name;
                    const isHovered = getHoveredFrameName() === name;
                    if (isSelected && isHovered) {
                        return this.props.theme.selectionPrimaryColor;
                    } else if (isSelected) {
                        return this.props.theme.selectionSecondaryColor;
                    } else if (isHovered) {
                        return this.props.theme.fgPrimaryColor;
                    }
                    return null;
                });
        };
    }
}

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with the template for d3-based plot.
 */

import { createRef, JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import * as d3 from 'd3';
import * as fc from 'd3fc';
import { annotationXYThreshold } from 'd3-svg-annotation';
import { CartesianChart, WebglPlotAreaComponent, SvgPlotAreaComponent } from '@d3fc/d3fc-chart/src/cartesian';
import { Selection } from 'd3-selection';

import { StatelessComponent } from '@speedscope/lib/preact-helpers';
import seriesSvgAnnotation from './series-annotation';
import axisLabelHide from './axis-label-hide';
import "@styles/plots.scss";

type ScaleType = d3.ScaleContinuousNumeric<any, any, never>;

/** The properties of threshold type annotation */
export interface ThresholdAnnotationProps {
    x: number,
    y: number,
    dx: number,
    dy: number,
    /** The content and properties of note */
    note: {
        title: string,
        label: string | string[],
        /** Optional padding of the note */
        bgPadding?: number,
        /** The maximum length of the note's line */
        wrap?: number,
        /** The keyword that splits note's content into multiple lines */
        wrapSplitter?: string,
    },
    /** The coordinates of the threshold on Y-axis */
    subject: {
        y1: number,
        y2: number
    },
}

/**
 * The interface with base properties of the plot.
 * @template D The type of data used for drawing a plot.
 */
export interface PlotBaseProps<D> {
    /**
     * The data used to draw a plot.
     *
     * By default, it's a collection of lists, where each list contains data
     * used for drawing one chart of the plot - @see {@link Plot._webglMapping}.
     */
    plotData: (D[])[],
    /** The optional callback run at the end of zoom logic */
    onZoomEnd?: () => void,
}

interface PlotAnnotationData {
    /** The x coordinate of annotation */
    x: number;
    /** The y coordinate of annotation */
    y: number;
    /** The title displayed at the top */
    title: string;
    /** The annotation content */
    note: string;
}

/**
 * The definition of Component with d3-based plot containing basic logic for drawing a plot.
 *
 * It also resolves the CSS variables of the :root element once,
 * before the first rendering, to enable using CSS colors defined for the application.
 *
 * @abstract
 * @template D The type for data used to draw a plot
 * @template T The type of the component properties
 * @extends {Component<RenderableProps<T>>}
 */
export default abstract class Plot<D, T extends PlotBaseProps<D> = PlotBaseProps<D>> extends StatelessComponent<T> {
    /** The reference to div containing whole plot */
    containerRef = createRef<HTMLDivElement>();
    /** The colors defined in CSS, in :root element */
    static cssColors: CSSStyleDeclaration | undefined = undefined;

    /** The scale of X axis after scaling and transposition */
    xScale: ScaleType;
    /** The scale of X axis used as a base for zoom transformations */
    xScaleBase: ScaleType;
    /** The initial scale of X axis */
    protected _xScaleInitial: ScaleType;
    /** The scale of Y axis after scaling and transposition */
    yScale: ScaleType;
    /** The scale of Y axis used as a base for zoom transformations */
    yScaleBase: ScaleType;
    /** The initial scale of X axis */
    protected _yScaleInitial: ScaleType;
    /** The final representation of the plot */
    series: CartesianChart<d3.ScaleLinear<number, number, never>, d3.ScaleLinear<number, number, never>>;
    /** The d3fc-svg element with internal state of zoom */
    d3fcSvgNode: Element & {__zoom?: d3.ZoomTransform};
    /** The object storing currently displayed annotations */
    annotations: ThresholdAnnotationProps[] = [];

    /** The callback executed when the plot container is resized */
    protected resizeOserver = new ResizeObserver((_) => {
        this.redraw();
    });


    /**
     * Returns value of color defined in CSS variable.
     * @param name The name of the CSS variable defining color.
     */
    getCSSColor(name: string): d3.RGBColor | undefined {
        if (Plot.cssColors === undefined) {return;}
        return d3.color(Plot.cssColors.getPropertyValue(name))?.rgb() ?? undefined;
    }

    /**
     * Returns tuple representing color defined in CSS variable.
     * The values in tuple are from range [0, 1].
     * @param color The name of the CSS variable defining color or d3 RGB color object.
     */
    getWebGLColor(color: string | d3.RGBColor): [number, number, number, number] | undefined {
        const c = (typeof(color) === "string") ? this.getCSSColor(color) : color;
        if (c === undefined) {return;}
        return [c.r / 255, c.g / 255, c.b / 255, c.opacity];
    }

    /**
     * Get a color for the plot at the given index
     * @param i Index of the line to color
     */
    getColor(i: number): number[] {
        const defaultColor = [1, 0, 0, 1];

        if (this.props.plotData === undefined) {
            return defaultColor;
        }

        const N = this.props.plotData.length;
        let cssColor: string;
        if (N <= 8) {
            cssColor = [
                "#00E58D",  // gree500
                "#0093E5",  // blue500
                "#E56000",  // orange500
                "#007F8C",  // teal500
                "#159500",  // lime500
                "#DE1135",  // red500
                "#9E1FDA",  // purple500
                "#E59700",  // yellow500
            ][i];
        }
        else if (N <= 10) {
            cssColor = d3.schemeTableau10[i];
        } else {
            const t = (i / (N - 1)) * 0.96 + 0.04;
            cssColor = d3.interpolateTurbo(t);
        }

        return this.getWebGLColor(d3.rgb(cssColor)) ?? defaultColor;
    }

    /**
     * Redraws the plot.
     */
    redraw() {
        d3.select(this.containerRef.current).datum({annotations: this.annotations, data: this.props.plotData}).call(this.series);
        // Set round corners for annotation background
        d3.select(this.containerRef.current).select("rect.annotation-note-bg").attr("rx", 2).attr("ry", 2);
    }

    /**
     * Creates scale for X axis.
     */
    protected abstract _createXScale(): ScaleType;
    /**
     * Creates scale for Y axis.
     */
    protected abstract _createYScale(): ScaleType;

    /**
     * Selects data for WebGL charts.
     *
     * It is used in @see {@link Plot._createSeries}.
     *
     * @param d The data object provided in @see {@link PLot._redraw}.
     * @param index The index of series that will receive the data.
     * @param _series The array with objects creating chart.
     */
    protected _webglMapping(d: { data: (D[])[], annotations: ThresholdAnnotationProps[], }, index: number, _series: object[]): D[] {
        return d.data[index];
    }
    /**
     * Selects data (from object used in @see redraw) for SVG charts.
     *
     * It is used in @see {@link Plot._createSeries}
     *
     * @param d The data object provided in @see {@link PLot._redraw}.
     * @param _index The index of series that will receive the data.
     * @param _series The array with objects creating chart.
     */
    protected _svgMapping(data: { data: (D[])[], annotations: ThresholdAnnotationProps[] }, _index: number, _series: object[]): ThresholdAnnotationProps[] {
        return data.annotations;
    }

    /**
     * Creates objects drawing WebGL charts.
     */
    protected abstract _createWebglSeries(): object[];

    /**
     * Creates additional objects drawing SVG charts.
     */
    protected _createSvgSeries(): object[] {
        return [];
    }

    /**
     * Finds the closest point to the provided coordinates.
     */
    protected _findClosestPoint(_x: number, _y: number): D | null | undefined {
        return null;
    }

    /**
     * Creates data for annotation based on found point (@see Plot._findClosesPoint).
     */
    protected _annotationData(_d: D): PlotAnnotationData | null {
        return null;
    }

    /**
     * Adds annotation based on provided datapoint.
     */
    protected _addAnnotation(d: D | null | undefined) {
        if (!d) {
            console.debug("Cannot find the closest point");
            this.redraw();
            return;
        }

        const annotationData = this._annotationData(d);

        if (!annotationData) {
            console.debug("No annotation data received");
            this.redraw();
            return;
        }

        const xDomain = this.xScale.domain();
        const yDomain = this.yScale.domain();
        const yRange = this.yScale.range() as [number, number];

        const annotationX = Math.max(Math.min(annotationData.x, xDomain[1]), xDomain[0]);
        const xMult = (annotationX < (xDomain[1] + xDomain[0]) / 2) ? 1 : -1;

        const annotationY = Math.max(Math.min(annotationData.y, yDomain[1]), yDomain[0]);
        this.annotations.push(
            {
                x: annotationX,
                y: annotationY,
                dx: xMult * 20,
                dy: ((annotationY - yDomain[0]) / (yDomain[1] - yDomain[0]) >= 0.5) ? 15 : -15,
                note: {
                    title: annotationData.title,
                    label: annotationData.note,
                    wrapSplitter: "\n",
                    bgPadding: 5,
                },
                subject: {
                    y1: yRange[0],
                    y2: yRange[1],
                },
            },
        );

        this.redraw();
    }

    /**
     * Creates the pointer which displays annotations.
     *
     * It requires following methods to return valid data:
     * @see {@link Plot._findClosestPoint}
     * @see {@link Plot._annotationData}
     */
    protected _createPointer(): ((s: Selection<d3.BaseType, any, any, any>) => void) | null {
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
        return fc.pointer().on("point", ([coord]: {x: number, y: number}[]) => {
            this.annotations.pop();

            if (!coord) {
                console.debug("Missing coordinates");
                this.redraw();
                return;
            }

            // find the closes datapoint to the pointer
            const x = this.xScale.invert(coord.x as d3.NumberValue);
            const y = this.yScale.invert(coord.y as d3.NumberValue);
            const d = this._findClosestPoint(x, y);

            this._addAnnotation(d);
        });
    }

    /**
     * Creates the zoom logic.
     *
     * It restricts the domain to the initial one apart from the upper limit of X axis.
     *
     */
    protected _createZoom() {
        let overflow = false;
        let prevK = 1;
        let newXDom: [number, number];
        let newYDom: [number, number];

        return d3.zoom()
            .on("zoom", (event: {transform: d3.ZoomTransform}) => {
                newXDom = event.transform.rescaleX(this.xScaleBase).domain() as [number, number];
                newYDom = event.transform.rescaleY(this.yScaleBase).domain() as [number, number];
                const newK = event.transform.k;
                const currXDom = this.xScale.domain() as [number, number];
                const currYDom = this.yScale.domain() as [number, number];
                if (newXDom[0] < this._xScaleInitial.domain()[0]) {
                    newXDom[0] = this._xScaleInitial.domain()[0];
                    overflow = true;
                    console.debug("overflow: x too small");
                    if (prevK === newK) {
                        newXDom[1] = newXDom[0] + (currXDom[1] - currXDom[0]);
                    }
                }
                if (newYDom[0] < this._yScaleInitial.domain()[0]) {
                    newYDom[0] = this._yScaleInitial.domain()[0];
                    overflow = true;
                    console.debug("overflow: y too small");
                    if (prevK === newK) {
                        newYDom[1] = newYDom[0] + (currYDom[1] - currYDom[0]);
                    }
                }
                if (newYDom[1] > this._yScaleInitial.domain()[1]) {
                    newYDom[1] = this._yScaleInitial.domain()[1];
                    overflow = true;
                    console.debug("overflow: y too big");
                    if (prevK === newK) {
                        newYDom[0] = newYDom[1] - (currYDom[1] - currYDom[0]);
                    }
                }

                this.xScale.domain(newXDom);
                this.yScale.domain(newYDom);
                prevK = newK;
                this.redraw();
            })
            .on("end", (_event) => {
                if (overflow) {
                    this.xScaleBase.domain(newXDom);
                    this.yScaleBase.domain(newYDom);
                    this.d3fcSvgNode.__zoom = new d3.ZoomTransform(1, 0, 0);
                }
                this.redraw();
                if (this.props.onZoomEnd) {
                    this.props.onZoomEnd();
                }
            });
    }

    setScale({xDomain, yDomain}: {xDomain?: [number, number], yDomain?: [number, number]}) {
        if (xDomain) {
            this.xScale.domain(xDomain);
        }
        if (yDomain) {
            this.yScale.domain(yDomain);
        }

        if (xDomain || yDomain) {
            this.xScaleBase.domain(this.xScale.domain());
            this.yScaleBase.domain(this.yScale.domain());
            this.d3fcSvgNode.__zoom = new d3.ZoomTransform(1, 0, 0);
            this.redraw();
        }
    }

    /**
     * Creates the annotations.
     */
    protected _createAnnotations() {
        return seriesSvgAnnotation()
            .notePadding(15)
            .type(annotationXYThreshold);

    }

    /**
     * Returns label for X axis.
     */
    protected _xLabel(): string | null {
        return null;
    }

    /**
     * Returns label for Y axis.
     */
    protected _yLabel(): string | null {
        return null;
    }

    /**
     * Creates the plot representation with zoom and annotations.
     */
    protected _createSeries() {
        // Disable due to the d3fc any type usage
        /* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */

        const zoom = this._createZoom();
        const pointer = this._createPointer();

        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        this.series = fc.chartCartesian(
            {
                xScale: this.xScale, yScale: this.yScale,
                xAxis: {bottom: scale => axisLabelHide(fc.axisBottom(scale))},
                yAxis: {left: scale => axisLabelHide(fc.axisLeft(scale)).series(this.series)},
            },
        ).yOrient("left")
            .xTickFormat((d: number) => d)
            .decorate((sel: Selection<d3.BaseType, any, any, any>) => {
                const s = sel.enter()
                    .select("d3fc-svg.plot-area")
                    .on("measure.range", (event: {detail: {width: number, height: number}}) => {
                        this.xScaleBase.range([0, event.detail.width]);
                        this.yScaleBase.range([event.detail.height, 0]);
                    });

                if (zoom) {
                    s.call(zoom);
                }
                if (pointer) {
                    /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
                    s.call(pointer);
                }
            });

        const xLabel = this._xLabel();
        if (xLabel) { this.series.xLabel(xLabel); }
        const yLabel = this._yLabel();
        if (yLabel) { this.series.yLabel(yLabel); }

        const webglSeries = this._createWebglSeries();
        if (webglSeries.length > 0) {
            this.series.webglPlotArea(
                fc.seriesWebglMulti()
                    .series(webglSeries)
                    .mapping(this._webglMapping.bind(this)) as WebglPlotAreaComponent,
            );
        }

        const svgSeries = this._createSvgSeries().concat(this._createAnnotations());
        if (svgSeries.length > 0) {
            this.series.svgPlotArea(
                fc.seriesSvgMulti()
                    .series(svgSeries)
                    .mapping(this._svgMapping.bind(this)) as SvgPlotAreaComponent,
            );
        }
    }

    /**
     * Method used to create and render plot.
     */
    createChart(): void {
        if (this.containerRef.current === undefined) {
            return;
        }

        this.xScale = this._createXScale();
        this.yScale = this._createYScale();
        this.xScaleBase = this.xScale.copy();
        this.yScaleBase = this.yScale.copy();
        this._xScaleInitial = this.xScale.copy();
        this._yScaleInitial = this.yScale.copy();

        this._createSeries();
        this.redraw();
    }

    /**
     * Returns initial scale of both axes.
     */
    originalDomain(): {xDomain: [number, number], yDomain: [number, number]} {
        return {
            xDomain: this._xScaleInitial.domain() as [number, number],
            yDomain: this._yScaleInitial.domain() as [number, number],
        };
    }


    componentDidMount(): void {
        Plot.cssColors ??= window.getComputedStyle(document.documentElement);
        this.createChart();

        for (const tag of (this.containerRef.current?.getElementsByClassName("svg-plot-area") ?? [])) {
            if (tag.tagName === "D3FC-SVG") {
                this.d3fcSvgNode = tag;
                break;
            }
        }
    }

    componentDidUpdate(): void {
        this.createChart();
    }

    componentWillUnmount(): void {
        this.containerRef.current?.remove();
    }

    render(): JSX.Element {
        // Register resize observer which redraws the plot
        useEffect(() => {
            if (this.containerRef.current !== null) {
                this.resizeOserver.observe(this.containerRef.current);
            }
            // Disconnect all elements on cleanup
            return () => this.resizeOserver.disconnect();
        }, []);

        const fullStyle = {
            width: "100%",
            height: "100%",
        };
        return (
            <div ref={this.containerRef} style={fullStyle} />
        );
    }
}

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with RAM overview plot with additional buttons used for zooming on the selected memory region.
 */

import { memo, RefObject } from "preact/compat";
import { useRef } from "preact/hooks";

import styles from '@styles/memory-panel.module.scss';
import PanelTemplate from "../common";
import { CommonPlotProps, dataProvider } from ".";
import { TotalMemoryPlot } from "@/plots/memory-plot";
import tilingComponent, { CSS_ENABLING_OVERFLOW } from "@/utils/tiling-component";


function toHex(n: number) {
    return `0x${n.toString(16)}`;
}

interface ZoomButton {
    name: string,
    percent?: number,
    addr?: number,
    onClick: (e: Event) => void,
    selectButton: (ref: RefObject<HTMLButtonElement>) => void,
    additionalClass?: string
}

const ZoomButton = memo((props: ZoomButton) => {
    const ref = useRef<HTMLButtonElement>(null);
    const additionalData: string[] = [];
    props.percent && additionalData.push(`${props.percent.toFixed(2)}%`);
    props.addr && additionalData.push(toHex(props.addr));
    return (
        <button ref={ref} className={styles['range-selector'] + " " + (props.additionalClass ?? "")} onClick={(e) => {props.onClick(e); props.selectButton(ref);}}>
            <span className={styles.title}>{props.name}</span>
            {(additionalData.length > 0) ? <span>{additionalData.join(', ')}</span> : undefined}
        </button>
    );
});

/**
 * The component with plot representing RAM and button to zoom on the selected region.
 */
const RAMOverview = memo(({ assignedMemory, addrToRange, addrToProps, plotData, totalMemory, memoryRegionName }: CommonPlotProps) => {
    const plotRef = useRef<TotalMemoryPlot | undefined>();
    const selectButtonsRef = useRef<HTMLDivElement | null>(null);

    if (assignedMemory === 0) { console.info("Size of statically assigned memory is missing"); }

    const zoomOn = (addr: number) => {
        const plot = plotRef.current;
        if (plot === undefined) { console.info("Plot is not defined, zoom will not be applied"); return; }

        plot.setScale({yDomain: addrToRange[addr]});
    };

    /** Selects (adds class "selected") button that triggered the event */
    const selectButton = (ref: RefObject<HTMLButtonElement>) => {
        resetSelectedButton();
        ref.current?.classList.add(styles.selected);
    };
    /** Unselects (removes class "selected") all buttons */
    const resetSelectedButton = () => {
        const s = styles.selected;
        for (const e of selectButtonsRef.current?.getElementsByClassName(s) ?? []) {
            e.classList.remove(s);
        }
    };

    return (
        <PanelTemplate>
            <div className={styles['ram-overview-content']}>
                <TotalMemoryPlot ref={plotRef} plotData={plotData} addrToRange={addrToRange} assignedMemory={assignedMemory} totalMemory={totalMemory} memoryNameFunc={memoryRegionName} onZoomEnd={() => resetSelectedButton()} />
                <div ref={selectButtonsRef} className={styles['ram-overview-selectors']}>
                    <ZoomButton
                        name="whole graph" percent={100}
                        onClick={() => {plotRef.current?.setScale(plotRef.current?.originalDomain() ?? {});}}
                        selectButton={selectButton} additionalClass={styles.selected} />
                    <div className={styles.divider} />
                    {Object.keys(addrToProps).map(v => Number.parseInt(v)).sort().reverse().map((addr) => <ZoomButton
                        name={
                            addrToProps[addr].threadName ?
                                `${addrToProps[addr].threadName} thread` :
                                (addrToProps[addr].symbol ?? addrToProps[addr].region ?? toHex(addr))}
                        addr={addr}
                        percent={addrToProps[addr].ramPercent}
                        onClick={() => zoomOn(addr)}
                        selectButton={selectButton} />)
                    }
                </div>
            </div>
            <div className={styles.legend}>
                <span><div className={styles.square} style={{backgroundColor: 'var(--colors-lime)'}} /> free</span>
                <span><div className={styles.square} style={{backgroundColor: 'var(--colors-red)'}} /> allocated</span>
                <span><div className={styles.square} style={{backgroundColor: 'var(--colors-orange)'}} /> statically allocated</span>
            </div>
        </PanelTemplate>
    );
});


export default tilingComponent(RAMOverview, "RAM Overview", {
    dataProvider: dataProvider,
    additionalProps: {
        contentClassName: CSS_ENABLING_OVERFLOW,
        minHeight: 460,
        minWidth: 350,
    },
})!;

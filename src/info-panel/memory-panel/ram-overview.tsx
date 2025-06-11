/**
 * The module with RAM overview plot with additional buttons used for zooming on the selected memory region.
 */

import { JSX } from "preact" ;

import { useRef, useEffect, useState } from "preact/hooks";
import styles from '@styles/memory-panel.module.scss';
import { CommonPlotProps } from ".";
import { TotalMemoryPlot } from "@/plots/memory-plot";


/**
 * The component with plot representing RAM and button to zoom on the selected region.
 */
export default function RAMOverview({ data, assignedMemory, addrToRange, plotData, totalMemory, memoryRegionName }: CommonPlotProps): JSX.Element |undefined {
    const plotRef = useRef<TotalMemoryPlot | undefined>();
    const selectButtonsRef = useRef<HTMLDivElement | null>(null);

    if (assignedMemory === 0) { console.info("Size of statically assigned memory is missing"); }

    const zoomOn = (addr: number) => {
        const plot = plotRef.current;
        if (plot === undefined) { console.info("Plot is not defined, zoom will not be applied"); return; }

        plot.setScale({yDomain: addrToRange[addr]});
    };

    const addresses = Array.from(new Set(data.map(v => v.memory_addr)).values()).sort().reverse();

    /** Selects (adds class "selected") button that triggered the event */
    const selectButton = (e: Event) => {
        resetSelectedButton();
        if (e.target instanceof HTMLButtonElement) {
            e.target?.classList.add(styles.selected);
        }
    };
    /** Unselects (removes class "selected") all buttons */
    const resetSelectedButton = () => {
        const s = styles.selected;
        for (const e of selectButtonsRef.current?.getElementsByClassName(s) ?? []) {
            e.classList.remove(s);
        }
    };

    const [buttonTextsSt, setButtonTextsSt] = useState<string[]>(addresses.map(v => memoryRegionName(v)));
    useEffect(() => {
        // Hook called when this component is rendered
        setButtonTextsSt(addresses.map(v => memoryRegionName(v)));
    }, []);

    return (
        <div className={styles['ram-overview-content']}>
            <TotalMemoryPlot ref={plotRef} plotData={plotData} addrToRange={addrToRange} assignedMemory={assignedMemory} totalMemory={totalMemory} memoryNameFunc={memoryRegionName} onZoomEnd={resetSelectedButton} />
            <div ref={selectButtonsRef} className={styles['ram-overview-selectors']}>
                {addresses.map((addr, i) => <button onClick={(e) => {zoomOn(addr); selectButton(e);}}>{buttonTextsSt[i]}</button>)}
                <button onClick={() => {plotRef.current?.setScale(plotRef.current?.originalDomain() ?? {}); resetSelectedButton();}}>
                    Reset
                </button>
            </div>
        </div>
    );
}

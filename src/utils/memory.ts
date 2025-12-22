/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module with utilities for metadata memory management.
 */

import { getMetadataForGroup } from '@speedscope/app-state/utils';
import { MemoryEventName, MemoryEventType, MemoryMetadataEvents, MemoryStatMemEventName, MemorySymbolsEventName, ThreadNameEventName } from '@/event-types';
import { MemoryPanelProps } from '@/info-panel/memory-panel';


export interface MemoryPlotData {
    /** The timestamp of the data in ms */
    ts: number,
    /** The used memory in bytes */
    used: number,
    /** The unused memory in bytes */
    unused: number,
    /** The base (in bytes) defining the size of previous (with smaller address) memory regions */
    base: number,
    /** The percentage of used memory in the region */
    percentage: number,
    /** The address of the memory region */
    address: number,
};

interface PreparedMemoryData {
    /** Prepared data for memory plots */
    data: MemoryPlotData[][],
    /** Calculated total size of the RAM */
    totalMemory: number,
    /** Mapping of the memory region address to the range in RAM */
    addrToRange: Record<number, [number, number]>
}


/**
 * Prepares data for memory plots.
 *
 * @param metadata The list with memory metadata events.
 * @param staticallyAssignedMem The amount (in bytes) of statically assigned memory.
 */
export function prepareMemoryPlotData(metadata: MemoryEventType[], staticallyAssignedMem: number): PreparedMemoryData {
    // Sort events so they are grouped by memory regions and oredered by time
    const sortedEvents = metadata.sort((a, b) => {
        const addrDiff = a.memory_addr - b.memory_addr;
        if (addrDiff === 0) {
            return a.ts - b.ts;
        };
        return addrDiff;
    });

    // Calculate max memory
    const s = new Set<number>();
    let totalMemory = staticallyAssignedMem;
    sortedEvents.forEach((v) => {
        if (!s.has(v.memory_addr)) {
            totalMemory += v.used + v.unused;
            s.add(v.memory_addr);
        }
    });

    const addrToRange = {};
    const maxTs = Math.max(...sortedEvents.map(v => v.ts)) / 1000;

    const data: MemoryPlotData[][] = [[
        // Creates green background
        {ts: 0, used: totalMemory - staticallyAssignedMem, unused: 0, base: staticallyAssignedMem, percentage: 100, address: -1},
        {ts: maxTs, used:  totalMemory - staticallyAssignedMem, unused: 0, base: staticallyAssignedMem, percentage: 100, address: -1},
    ], [
        // Draws statically allocated memory
        {ts: 0, used: staticallyAssignedMem, unused: 0, base: 0, percentage: 100, address: -1},
        {ts: maxTs, used: staticallyAssignedMem, unused: 0, base: 0, percentage: 100, address: -1},
    ]];

    /*
     * Divide distinct memory regions into separate arrays
     * and calculate additional fields like base and percentage
     */
    let eventData: MemoryPlotData[] = [];
    let lData = data[1];
    sortedEvents.forEach((e, i, arr) => {
        eventData.push({
            ts: e.ts / 1000,  // Convert to ms
            base: lData[0].base + lData[0].used + lData[0].unused,
            used: e.used,
            unused: e.unused,
            percentage: e.used / (e.used + e.unused) * 100,
            address: e.memory_addr,
        });

        // All data from the current memory region were processed
        if (i + 1 >= arr.length || e.memory_addr !== arr[i + 1].memory_addr) {
            // Calculate range of the current memory ragion
            addrToRange[e.memory_addr] = [eventData[0].base / totalMemory * 100, (eventData[0].base + eventData[0].used + eventData[0].unused) / totalMemory * 100];

            data.push(eventData);
            eventData = [];
            lData = data[data.length - 1];
        }
    });

    return {data, totalMemory, addrToRange};
}

/**
 * Creates name for the memory region.
 *
 * @param addr The address of memory region.
 * @param data Memory metadata events.
 * @param threadName The mapping of addresses to thread names.
 * @param memorySymbol The mapping of addresses to their symbols.
 * @param addrToRange The mapping of addresses to their percentage range of whole memory.
 * @param [withAddr=true] Whether name should include the region address.
 * @param [ramPercentage=true] Whether name should include the percentage of whole memory.
 * @returns The name of given memory region.
 */
export function memoryRegionName(
    addr: number, data: MemoryEventType[], threadName: Record<number, string>,
    memorySymbol: Record<number, string>, addrToRange: Record<number, [number, number]>,
    withAddr = true, ramPercentage = true,
): string {
    const additionalData: string[] = [];
    if (ramPercentage)
    {additionalData.push(`${(addrToRange[addr][1] - addrToRange[addr][0]).toFixed(2)}% of RAM`);}
    if (withAddr)
    {additionalData.push(`0x${addr.toString(16)}`);}
    let additionalStr = '';
    if (additionalData.length > 0) {
        additionalStr = ` (${additionalData.join(', ')})`;
    }
    const v = data.find(v => v.memory_addr === addr);

    if (v?.for_thread_id && v.for_thread_id in threadName) {
        // use thread name
        return `${threadName[v.for_thread_id]} thread${additionalStr}`;
    } else if (addr in memorySymbol) {
        // use symbol from zephyr.elf
        return `${memorySymbol[addr]}${additionalStr}`;
    } else {
        // fallback to region type and address
        return `${v?.memory_region}${additionalStr}`;
    }
};


export function getMemoryData(groupName: string): MemoryPanelProps | undefined {
    const metadata = getMetadataForGroup(groupName) as MemoryMetadataEvents[];
    const fullData = (metadata ?? []).filter((v) => v.name === MemoryEventName).map((value) => {
        return {
            name: value.name,
            ts: +value.ts.toFixed(3),
            ...value.args,
        } as MemoryEventType;
    });
    // Extract unique triplets of memory events
    const memoryEventTypes = new Set<string>();
    fullData.forEach((v) => memoryEventTypes.add(`${v.memory_region};${v.memory_addr};${v.for_thread_id}`));
    let availableData = Array.from(memoryEventTypes).map(v => {
        const [r, a, t] = v.split(";");
        return {memory_region: r, memory_addr: +a, for_thread_id: +t};
    });

    // Prepare mapping of mem addresses to their symbols
    const memorySymbols = metadata?.find(v => v.name === MemorySymbolsEventName)?.args ?? {};

    const staticallyAssignedMem = metadata?.find(v => v.name === MemoryStatMemEventName)?.args ?? 0;

    // Prepare mapping of thread ID to thread name
    const threadNameData = metadata?.filter(v => v.name === ThreadNameEventName).reduce<Record<number, string>>((pV, cV, _a, _b) => {
        pV[cV.tid] = cV.args.name;
        return pV;
    }, {});
    if (threadNameData) {
        // Move main thread stack to the top of the list
        const mainThreadID = Object.entries(threadNameData).find(([_, v]) => v === "main")?.[0];
        const mainThreadEventIndex = availableData.findIndex(v => v.for_thread_id === +(mainThreadID ?? -1));
        if (mainThreadEventIndex !== -1) {
            availableData = [availableData[mainThreadEventIndex]].concat(
                availableData.filter((_v, i) => i !== mainThreadEventIndex),
            );
        }
    }

    if (!fullData || fullData.length === 0) { return; }
    const {data: plotData, addrToRange, totalMemory} = prepareMemoryPlotData(fullData, staticallyAssignedMem);
    return {fullData, plotData, threadNameData, memorySymbols, addrToRange, staticallyAssignedMem, totalMemory};
}


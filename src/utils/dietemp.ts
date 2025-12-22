/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { getMetadataForGroup } from "@speedscope/app-state/utils";
import { TempEventName, TempEventType, MetadataTempType } from "../event-types";

/** Provides temperature plot data */
export function getDieTempData(groupName: string): { fullData: TempEventType[][] } | undefined {
    const metadata = getMetadataForGroup(groupName) as MetadataTempType[];

    const dataMap = new Map<number,TempEventType[]>();

    /*
     * Split events containing multiple temperature readings into
     * multiple events with a single reading. Divide them into separate
     * arrays using reading idx as well.
     */
    (metadata ?? []).filter((v) => v.name === TempEventName).forEach((event) => {
        event.args.die_temp.forEach((temp, idx) => {
            if (dataMap.get(idx) === undefined) {
                dataMap.set(idx, []);
            }
            dataMap.get(idx)?.push({
                ts: +event.ts.toFixed(3),
                temp: temp,
                sensor: `die-temp${idx}`,
            } as TempEventType);
        });
    });

    if(dataMap.size === 0) {return undefined;}

    // Delete sensor values if all of them are equal to null
    dataMap.forEach((data, k) => {
        const temps = new Set(data.map(v => v.temp));
        if (temps.size === 1 && temps.values().next().value === null) {
            dataMap.delete(k);
        }
    });

    return {fullData: Array.from(dataMap.values())};
}

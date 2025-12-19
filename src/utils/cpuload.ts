/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { getMetadataForGroup  } from "@speedscope/app-state/utils";
import { CPULoadEventName, CPULoadEventType, MetadataCPULoadType } from "../event-types";

/** Provides CPU load plot data */
export function getCPULoadData(groupName: string): {fullData: CPULoadEventType[]} | undefined {
    const metadata = getMetadataForGroup(groupName) as MetadataCPULoadType[];
    const fullData = (metadata ?? []).filter((v) => v.name === CPULoadEventName).map((value) => {
        return {
            ts: +value.ts.toFixed(3),
            ...value.args,
        } as CPULoadEventType;
    });
    if (fullData.length === 0) {return;}
    return {fullData};
}

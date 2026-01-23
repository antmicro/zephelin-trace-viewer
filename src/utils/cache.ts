/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


export type GroupDataStore = Record<string, Record<string, any>>;

let _cache = {} as GroupDataStore;

/**
 * Global cache with component data for different groups.
 */
export const GroupDataCache = {
    getOrCreateEntry<T>(title: string, groupName: string, provider: (n: string) => T): T {
        _cache[title] ??= {};

        if (groupName in _cache[title]) {
            return _cache[title][groupName] as T;
        }

        const entry = provider(groupName);
        _cache[title][groupName] = entry;

        if (!entry) {
            console.info("Problems with retreiving plot data");
        }
        return entry;
    },

    clear(): void {
        _cache = {};
    },

};

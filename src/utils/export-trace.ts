/*
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module exporting the loaded trace to a file.
 */

import { profileGroupAtom, rawTefEventsAtom } from '@speedscope/app-state';
import { exportProfileGroup } from '@speedscope/lib/file-format';
import { saveFile } from './save-file';

/**
 * Exports the loaded profiles in the Speedscope file format.
 */
export function exportSpeedscopeFile(): void {
    const profileGroup = profileGroupAtom.get();

    if (!profileGroup) {
        return;
    }

    const { name, indexToView, profiles } = profileGroup;
    const file = exportProfileGroup({
        name,
        indexToView,
        profiles: profiles.map(profile => profile.profile),
    });
    const nameWithoutExt = file.name ? file.name.split('.')[0] : 'profile';

    saveFile(
        `${nameWithoutExt.replace(/\W+/g, '_')}.speedscope.json`,
        JSON.stringify(file),
    );
}

/**
 * Exports trace in a TEF format, together with metadata events.
 */
export function exportTefFile(): void {
    saveFile('exported.tef', JSON.stringify(rawTefEventsAtom.get(), null, 2));
}

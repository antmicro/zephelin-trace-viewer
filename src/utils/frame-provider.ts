/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


import { useState } from "preact/hooks";
import { FrameInfo } from '@speedscope/lib/profile';
import { profileGroupAtom, viewModeAtom } from '@speedscope/app-state';
import { FlamechartViewState, SandwichViewState } from '@speedscope/app-state/profile-group';
import { ViewMode } from '@speedscope/lib/view-mode';

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

/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * The module implementing additional information panel.
 * It, based on user activity and used profile, creates additional panels
 * like memory usage or model information.
 */

import styles from "@styles/info-panel.module.scss";
import PanelTemplate from './common';
import ModelInfoPanel from './model-panel';
import { useFrameProvider } from '@/utils/frame-provider';
import tilingComponent, { TilingComponent } from '@/utils/tiling-component';
import { isInferenceFrame, isOpFrame } from "@/utils/model";


interface GenericInfoProps {
    /** The information displayed by GenericInfo component */
    info: string,
}

/** The basic information panel with simple text */
export function GenericInfo({info}: GenericInfoProps) {
    return <p className={styles["generic-info"]}>{info}</p>;
}

/**
 * The info panel managing all subpanels based on loaded profile or selected event.
 */
function InfoPanel({ tilingComponent }: { tilingComponent: TilingComponent<any>}) {
    const { frameSt } = useFrameProvider();

    const renderContent = () => {
        if (isOpFrame(frameSt?.frame)) {
            return <ModelInfoPanel
                frame={frameSt.frame}
                parent={isInferenceFrame(frameSt?.parent?.frame) ? frameSt.parent.frame : undefined}
                tilingComponent={tilingComponent} />;
        }

        const msg = frameSt
            ? "The chosen event does not contain additional information"
            : "For more info, choose an event";

        return <GenericInfo info={msg} />;
    };

    return (
        <PanelTemplate tilingComponent={tilingComponent}>
            {renderContent}
        </PanelTemplate>
    );
}

export default tilingComponent(InfoPanel, "Details")!;

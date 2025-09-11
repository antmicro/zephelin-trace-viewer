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
import tilingComponent from '@/utils/tiling-component';
import { isOpFrame } from "@/utils/model";


interface GenericInfoProps {
    /** The information displayed by GenericInfo component */
    info: string,
}

/** The basic information panel with simple text */
function GenericInfo({info}: GenericInfoProps) {
    return (
        <PanelTemplate>
            <p className={styles["generic-info"]}>{info}</p>
        </PanelTemplate>
    );
}


/**
 * The info panel managing all subpanels based on loaded profile or selected event.
 */
function InfoPanel() {
    const { frameSt } = useFrameProvider();

    if (isOpFrame(frameSt)) {
        return <ModelInfoPanel frameArgs={frameSt.args} />;
    } else if (frameSt) {
        return <GenericInfo info="The chosen event does not contain additional information" />;
    }

    return <GenericInfo info="For more info, choose an event" />;
}

export default tilingComponent(InfoPanel, "Details")!;

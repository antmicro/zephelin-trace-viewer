/**
 * The module implementing additional information panel.
 * It, based on user activity and used profile, creates additional panels
 * like memory usage or model information.
 */

import styles from "@styles/info-panel.module.scss";
import PanelTemplate from './common';
import ModelInfoPanel from './model-panel';
import { useFrameProvider } from '@/utils/frame-provider';
import { ModelEventArgs, ModelEventName, SpeedscopeFrameArgs } from '@/event-types';
import tilingComponent from '@/utils/tiling-component';


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

    if (typeof(frameSt?.key) === "string" && frameSt?.key?.startsWith(`${ModelEventName}::`)) {
        return <ModelInfoPanel frameArgs={frameSt.args as SpeedscopeFrameArgs<ModelEventArgs>} />;
    } else if (frameSt) {
        return <GenericInfo info="The chosen event does not contain additional information" />;
    }

    return <GenericInfo info="For more info, chose an event" />;
}

export default tilingComponent(InfoPanel, "Additional Info", {enablePopout: true})!;

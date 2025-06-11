import { memo } from "preact/compat";
import PanelTemplate from "./common";
import { getDieTempData } from "@/utils/dietemp";
import { DieTempPlot } from "@/plots/temp-plot";
import tilingComponent, { CSS_ENABLING_OVERFLOW } from "@/utils/tiling-component";
import { TempEventType } from "@/event-types";

export interface DieTempPanelProps {
    /** The data for DIE temperature plot */
    fullData: TempEventType[][],
}

/**
 * The panel with DIE temperatures plot,
 * it's created directly from the tiling layout only when metadata changes.
 */
const DieTempPanel = memo(({fullData}: DieTempPanelProps) => {
    return (
        <PanelTemplate>
            <DieTempPlot plotData={fullData} />
        </PanelTemplate>
    );
});

export default tilingComponent(DieTempPanel, "DIE temperature", {
    dataProvider: getDieTempData,
    contentClassName: CSS_ENABLING_OVERFLOW,
    minHeight: 150,
    minWidth: 150,
})!;

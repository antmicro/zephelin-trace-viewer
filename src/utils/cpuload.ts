import { metadataAtom } from "@speedscope/app-state";
import { CPULoadEventName, CPULoadEventType, MetadataCPULoadType } from "../event-types";

/** Provides CPU load plot data */
export function getCPULoadData(): {fullData: CPULoadEventType[]} | undefined {
    const metadata = metadataAtom.get() as ((MetadataCPULoadType)[] | null);
    const fullData = (metadata ?? []).filter((v) => v.name === CPULoadEventName).map((value) => {
        return {
            ts: +value.ts.toFixed(3),
            ...value.args,
        } as CPULoadEventType;
    });
    if (fullData.length === 0) {return;}
    return {fullData};
}

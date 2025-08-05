import { metadataAtom } from "@speedscope/app-state";
import { TempEventName, TempEventType, MetadataTempType } from "../event-types";

/** Provides temperature plot data */
export function getDieTempData() {
    const metadata = metadataAtom.get() as ((MetadataTempType)[] | null);

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

    if(dataMap.size === 0) {return;}

    // Delete sensor values if all of them are equal to null
    dataMap.forEach((data, k) => {
        const temps = new Set(data.map(v => v.temp));
        if (temps.size === 1 && temps.values().next().value === null) {
            dataMap.delete(k);
        }
    });

    return {fullData: Array.from(dataMap.values())};
}

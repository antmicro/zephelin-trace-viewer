/**
 * The module with temp plot definition.
 */


import { TempEventType } from '../event-types';
import { LinePlot } from './line-plot';

export class DieTempPlot extends LinePlot<TempEventType> {
    protected _xAccess(e: TempEventType): number {
        return e.ts / 1e3;
    }
    protected _yAccess(e: TempEventType): number {
        return e.temp;
    }

    protected _xLabel(): string | null {
        return "Timestamp [ms]";
    }

    protected _yLabel(): string | null {
        return "Temperature [℃]";
    }

    protected _annotationNote(d: TempEventType): { title: string; note: string; } {
        const temp = this._yAccess(d);
        const tempNote = temp ? `${temp.toFixed(2)}℃` : 'not provided';
        return {
            title: d.sensor,
            note: `Timestamp ${this._xAccess(d).toFixed(2)}ms\n`
                + `Temp ${tempNote}\n`,
        };
    }
}

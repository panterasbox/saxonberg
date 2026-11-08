/**
 * ObservationWell — ⭐⭐ **how a commons SEES its groundwater** (water-supply
 * D13): a narrow cased hole that draws nothing, sunk only so somebody can
 * drop a tape down it and read where the water stands. An aquifer's level
 * is hidden from every other sense — a farmer's own well tells him his
 * pump is sucking air, never that the valley is going down — and this is
 * the one instrument that reads it (`analyze water-table`).
 *
 * It cites its aquifer directly (load on use: the well follows ITS
 * reference outward). Holds no state of its own.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class ObservationWell extends Thing {
  static fieldMeta: FieldMeta = {
    aquifer: { persistent: true, authorable: true, ref: 'identity:relation' },
    collarM: { persistent: true, authorable: true },
  };

  /** The aquifer it reads — a commons row path, `''` = none yet. */
  protected aquifer = '';

  /** The elevation of its collar, m ASL — the tape is read down from here. `-1` = its room's. */
  protected collarM = -1;

  constructor() {
    super();
    this.fixedInPlace = true;
  }

  public getAquifer(): string {
    return this.aquifer;
  }
  public setAquifer(value: string): void {
    this.aquifer = typeof value === 'string' ? value.trim() : '';
  }
  public getCollarM(): number {
    return this.collarM;
  }
  public setCollarM(value: number): void {
    this.collarM = Number.isFinite(value) ? value : -1;
  }
}

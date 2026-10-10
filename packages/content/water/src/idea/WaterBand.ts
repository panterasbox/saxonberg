/**
 * WaterBand — a band of the sea, with the column under it: how deep, what
 * the bottom is, and how far the wind has had to blow over it.
 *
 * The kernel `Band` carries what any medium's band carries (a set, a
 * lean, hazards, stock, a character); the water tier adds the three facts
 * the sea state and the sounding are derived from. Nothing here authors a
 * sea state: `WaterExpanse.seaStateAt` works it out.
 */

import Band from '@saxonberg/server/mud/platform/idea/Band';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class WaterBand extends Band {
  static fieldMeta: FieldMeta = {
    depthM: { persistent: true, authorable: true },
    fetchKm: { persistent: true, authorable: true },
    bottom: { persistent: true, authorable: true },
  };

  /** Depth of water, metres; `null` to take the expanse's. */
  protected depthM: number | null = null;
  /** How far the wind blows over open water to reach here, km; `null` = the expanse's. */
  protected fetchKm: number | null = null;
  /** What the lead brings up — *sand*, *shell*, *mud*, *rock*. */
  protected bottom = '';

  public getDepthM(): number | null { return this.depthM; }
  public setDepthM(v: number | null): void {
    this.depthM = v === null || v === undefined ? null : Math.max(0, Number(v));
  }

  public getFetchKm(): number | null { return this.fetchKm; }
  public setFetchKm(v: number | null): void {
    this.fetchKm = v === null || v === undefined ? null : Math.max(0, Number(v));
  }

  public getBottom(): string { return this.bottom; }
  public setBottom(v: string): void { this.bottom = (v ?? '').trim(); }
}

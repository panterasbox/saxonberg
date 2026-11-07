/**
 * Aquifer — ⭐⭐ **the water under a valley, as a level that moves**
 * (water-supply D13). A record with a capacity, a surface that stands at
 * `tableM` when full and sinks toward `bottomM` as it is drawn, recharged by
 * a fraction of the rain over its area and by what irrigation percolates
 * down into it, and drawn by every well that cites it. ⭐ Its level is
 * HIDDEN: no sense reads it, and the one instrument that does is an
 * observation well (`analyze water-table`). A farmer learns the valley is
 * going down when his pump sucks air.
 *
 * A system's class, the realm's instances (the `Watercourse` rule): rows live
 * in the commons at `/stuff/idea/Aquifer/<key>`.
 *
 * ⭐ Staged or live is the row's (D30): this plain class reverts to full
 * when it unloads — Rejection's shallow till, which nothing in the realm
 * draws hard; a valley whose draws are the commons' history names
 * {@link PersistentAquifer}.
 *
 * Not ground's `BodyRegister` (recharge-free by design; a document per
 * draw): an aquifer is ONE level, reconciled.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type Locality from '@saxonberg/server/mud/platform/idea/Locality';

/** The longest unwatched gap a recharge is integrated over (a year). */
const MAX_GAP_S = 365 * 86_400;

export default class Aquifer extends NamedMixin(SingletonMixin(Idea)) {
  static fieldMeta: FieldMeta = {
    areaKm2: { persistent: true, authorable: true },
    capacityM3: { persistent: true, authorable: true },
    rechargeFraction: { persistent: true, authorable: true },
    tableM: { persistent: true, authorable: true },
    bottomM: { persistent: true, authorable: true },
    localityPath: { persistent: true, authorable: true, ref: 'identity:relation' },
    drawnM3: { persistent: true, runtimeState: true },
    aquiferStamp: { persistent: true, runtimeState: true },
  };

  /** The area whose rain reaches it, km². */
  protected areaKm2 = 1;
  /** What it holds full, m³. */
  protected capacityM3 = 1_000_000;
  /** The share of the rain on its area that reaches it (most runs off or transpires). */
  protected rechargeFraction = 0.1;
  /** Where its water stands when full, m ASL. */
  protected tableM = 0;
  /** Where it gives out, m ASL — a well whose bottom is above this goes dry first. */
  protected bottomM = -20;
  /** Whose rain it is — the locality over it. */
  protected localityPath = '';
  /** How far below full it stands, m³. */
  protected drawnM3 = 0;
  /** When it was last reconciled, game s. `null` = never. */
  protected aquiferStamp: number | null = null;

  private _locality: Locality | null = null;

  /** A shared commons record is never culled while a well reads it. */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'an aquifer is a shared commons record' };
  }

  public setAreaKm2(v: number): void {
    this.areaKm2 = Number.isFinite(v) && v > 0 ? v : 1;
  }
  public setCapacityM3(v: number): void {
    this.capacityM3 = Number.isFinite(v) && v > 0 ? v : 1;
  }
  public setRechargeFraction(v: number): void {
    this.rechargeFraction = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.1;
  }
  public setTableM(v: number): void {
    this.tableM = Number.isFinite(v) ? v : 0;
  }
  public setBottomM(v: number): void {
    this.bottomM = Number.isFinite(v) ? v : -20;
  }
  public setLocalityPath(v: string): void {
    this.localityPath = typeof v === 'string' ? v.trim() : '';
    this._locality = null;
  }
  public getBottomM(): number {
    return this.bottomM;
  }
  public getTableM(): number {
    return this.tableM;
  }
  public getCapacityM3(): number {
    return this.capacityM3;
  }

  /** How much it holds now, m³. */
  public levelM3(nowS: number): number {
    this.reconcile(nowS);
    return Math.max(0, this.capacityM3 - this.drawnM3);
  }

  /**
   * ⭐ Where its water stands now, m ASL — from `tableM` full down to
   * `bottomM` empty, linear in what is left (an unconfined aquifer's
   * surface falls as it drains).
   */
  public surfaceM(nowS: number): number {
    const frac = this.levelM3(nowS) / this.capacityM3;
    return this.bottomM + (this.tableM - this.bottomM) * frac;
  }

  /**
   * Bring the level up to `nowS`: the rain over its area since the last
   * read × its recharge fraction refills it, never past full. The locality
   * is resolved on the async path ({@link ensureLocality}); unresolved, the
   * stamp does not advance, so no backlog is ever read as a dry month.
   */
  public reconcile(nowS: number): void {
    if (this.aquiferStamp === null) {
      this.aquiferStamp = nowS;
      return;
    }
    const from = Math.max(this.aquiferStamp, nowS - MAX_GAP_S);
    if (!(nowS > from)) return;
    if (this.localityPath !== '' && this._locality === null) return;
    const fell = WeatherApi.precipitationBetween(
      Quantity.of(from, 's'),
      Quantity.of(nowS, 's'),
      this._locality,
    );
    const m3 = (fell.liquid.rawValue() / 1000) * this.areaKm2 * 1_000_000 * this.rechargeFraction;
    this.drawnM3 = Math.max(0, this.drawnM3 - m3);
    this.aquiferStamp = nowS;
  }

  /** Load the locality whose rain it is — once, on use. */
  public async ensureLocality(): Promise<void> {
    if (this.localityPath === '' || this._locality !== null) return;
    this._locality = await StuffApi.singleton<Locality>(this.localityPath).catch(() => null);
  }

  /**
   * A well (or a running pump) took `litres` at `atS`. Returns what the
   * aquifer actually gave: nothing below its bottom.
   */
  public recordDraw(litres: number, atS: number): number {
    this.reconcile(atS);
    const m3 = Math.max(0, litres) / 1000;
    const given = Math.min(m3, Math.max(0, this.capacityM3 - this.drawnM3));
    this.drawnM3 += given;
    return given * 1000;
  }

  /** Water that percolated down past a field's roots — it comes back (D15). */
  public creditPercolation(litres: number): void {
    this.drawnM3 = Math.max(0, this.drawnM3 - Math.max(0, litres) / 1000);
  }

  /** Stand it `m3` below full — the setter a drive stages a dry year with (founder `eval`), as a tank's `setLevelM3` is. */
  public setDrawnM3(m3: number): void {
    this.drawnM3 = Math.max(0, Math.min(this.capacityM3, Number.isFinite(m3) ? m3 : 0));
  }
}

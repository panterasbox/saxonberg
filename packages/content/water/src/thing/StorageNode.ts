/**
 * StorageNode — **a reservoir at a built or found elevation**, and the
 * build's one genuinely stateful thing.
 *
 * A reservoir, a water tower and a cistern are the same object with
 * different numbers. What distinguishes a tower is that its elevation
 * was **built** rather than found — and that is not a type, it is a
 * field.
 *
 * ## What storage is actually for
 *
 * Not volume. Two things:
 *
 *  - **head** — a tank above you gives every tap below it pressure with
 *    no pump running, which is how a **flat city gets a gravity
 *    conduit**, and Terminus is flat by construction;
 *  - **buffer** — it decouples a steady supply from a peaky demand.
 *
 * ⭐ A tower is why water still runs during a power cut, for a few
 * hours. **The buffer size is the outage tolerance**, and that is the
 * whole design conversation about how big to build one.
 *
 * ## ⚠ Why this is state, and nothing else in the build is
 *
 * Everything else here derives: flow from the weather, direction from
 * elevation, contamination from distance. A **level cannot**, because
 * outflow depends on what players drew, and no function of time knows
 * that. So it is state plus a stamp on a `Persistable` host — and it is
 * the one place in this build where a restart could lose something, so
 * it is the one place that persists.
 *
 * Roof-catchment harvesting falls out with no new machinery: catchment
 * area × precipitation, which is {@link CultivableMixin}'s expression
 * pointed at a roof.
 *
 * See [docs/subsystems/watershed.md].
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import type { SupplyReport, SupplyShares, SupplyState, WaterSupply } from '@saxonberg/server/mud/lib/supply/SupplyState';
import type { ShiftEntry } from '@saxonberg/server/mud/lib/employment/Roster';
import { ShiftSchedule } from '@saxonberg/server/mud/lib/employment/ShiftSchedule';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Piecewise } from '@saxonberg/server/mud/lib/Trajectory';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Conduit from './Conduit';

/**
 * What shape of store it is.
 *
 * ⚠ Presentation and authoring convenience only — **no behaviour reads
 * this**. A tower behaves like a tower because its `elevationM` is
 * above the ground it serves, not because somebody typed `tower`. Keep
 * it that way: the moment a rule branches on this field, elevation has
 * stopped being the mechanism.
 */
export type StorageKind = 'reservoir' | 'tower' | 'cistern';

/** What a fill or a draw actually did. */
export interface StorageMovement {
  /** Cubic metres that actually moved. */
  m3: number;
  /** Watts-seconds spent lifting it, or 0 when it arrived by gravity. */
  joules: number;
  /** The level afterwards, in m³. */
  levelM3: number;
}

// PersistableMixin OUTERMOST — the documented host rule.
//
// ⭐ Singleton since the water-supply build: a premises cites the tank by
// its row path and a tap loads it on use; the lane that props it adopts the
// same instance.
const StorageNodeBase = PersistableMixin(
  SwitchableMixin(SingletonMixin(Thing)),
);

export default class StorageNode extends StorageNodeBase implements WaterSupply {
  static fieldMeta: FieldMeta = {
    storageKind: { persistent: true, authorable: true },
    capacityM3: { persistent: true, authorable: true },
    elevationM: { persistent: true, authorable: true },
    servesExtent: { persistent: true, authorable: true },
    // ⚠ THE stateful field. Everything else in this build derives; a
    // level cannot, because outflow depends on what players drew.
    levelM3: { persistent: true },
    fillsFrom: { persistent: true, authorable: true, ref: 'identity:relation' },
    fillRateM3S: { persistent: true, authorable: true },
    schedule: { persistent: true, authorable: true },
    drawM3S: { persistent: true, authorable: true },
    shares: { persistent: true, authorable: true },
    initialLevelM3: { persistent: true, authorable: true },
    levelStamp: { persistent: true, runtimeState: true },
  };

  /** Presentation only — see {@link StorageKind}. */
  public storageKind: StorageKind = 'reservoir';

  /** Cubic metres it holds when full. */
  public capacityM3 = 0;

  /**
   * Metres above sea level of the **water surface** when full.
   *
   * For a found reservoir this is the terrain. For a tower it is the
   * terrain plus however high it was built, and that difference is the
   * entire reason to build one.
   */
  public elevationM = 0;

  /** The template-path prefix it supplies head to, longest-prefix. */
  public servesExtent = '';

  /** Cubic metres currently in it. */
  public levelM3 = 0;

  /**
   * ⭐ The supply it fills from (water-supply D5) — a main's path. `''` = a
   * tank nothing fills (the shipped behavior: what is in it is all there is).
   */
  public fillsFrom = '';

  /** How fast it fills while its fill is on and its source delivers, m³/s. */
  public fillRateM3S = 0;

  /**
   * ⭐ The turncock's fills — the employment `ShiftEntry` shape as DATA:
   * which days, which hours the valve to the tank is open. Empty with a
   * `fillsFrom` = it fills whenever its source delivers.
   */
  public schedule: ShiftEntry[] = [];

  /**
   * The district's household draw on it, m³/s — the authored rate, **never
   * a sum over live taps** (load-on-use: a tank does not know its taps).
   */
  public drawM3S = 0;

  /** How it shares a shortage — a tank drawn down gives everybody less. */
  public shares: SupplyShares = 'proportion';

  /** The level a tank first stands at, m³ — authored; the level then moves. */
  public initialLevelM3 = -1;

  /** When the level was last reconciled, game s. `null` = never. */
  public levelStamp: number | null = null;

  /** The source, loaded on use. */
  private _source: Stuff | null = null;

  public getStorageKind(): StorageKind {
    return this.storageKind;
  }
  public setStorageKind(value: StorageKind): void {
    this.storageKind =
      value === 'tower' || value === 'cistern' ? value : 'reservoir';
  }

  public getCapacityM3(): number {
    return this.capacityM3;
  }
  public setCapacityM3(value: number): void {
    this.capacityM3 = Number.isFinite(value) && value > 0 ? value : 0;
    if (this.levelM3 > this.capacityM3) this.levelM3 = this.capacityM3;
  }

  public getElevationM(): number {
    return this.elevationM;
  }
  public setElevationM(value: number): void {
    this.elevationM = Number.isFinite(value) ? value : 0;
  }

  public getServesExtent(): string {
    return this.servesExtent;
  }
  public setServesExtent(value: string): void {
    this.servesExtent = value;
  }

  public getLevelM3(): number {
    return this.levelM3;
  }
  public setLevelM3(value: number): void {
    this.levelM3 = !Number.isFinite(value) || value < 0
      ? 0
      : Math.min(value, this.capacityM3);
  }

  /** How full it is, `0..1`. Zero capacity reads empty, never full. */
  public fullness(): number {
    return this.capacityM3 > 0 ? this.levelM3 / this.capacityM3 : 0;
  }

  /** Whether `path` lies in the extent this store supplies head to. */
  public serves(path: string): boolean {
    if (this.servesExtent === '' || path === '') return false;
    return path === this.servesExtent || path.startsWith(this.servesExtent + '/');
  }

  /**
   * ⭐ **Metres of head this store gives a place** — the number that
   * lets a flat city run a gravity main.
   *
   * Resolved against the served ground's own zone elevation, so a tower
   * thirty metres above a town at five metres gives that town
   * thirty-five metres of head and every tap below it pressure with no
   * pump running. `null` when the ground has no elevation to compare
   * against: unknown, not zero.
   */
  public async headOverServedGroundM(): Promise<number | null> {
    const zone = await ZoneApi.resolveEnclosingZoneForPath(this.servesExtent);
    const groundM = zone === null
      ? null
      : await zone.lookupField<number>('elevation');
    if (groundM === null) return null;
    return this.elevationM - groundM;
  }

  /**
   * Fill it by `m3` lifted from water sitting at `sourceElevationM`, and
   * report what that cost.
   *
   * ⭐ **Filling costs energy exactly when the source is below the
   * tank**, at `ρ·g·Δh·V / η` — the same equation as the pump and the
   * turbine, for the third time in this build. Water rising costs
   * power; water falling makes it; and a tower is the machine that
   * turns the first into the second later.
   *
   * Headroom-capped, so a full tank quietly refuses the surplus rather
   * than pretending to take it.
   */
  public fillFrom(m3: number, sourceElevationM: number): StorageMovement {
    const headroom = Math.max(0, this.capacityM3 - this.levelM3);
    const moved = Math.min(Math.max(0, m3), headroom);
    if (moved <= 0) {
      return { m3: 0, joules: 0, levelM3: this.levelM3 };
    }
    this.levelM3 += moved;
    const lift = this.elevationM - sourceElevationM;
    const joules = lift <= 0 ? 0 : liftJoules(moved, lift);
    return { m3: moved, joules, levelM3: this.levelM3 };
  }

  /**
   * Take `m3` out. Level-capped, so a store that has run down delivers
   * what it has and says so rather than going negative — which is the
   * whole point of a buffer being finite.
   */
  public draw(m3: number): StorageMovement {
    const taken = Math.min(Math.max(0, m3), this.levelM3);
    this.levelM3 -= taken;
    return { m3: taken, joules: 0, levelM3: this.levelM3 };
  }

  /**
   * ⭐ How long this buffer holds out at a given draw, in seconds.
   *
   * **The buffer size is the outage tolerance** — this is that sentence
   * as a method, and it is the number a town actually argues about when
   * deciding how big to build. `Infinity` at zero draw; zero when it is
   * already empty.
   */
  public getFillsFrom(): string {
    return this.fillsFrom;
  }
  public setFillsFrom(value: string): void {
    this.fillsFrom = typeof value === 'string' ? value.trim() : '';
    this._source = null;
  }
  public setFillRateM3S(value: number): void {
    this.fillRateM3S = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public getSchedule(): readonly ShiftEntry[] {
    return this.schedule;
  }
  public setSchedule(value: ShiftEntry[] | null): void {
    this.schedule = Array.isArray(value) ? value : [];
  }
  public getDrawM3S(): number {
    return this.drawM3S;
  }
  public setDrawM3S(value: number): void {
    this.drawM3S = Number.isFinite(value) && value > 0 ? value : 0;
  }
  public setShares(value: SupplyShares): void {
    this.shares = value === 'priority' ? 'priority' : 'proportion';
  }
  public setInitialLevelM3(value: number): void {
    this.initialLevelM3 = Number.isFinite(value) ? value : -1;
  }

  // ---------- ⭐ the level, reconciled on read (water-supply D5) ----------

  /**
   * ⭐⭐ Bring the level up to `nowS`: inflow over the schedule's on-windows
   * while the source delivered, minus the district's draw, clamped to the
   * tank. Integrated over the gap in hour steps (the clamp needs the
   * order), never sampled at the read — an outage in the night shorts the
   * morning's fill whether anybody was there or not.
   *
   * The source's delivery is its own record when it keeps one (a main's
   * delivery log); a source not yet loaded counts as delivering. The first
   * read stamps and stands the tank at its authored first level.
   */
  public reconcileLevel(nowS: number): void {
    if (this.levelStamp === null) {
      if (this.initialLevelM3 >= 0 && this.levelM3 <= 0) this.setLevelM3(this.initialLevelM3);
      this.levelStamp = nowS;
      return;
    }
    const from = this.levelStamp;
    if (!(nowS > from)) return;
    const windows = this.fillsFrom === '' || this.fillRateM3S <= 0
      ? []
      : this.schedule.length === 0
        ? [{ fromS: from, toS: nowS }]
        : new ShiftSchedule(this.schedule).windowsBetween(from, nowS);
    const delivery = this.sourceDelivery(from, nowS);
    const STEP = 3600;
    let level = this.levelM3;
    let w = 0;
    for (let t = from; t < nowS; t += STEP) {
      const end = Math.min(nowS, t + STEP);
      let fillS = 0;
      while (w < windows.length && windows[w]!.toS <= t) w++;
      for (let k = w; k < windows.length && windows[k]!.fromS < end; k++) {
        const a = Math.max(t, windows[k]!.fromS);
        const b = Math.min(end, windows[k]!.toS);
        if (b <= a) continue;
        fillS += delivery === null ? b - a : this.deliveredSeconds(delivery, a, b);
      }
      level += fillS * this.fillRateM3S - (end - t) * this.drawM3S;
      level = Math.max(0, Math.min(this.capacityM3, level));
    }
    this.levelM3 = level;
    this.levelStamp = nowS;
  }

  /** Seconds of `[a, b)` the source delivered, off its 0/1 trajectory. */
  private deliveredSeconds(delivery: Piecewise, a: number, b: number): number {
    let n = 0;
    const STEP = 600;
    for (let t = a; t < b; t += STEP) {
      const end = Math.min(b, t + STEP);
      n += (end - t) * (delivery.at((t + end) / 2) >= 0.5 ? 1 : 0);
    }
    return n;
  }

  /** The source's delivery record over the gap, or `null` (counts as on). */
  private sourceDelivery(fromS: number, toS: number): Piecewise | null {
    // ⭐ A main keeps its own delivery record; the water pack reads its own
    // class, no shape guessing.
    const src = this._source;
    return src instanceof Conduit ? src.deliveryTrajectory(fromS, toS) : null;
  }

  /** Load the source on use (follow the authored ref outward). */
  private async ensureSource(): Promise<void> {
    if (this.fillsFrom === '' || this._source !== null) return;
    try {
      this._source = await StuffApi.singleton(this.fillsFrom);
    } catch {
      this._source = null;
    }
  }

  // ---------- ⭐ the WaterSupply a premises cites (water-supply D3) ----------

  /** Why it gives nothing: empty is `dry`. */
  public supplyStateNow(): SupplyState | null {
    this.reconcileLevel(WorldClockApi.getNow().rawValue());
    return this.levelM3 <= 0 ? 'dry' : null;
  }

  /**
   * ⭐ A tank drawn low gives everybody less (D6, `proportion`): a full tank
   * gives all; below a fifth, the share falls with the level.
   */
  public async shareFor(_landUse: string): Promise<number> {
    await this.ensureSource();
    this.reconcileLevel(WorldClockApi.getNow().rawValue());
    if (this.capacityM3 <= 0) return 1;
    return Math.max(0, Math.min(1, this.fullness() / 0.2));
  }

  /**
   * The tank's water surface, m ASL: its base elevation plus how deep it
   * stands (a tower's `elevationM` is where its floor sits — as it fills,
   * the head rises with it).
   */
  public async supplyHeadM(): Promise<number | null> {
    await this.ensureSource();
    this.reconcileLevel(WorldClockApi.getNow().rawValue());
    return this.elevationM + this.depthM();
  }

  /** How deep the water stands in it, m — a 4 m-deep tank shape assumed. */
  private depthM(): number {
    return this.fullness() * 4;
  }

  /** A draw takes litres from the level, as far as there are any. */
  public drawL(litres: number): number {
    this.reconcileLevel(WorldClockApi.getNow().rawValue());
    return this.draw(Math.max(0, litres) / 1000).m3 * 1000;
  }

  public availableL(): number {
    this.reconcileLevel(WorldClockApi.getNow().rawValue());
    return this.levelM3 * 1000;
  }

  /** ⭐ A tank holds its main's water: its chemistry is the main's (D8). */
  public async readWaterChemistry(): Promise<{ pH: number; hardnessDgh: number; salinityPpt: number } | null> {
    await this.ensureSource();
    const src = this._source;
    return src instanceof Conduit ? src.readWaterChemistry() : null;
  }

  public async supplyReport(nowS: number): Promise<SupplyReport> {
    await this.ensureSource();
    this.reconcileLevel(nowS);
    const state = this.supplyStateNow();
    return {
      label: this.getPresentation(),
      state,
      lines: [
        `holds ${this.levelM3.toFixed(1)} of ${this.capacityM3.toFixed(0)} m³`,
        `its water stands at ${(this.elevationM + this.depthM()).toFixed(1)} m`,
      ],
    };
  }

  public outageToleranceS(drawM3S: number): number {
    if (drawM3S <= 0) return Number.POSITIVE_INFINITY;
    return this.levelM3 / drawM3S;
  }
}

/** `ρ·g·Δh·V / η` — the joules to raise `m3` cubic metres by `liftM`. */
function liftJoules(m3: number, liftM: number): number {
  const rho = BiomeApi.densityOf('water').rawValue();
  const g = BiomeApi.getRootBiome().getDefaultGravity()?.rawValue() ?? 9.81;
  const eta = Math.max(0.05, dial(AppSettingKeys.waterPumpEfficiency, 0.6));
  return (rho * g * liftM * m3) / eta;
}

/** Numeric AppSetting read with a seeded-literal fallback. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

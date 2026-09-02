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
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

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
const StorageNodeBase = PersistableMixin(
  SwitchableMixin(DetailedMixin(Thing)),
);

export default class StorageNode extends StorageNodeBase {
  static fieldMeta: FieldMeta = {
    storageKind: { persistent: true, authorable: true },
    capacityM3: { persistent: true, authorable: true },
    elevationM: { persistent: true, authorable: true },
    servesExtent: { persistent: true, authorable: true },
    // ⚠ THE stateful field. Everything else in this build derives; a
    // level cannot, because outflow depends on what players drew.
    levelM3: { persistent: true },
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

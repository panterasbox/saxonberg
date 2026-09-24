/**
 * Wood — **a place that is ground with a standing cover of trees.**
 *
 * ⭐ Roots go INTO the ground. A clearing in a wood is not a room with a
 * stand-fixture in it; it is soil that the sky fills and a stand drinks,
 * and what stands on it is a fact about the place. So a Wood is the
 * `Field` shape over the singleton cell:
 *
 *     PersistableMixin(StandMixin(SoilMixin(ReservedMixin(SingletonCartesianLocation))))
 *
 * - **`SingletonCartesianLocation`**, not the permissive base: an
 *   authored clearing is ONE row at a coordinate in its wood's zone,
 *   reached by an exit — the singleton cell. `PersistentCartesianLocation`
 *   states the rule for the durable version: *a durable room over the
 *   permissive base would silently share ONE `holder_snapshots` scope
 *   across every mint*. The Wood is that class's shape with two mixins
 *   inside the outermost `Persistable`, which is exactly why it cannot
 *   `extend` it. No `WarrenMember`: a clearing lives in a zone, not in a
 *   holding.
 * - **`SoilMixin(ReservedMixin(…))`** — the ground half, named first as
 *   an intermediate (the Field/GardenBed rule: inference through nested
 *   generic mixin factories collapses to `never`). The derived half of
 *   soil only. ⚠ The note that used to sit here — *"the seeded
 *   `GroundCharacter` is farming's, and a pack may not import another
 *   pack's `src/`"* — is out of date in BOTH halves: the character is
 *   `/system/ground`'s now (dirt is there whether or not anybody farms
 *   it), and a pack may import another pack's `src/` given a declared
 *   dependency. So a Wood reading its own seeded ground is available
 *   whenever forestry wants it; what it gets today for free is the
 *   FLOOR's read (`look ground` in a wood answers through rung 3), which
 *   is what the ground build's AC 14 asks for. A Wood's reserves are installed
 *   from its area at registration (idempotently — a restored Wood keeps
 *   its reserves; *a reserve is state*), rain-fed and generous: the LIMIT
 *   is the increment, not husbandry.
 * - **`StandMixin`** over the soil because it drinks it (the Sward rule).
 * - **`PersistableMixin`** OUTERMOST — the host rule.
 *
 * ## How it is minted and restored
 *
 * An exit's destination resolves through `resolveLanding` →
 * `StuffApi.singletonOrClone` → `singleton()`: **restore when a
 * `holder_snapshots` record exists under the room's scope, else seed the
 * born-with `props:` (the panel) and capture the first record.** So on a
 * fresh boot the row's `mix:` hydrates and is captured; on every later
 * boot the record wins and the authored block is inert — *the row is
 * what the stand STARTED as; the record is what it has become*.
 *
 * ## The soil's three hooks, as Field answers them
 *
 * `watershedScope()` returns itself (a place is its own scope);
 * `soilCatchmentAreaM2()` returns `areaM2` (every square metre catches
 * rain); `soilWaterDemandPerGameDay()` returns the STAND's transpiration
 * — and only that. A Panel standing in the room is its own soil
 * checkpoint: the stools drink the panel's water, not the room's, so
 * nobody double-bills. **A Wood's soil is drunk by its standards; a
 * Panel's by its stools.**
 *
 * See [docs/subsystems/forestry.md].
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { ReservedMixin, Reserve } from '@saxonberg/server/mud/lib/reserve';
import {
  SoilMixin,
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_RESERVE_THEME,
} from '@saxonberg/server/mud/lib/husbandry/Soil';
import { StandMixin } from '../lib/Stand';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** Litres a square metre of loam holds at field capacity (Field's figure). */
const LITRES_PER_M2_LOAM = 45;

// The ground half first, named — the Field/GardenBed rule.
const WoodGround = SoilMixin(ReservedMixin(SingletonCartesianLocation));
// The stand goes OVER the soil because it drinks it (the Sward rule).
// Persistable OUTERMOST — the host rule.
const WoodBase = PersistableMixin(StandMixin(WoodGround));

export default class Wood extends WoodBase {
  static fieldMeta: FieldMeta = {
    woodName: { persistent: true, authorable: true },
    areaM2: { persistent: true, authorable: true },
  };

  /** What the wood this clearing belongs to is called — for prose. */
  public woodName = '';

  /**
   * Square metres of ground. The rain catchment, and what sizes the
   * reserves. Defaults to a 10 m cell; authored when a clearing is
   * bigger than its cell.
   */
  public areaM2 = 100;

  public getWoodName(): string {
    return this.woodName;
  }

  public setWoodName(value: string): void {
    this.woodName = value ?? '';
  }

  public getAreaM2(): number {
    return this.areaM2;
  }

  public setAreaM2(value: number): void {
    this.areaM2 = Math.max(0, value);
  }

  // ---------- the three hooks SoilMixin asks of its host ----------

  /** A clearing IS a place, so it is its own watershed scope. */
  protected override watershedScope(): (Stuff & Container) | null {
    const self = this as unknown as Stuff;
    return MixinApi.isContainer(self) ? (self as unknown as Stuff & Container) : null;
  }

  /** Every square metre of it catches rain. */
  public override soilCatchmentAreaM2(): number {
    return this.areaM2;
  }

  /** What drinks this soil is the stand rooted in it — and only that. */
  public override soilWaterDemandPerGameDay(): number {
    return this.standTranspirationPerGameDay();
  }

  /**
   * Install the ground's two reserves from its area — idempotent, so a
   * restored Wood keeps what its record says and an authored `reserves:`
   * block wins over the default. Moisture at half, nitrogen at sixty per
   * cent of a capacity nothing here draws (a wood's litter cycles it;
   * the panels' stools draw their own panel's).
   */
  public installWoodReserves(): void {
    if (this.areaM2 <= 0) return;
    if (!this.hasReserve(SOIL_MOISTURE_RESERVE_KEY)) {
      const litres = this.areaM2 * LITRES_PER_M2_LOAM;
      this.setReserve(
        new Reserve(
          SOIL_MOISTURE_RESERVE_KEY,
          Quantity.of(litres, 'L'),
          Quantity.of(litres / 2, 'L'),
          SOIL_RESERVE_THEME,
          null,
        ),
      );
    }
    if (!this.hasReserve(SOIL_NITROGEN_RESERVE_KEY)) {
      this.setReserve(
        new Reserve(
          SOIL_NITROGEN_RESERVE_KEY,
          Quantity.of(100, '%'),
          Quantity.of(60, '%'),
          SOIL_RESERVE_THEME,
          null,
        ),
      );
    }
  }

  /**
   * An authored clearing stands itself up: the reserves its area calls
   * for, and the sky edge learning where it is. `Persistable`'s driver
   * does nothing here — the establishing context is `singleton()`.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    this.installWoodReserves();
    this.settleSoilPlacement();
  }
}

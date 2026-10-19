/**
 * Pool — ⭐ a small water you can see across, and the PLACE is the water
 * (the maritime build): being in it makes its ways swimmable, and an exit
 * whose destination is one is swimmable INTO it.
 *
 * ⭐⭐ **The water's surface is its floor** (storage-and-ice D12). A phase
 * change never creates or removes space: a frozen pool is the same place,
 * and what changed is what is underfoot. So the pool asks its FLOOR — the
 * kernel `WaterSurface` by default, or a row's `floor:` (the water pack's
 * ice sheet for a harvest pool) — every question about who is on it and
 * who is in it:
 *
 *  - **arriving** — swum in: you are in the water. Walked in: the floor
 *    bears you (you hold its ground slot) or it gives way under you.
 *  - **in the water** — whoever the floor is not supporting is immersed:
 *    soaked, and as cold as the water is (`immersionOf`).
 *  - **leaving** — a body in the water may leave only by swimming
 *    (*"You are in the water; swim for it."*); one on the ice walks off.
 *  - **swimming** — the ways are swum while the floor has open water, and
 *    a body swims iff it is in the water.
 *  - **a load change** — a thing dropped on the ice, or picked up, makes
 *    the floor reconcile who it still bears.
 *  - **what sinks** — a thing denser than water goes to the pool's BED
 *    (`bed:`, a row the place props: the abstract bed layer of the
 *    underwater slate's three, kept and unreachable until a dive verb). It
 *    sinks the moment it is in open water, and at the thaw for what was left
 *    on the ice. ⭐ The WATER answers where sunk things go — the ice never
 *    names the bed — so a concrete bed (a room under the pool) is a change
 *    to this one seam and the row.
 *
 * No per-occupant flag anywhere: the floor's slot IS the support state, and
 * the shipped posture verbs move you on and off it.
 */

import Locale from './Locale';
import { ShoreMixin } from '../../lib/location/Shore';
import { SwimmableMixin } from '../../lib/locomotion/Swimmable';
import { TemplatePaths } from '../../lib/paths';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { Containable } from '../../lib/spatial/Containable';
import type { Slottable } from '../../lib/slot/Slottable';
import type { VetoResult } from '../../lib/errors';
import type Exit from '../../lib/boundary/Exit';
import type { Floor } from '../../lib/ground/Floor';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import { ContainmentApi } from '../../api/containment';
import { BiomeApi } from '../../api/biome';
import { GROUND_SLOT } from '../thing/WaterSurface';

/** The water under the ice when nothing better is known, K. */
const UNDER_ICE_K = 274;
/** The posture-bearing slot a floor offers. */
/** Water's density when the medium cannot be read, kg/m³. */
const WATER_DENSITY = 1000;

type FloorStuff = Stuff & Floor;

export default class Pool extends SwimmableMixin(ShoreMixin(Locale)) {
  static fieldMeta: FieldMeta = {
    bed: { persistent: true, authorable: true },
  };

  /** A pool is swum every way it opens; a row may narrow it. */
  public override axes: string[] = ['*'];

  /** The row of the prop that is this pool's bed — where sunk things go. */
  public bed = '';

  constructor() {
    super();
    // ⭐ A pool's floor is the water's surface unless its row names one
    // (an ice sheet). A class default any row's `floor:` overrides.
    this.floor = { template: TemplatePaths.waterSurface };
  }

  /** The floor, when it speaks the support protocol. */
  private poolFloor(): FloorStuff | null {
    const f = this.getFloor() as Stuff | null;
    return f !== null && MixinApi.isFloor(f) ? (f as FloorStuff) : null;
  }

  /** Swimmable while the floor has open water to swim in. */
  public override canEngageAxis(direction: string): boolean {
    const floor = this.poolFloor();
    if (floor !== null && floor.supportIsSlotted()) {
      if (!(floor.openWaterAreaM2() > 0)) return false;
    } else {
      const pick = this.waterFor();
      if ('key' in pick && this.peekWaterRead(pick.key)?.frozen === true) return false;
    }
    return super.canEngageAxis(direction);
  }

  /**
   * ⭐ Who swims: someone in this pool swims iff they are in the water (the
   * floor is not holding them); someone outside swims in iff there is open
   * water to swim into.
   */
  public override canBeEngagedBy(actor: Stuff): boolean {
    const floor = this.poolFloor();
    if (floor !== null && floor.supportIsSlotted()) {
      const here = MixinApi.isContainable(actor) && actor.getContainer() === (this as unknown as Stuff);
      if (here ? floor.supports(actor) : !(floor.openWaterAreaM2() > 0)) return false;
    }
    return super.canBeEngagedBy(actor);
  }

  /** The water's temperature: the reach's draw, or the under-ice floor. */
  public override waterTemperatureK(): number {
    const pick = this.waterFor();
    if (!('key' in pick)) return super.waterTemperatureK();
    const read = this.peekWaterRead(pick.key);
    return read?.draw?.temperatureK ?? read?.underIce?.temperatureK ?? UNDER_ICE_K;
  }

  /**
   * ⭐ Arriving: swum in, you are in the water; walked in, the floor bears
   * you (you hold its ground slot) or it gives way under you.
   */
  public onEntered(mover: Stuff & Mobile & Containable, _via: Exit): void {
    const floor = this.poolFloor();
    if (floor === null || !floor.supportIsSlotted()) return;
    const swum = mover.getEngagedMode()?.getMedium() === 'water';
    if (swum) {
      if (MixinApi.isAttired(mover)) mover.immerse();
      else if (MixinApi.isWet(mover)) mover.wet(1);
      return;
    }
    if (floor.bears(floor.supportLoadKgOf(mover)) && MixinApi.isSlotted(floor) && MixinApi.isSlottable(mover)) {
      if (!floor.supports(mover) && floor.canOccupy(mover as Stuff & Slottable, GROUND_SLOT)) {
        floor.occupy(mover as Stuff & Slottable, GROUND_SLOT);
        return;
      }
      if (floor.supports(mover)) return;
    }
    floor.giveWay(mover);
  }

  /** Leaving: let go of the floor (a room move does not vacate a posture slot). */
  public onExited(mover: Stuff & Mobile & Containable, _via: Exit): void {
    const floor = this.poolFloor();
    if (floor === null || !MixinApi.isSlotted(floor)) return;
    if (floor.supports(mover)) floor.vacate(GROUND_SLOT, mover as unknown as Stuff & Slottable);
  }

  /** ⭐ A body in the water leaves by swimming. */
  public canExit(mover: Stuff & Mobile & Containable, _via: Exit): VetoResult {
    const floor = this.poolFloor();
    if (floor === null || !floor.supportIsSlotted()) return { ok: true };
    if (floor.supports(mover)) return { ok: true };
    if (!MixinApi.isMobile(mover) || !MixinApi.isSlottable(mover)) return { ok: true };
    if (mover.getEngagedMode()?.getMedium() === 'water') return { ok: true };
    return { ok: false, reason: 'You are in the water; swim for it.' };
  }

  /** A load change — a thing dropped or taken — reconciles who the floor bears; in open water, what sinks goes down. */
  public onContainableAdded(thing: Stuff & Containable): void {
    const floor = this.poolFloor();
    floor?.reconcileSupport();
    // Open water (nothing underfoot bears even an empty load): a dense thing
    // goes straight down. On ice it lies on the ice until the thaw. Deferred
    // a tick: never move a thing from inside the hook of its own arrival.
    if (floor !== null && floor.supportIsSlotted() && !floor.bears(0) && this.sinks(thing)) {
      void Promise.resolve().then(() => this.sink(thing));
    }
  }

  /** Does this thing go down in water — a still, dense, non-acting thing? */
  public sinks(thing: Stuff): boolean {
    if (thing.isAgent?.() || MixinApi.isMobile(thing)) return false;
    if (!MixinApi.isTangible(thing)) return false;
    if (MixinApi.isContainable(thing) && thing.isFixedInPlace?.()) return false;
    const rho = thing.getMaterial()?.getDensity().rawValue() ?? 0;
    // Buoyancy is a READ (the underwater slate § 3): the medium's own density.
    let medium = WATER_DENSITY;
    try {
      medium = BiomeApi.densityOf('water').rawValue() || WATER_DENSITY;
    } catch {
      /* an unwarmed biome: fresh water */
    }
    return rho > medium;
  }

  /**
   * ⭐ Send a thing to the bed. `false` when this pool authors no bed (or the
   * bed is not here): the thing stays where it is.
   */
  public sink(thing: Stuff): boolean {
    if (!this.bed || thing.isDestroyed()) return false;
    const bed = this.getContents().find((c) => c.getTemplatePath() === this.bed) ?? null;
    if (bed === null || !MixinApi.isContainer(bed) || !MixinApi.isContainable(thing)) return false;
    try {
      ContainmentApi.move(thing as Stuff & Containable, bed as Stuff & Container);
      return true;
    } catch {
      return false;
    }
  }

  /** At the thaw: everything here that sinks goes to the bed. */
  public sinkWhatSinks(): void {
    for (const c of [...this.getContents()]) {
      if (c.getTemplatePath() === this.bed) continue;
      if (this.sinks(c)) this.sink(c);
    }
  }

  public onContainableRemoved(_thing: Stuff & Containable): void {
    this.poolFloor()?.reconcileSupport();
  }
}

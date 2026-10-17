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
 *
 * No per-occupant flag anywhere: the floor's slot IS the support state, and
 * the shipped posture verbs move you on and off it.
 */

import SingletonCartesianLocation from './SingletonCartesianLocation';
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

/** The water under the ice when nothing better is known, K. */
const UNDER_ICE_K = 274;
/** The posture-bearing slot a floor offers. */
const GROUND_SLOT = 'ground:1';

type FloorStuff = Stuff & Floor;

export default class Pool extends SwimmableMixin(ShoreMixin(SingletonCartesianLocation)) {
  /** A pool is swum every way it opens; a row may narrow it. */
  public override axes: string[] = ['*'];

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

  /** A load change — a thing dropped or taken — reconciles who the floor bears. */
  public onContainableAdded(_thing: Stuff & Containable): void {
    this.poolFloor()?.reconcileSupport();
  }

  public onContainableRemoved(_thing: Stuff & Containable): void {
    this.poolFloor()?.reconcileSupport();
  }
}

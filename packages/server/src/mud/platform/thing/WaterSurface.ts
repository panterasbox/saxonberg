/**
 * WaterSurface — ⭐ **a pool's floor: the water's own surface**
 * (storage-and-ice D12). A phase change never creates or removes space: a
 * pool is the small water you are in, and its floor is the surface of that
 * water — not something you stand on while it is open.
 *
 * It answers the floor protocol the other way round from ground:
 *
 *  - `bears(load)` — `false` while the water is open. (A plain surface over
 *    water that reads FROZEN bears you — it has no thickness to model, and
 *    the pool is simply not swum; a harvest pool names an ice sheet, the
 *    water pack's subclass, which bears by its thickness.)
 *  - `supportIsSlotted()` — `true`: standing here is holding `ground:1`,
 *    and whoever does not hold it is in the water.
 *  - `canOccupy` — refuses a load the surface will not bear, in its own
 *    words (`canOccupyReason`).
 *  - `giveWay(occupant)` — the drop: off the slot, the swim mode engaged,
 *    soaked through, told so.
 *  - `reconcileSupport()` — gives way under everyone it no longer bears.
 */

import FloorBase from './Floor';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Slottable } from '../../lib/slot/Slottable';
import type { FieldMeta } from '../../lib/mixin';
import type { WaterPlace } from '../../lib/location/WaterPlace';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { LocomotionApi } from '../../api/locomotion';
import { Mml } from '../../api/mml';
import { Postures, type PostureAnswer } from '../../lib/slot/Postured';

/** Water running at least this fast takes a body that lies back in it, m/s. */
const MOVING_WATER_MPS = 0.2;

/** The posture-bearing slot a floor offers. */
export const GROUND_SLOT = 'ground:1';

export default class WaterSurface extends FloorBase {
  static fieldMeta: FieldMeta = {
    areaM2: { persistent: true, authorable: true },
  };

  /** The water's surface area, m² (0 = one cell). */
  public areaM2 = 0;

  /**
   * Open water bears nobody; water read frozen bears you (no sheet to
   * weigh); ⭐ and water you can stand in — a place whose water is only
   * wading deep now, or has gone out altogether — bears you on its bed.
   */
  public override bears(_loadKg: number): boolean {
    return this.isFrozenWater() || this.isStandingWater();
  }

  public override supportIsSlotted(): boolean {
    return true;
  }

  /** The whole surface is open water — unless the water reads frozen. */
  public override openWaterAreaM2(): number {
    if (this.isFrozenWater()) return 0;
    if (this.waterPlace()?.stateNow() === 'dry') return 0;
    return this.areaM2 > 0 ? this.areaM2 : 1;
  }

  public override canOccupy(candidate: Stuff & Slottable, slot: string): boolean {
    if (slot === GROUND_SLOT && !this.bearsBody(candidate)) return false;
    return super.canOccupy(candidate, slot);
  }

  public override canOccupyReason(candidate: Stuff & Slottable, slot: string): string | null {
    if (slot === GROUND_SLOT && !this.bearsBody(candidate)) {
      return this.notBearingWords();
    }
    return super.canOccupyReason(candidate, slot);
  }

  /**
   * ⭐ Finding your feet — the mirror of {@link giveWay}: whoever the bed
   * now holds is standing, no longer swimming, so the way out is walked
   * (river drive, step 4: a swimmer who stood in the shallows kept the
   * swim mode, and every bank refused them as water too rough to swim).
   */
  public override occupy(candidate: Stuff & Slottable, slot: string): void {
    super.occupy(candidate, slot);
    if (slot !== GROUND_SLOT || !MixinApi.isMobile(candidate)) return;
    if (candidate.getEngagedMode()?.getMedium() !== 'water') return;
    const walk = LocomotionApi.modeOf('walk');
    if (walk) candidate.setEngagedMode(walk);
  }

  /**
   * ⭐ The drop. Off the slot if held, the swim mode engaged (what the
   * sense consumers read), soaked through — body and every worn layer —
   * and told so. `deliberate` is going in on purpose (`swim` with no
   * target): the gentler words.
   */
  public override giveWay(occupant: Stuff, deliberate = false): boolean {
    const self = this as unknown as Stuff;
    if (MixinApi.isSlotted(self) && this.supports(occupant)) {
      self.vacate(GROUND_SLOT, occupant as Stuff & Slottable);
    }
    if (MixinApi.isMobile(occupant)) {
      const swim = LocomotionApi.modeOf('swim');
      if (swim) occupant.setEngagedMode(swim);
    }
    if (MixinApi.isAttired(occupant)) occupant.immerse();
    else if (MixinApi.isWet(occupant)) occupant.wet(1);
    this.sayGaveWay(occupant, deliberate);
    return true;
  }

  /**
   * ⭐ `lie` on the water (underwater review; controller-liquidity W8): a
   * surface that is not holding you up, or moving water (river D13 — lying
   * back takes your feet off the bottom; a patch carried with the current
   * is moving water too), is FLOATING, and the water floats you. Anywhere
   * else this floor takes a body at rest like any ground.
   */
  public override async acceptPosture(actor: Stuff, posture: string): Promise<PostureAnswer> {
    // ⭐ Standing (controller-liquidity W7c): a bed that already holds you
    // is only the posture; otherwise it is getting up ONTO it (the slot's
    // `canOccupy` says whether it bears you, and `occupy` ends the swim).
    if (posture === Postures.Stand) {
      return this.supports(actor) ? { ok: true, facts: { as: 'held' } } : super.acceptPosture(actor, posture);
    }
    if (posture !== Postures.Lie) return super.acceptPosture(actor, posture);
    const water = this.waterPlace();
    const moving = water !== null && (
      (MixinApi.isMovingPlace(water) && water.isUnderWay()) ||
      (MixinApi.isMovingWater(water) && Math.abs(water.currentFor(actor)) >= MOVING_WATER_MPS)
    );
    const held = this.supports(actor);
    if (held && !moving) return super.acceptPosture(actor, posture);
    if (!MixinApi.isRespiration(actor)) return { ok: false, reason: 'not-a-swimmer' };
    if (held) this.giveWay(actor, true);
    if (water === null) return { ok: false, reason: 'not-at-surface' };
    return water.floatHere(actor);
  }

  public override reconcileSupport(): void {
    const self = this as unknown as Stuff;
    if (!MixinApi.isSlotted(self)) return;
    for (const occ of [...self.getOccupants(GROUND_SLOT)]) {
      if (!this.bearsBody(occ)) this.giveWay(occ);
    }
  }

  /** What the surface says to someone it will not hold up. */
  protected notBearingWords(): string {
    return 'There is nothing here to stand on but water.';
  }

  /** The scene of going in. */
  protected sayGaveWay(occupant: Stuff, deliberate: boolean): void {
    if (!MixinApi.isMobile(occupant)) return;
    MessageApi.scene(occupant)
      .topic('act.deed')
      .toSelf(
        deliberate
          ? Mml.compose`You lower yourself into the water. The cold of it closes over you.`
          : Mml.compose`You go into the water, and it closes cold over you.`,
      )
      .toPeers(
        deliberate
          ? Mml.compose`${Mml.actor(occupant)} slips down into the water.`
          : Mml.compose`${Mml.actor(occupant)} goes into the water.`,
      )
      .send();
  }

  /** The water place this surface floors, if it is one. */
  private waterPlace(): (Stuff & WaterPlace) | null {
    const room = (this as unknown as { getAdornedTo?(): Stuff | null }).getAdornedTo?.() ?? null;
    return room !== null && MixinApi.isWaterPlace(room) ? room : null;
  }

  /**
   * ⭐ Does this floor bear `body` standing? Ice, or water shallow enough
   * for THIS body to wade (size and carrying D22: by its stature — a gnome
   * swims where a human stands).
   */
  private bearsBody(body: Stuff): boolean {
    if (this.isFrozenWater()) return true;
    const water = this.waterPlace();
    const stature = MixinApi.isPosed(body) ? body.getStature() : null;
    // A body with no stature to read stands where the place says one does.
    if (water === null || stature === null) return this.bears(this.supportLoadKgOf(body));
    const state = water.stateFor(body);
    return state === 'dry' || state === 'wading';
  }

  /** The water here is shallow enough to stand in now (or gone). */
  protected isStandingWater(): boolean {
    const state = this.waterPlace()?.stateNow();
    return state === 'dry' || state === 'wading';
  }

  /** The pool's water reads frozen (read off the room by shape — a `Shore`). */
  protected isFrozenWater(): boolean {
    const room = (this as unknown as { getAdornedTo?(): Stuff | null }).getAdornedTo?.() ?? null;
    if (room === null || !MixinApi.isShore(room)) return false;
    const pick = room.waterFor();
    if (!('key' in pick)) return false;
    return room.peekWaterRead(pick.key)?.frozen === true;
  }
}

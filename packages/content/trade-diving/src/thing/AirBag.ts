/**
 * AirBag — ⭐ **lifting by air** (underwater C5): a sealed barrel or a
 * canvas bag full of air, lashed to something too heavy to carry up. Its
 * air displaces the water; if the pair displaces more than it weighs, it
 * rises — up through the water to the surface, where a line can bring it
 * in. Buoyancy, not strength: the city's lost anchor comes up on a few
 * barrels of air.
 *
 * The air in it is breathable too: carried into a diving bell and let
 * go, it freshens the bell (the water pack's air pocket reads any open
 * vessel of air).
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { BuoyMixin } from '@saxonberg/server/mud/lib/location/Buoy';
import { TieableMixin, type TieOutcome } from '@saxonberg/server/mud/lib/spatial/Tieable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';

/** Air at the surface weighs nothing worth counting; water ~1 kg a liter. */
const WATER_KG_PER_L = 1;

/**
 * Liters of free air per liter of bag: the bag's interior is filled from
 * a pump or a barrel at pressure, so it holds more than its own volume
 * of surface air.
 */
const AIR_SCALE = 200;

export default class AirBag extends TieableMixin(BuoyMixin(BulkableMixin(Good))) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/inventory/tie.yaml'],
    peers: ['platform/cmd/inventory/untie.yaml'],
  };

  /** What it is lashed to (runtime) — it goes where that goes. */
  private _lashedTo: Stuff | null = null;

  /** ⭐ A bag holds up what it is lashed to, while its air lifts it. */
  public override buoys(thing: Stuff): boolean {
    return this.getLashedTo() === thing;
  }

  public getLashedTo(): Stuff | null {
    const load = this._lashedTo;
    if (load === null || load.isDestroyed() || !MixinApi.isContainable(load)) return null;
    return load.getContainer() === this.getContainer() ? load : null;
  }

  /** ⭐ What its air lifts at `depthM`, kg of water displaced (air squeezes with depth). */
  public override liftKg(depthM: number): number {
    const squeeze = 1 + Math.max(0, depthM) / 10;
    return (this.airLitres() * AIR_SCALE * WATER_KG_PER_L) / squeeze - this.getMass().rawValue();
  }

  /** Liters of air in it now. */
  public airLitres(): number {
    const mat = this.getBulkMaterial('interior');
    return mat !== null && mat.getName() === 'air' ? this.getBulkAmount('interior').rawValue() : 0;
  }

  /**
   * ⭐ `tie bag to <load>` (`lash`): if the two of them displace more
   * water than they weigh, they rise together to the top of the water.
   */
  public override async tieTo(by: Stuff, load: Stuff, knot: string | null): Promise<TieOutcome> {
    void knot;
    if (this.getContainer() !== by) {
      return { ok: false, reason: 'not-holding', line: 'You need the air bag in your hands.' };
    }
    if (load === by || !MixinApi.isContainable(load)) {
      return { ok: false, reason: 'not-a-load', line: 'You cannot lash it to that.' };
    }
    const place = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (place === null || load.getContainer() !== place) {
      return { ok: false, reason: 'out-of-reach', line: `${load.getPresentation()} is not here.` };
    }
    if (!MixinApi.isWaterPlace(place)) {
      return { ok: false, reason: 'not-in-water', line: 'It would only lift in the water.' };
    }
    const depthM = Math.max(0, BiomeApi.mediumFor(by).depthM);
    // The others already on it lift too.
    const others = MixinApi.isContainer(place)
      ? place.getContents().filter((c): c is AirBag => c instanceof AirBag && c !== this && c.getLashedTo() === load)
      : [];
    const lift = [this, ...others].reduce((sum, bag) => sum + bag.liftKg(depthM), 0);
    this._lashedTo = load;
    // ⭐ A load's weight in the water is taken as its mass: what lifts it
    // is air, and the few per cent a dense load displaces is not counted.
    if (lift <= (MixinApi.isTangible(load) ? load.getMass().rawValue() : 0)) {
      ContainmentApi.move(this as never, place as Stuff & Container);
      return { ok: true, line: `You lash it to ${load.getPresentation()}, which does not stir. It needs more air.` };
    }
    const top = place.surfacePlace();
    if (top === null) return { ok: false, reason: 'no-surface', line: 'There is nowhere for it to rise to.' };
    // The bags go up FIRST: a water asks what buoys a thing the moment it
    // arrives, and an anchor that reached the surface before its bags was
    // sunk straight back to the bed (the finalize drive, run 43).
    for (const bag of [this, ...others]) ContainmentApi.move(bag as never, top as Stuff & Container);
    ContainmentApi.move(load as never, top as Stuff & Container);
    return { ok: true, line: `You lash it to ${load.getPresentation()}. The pair lift off the bottom and go up through the water, slowly, then faster.` };
  }

  /** `untie bag` — cast it off its load and take it up. */
  public override async untieBy(by: Stuff): Promise<TieOutcome> {
    const load = this.getLashedTo();
    if (load === null) return { ok: false, reason: 'not-tied', line: 'It is not lashed to anything.' };
    if (!MixinApi.isContainer(by)) return { ok: false, reason: 'no-hands', line: 'You have no hands to take it in.' };
    this._lashedTo = null;
    ContainmentApi.move(this as never, by as Stuff & Container);
    return { ok: true, line: `You cast the bag off ${load.getPresentation()} and take it up.` };
  }
}

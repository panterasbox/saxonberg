/**
 * SpaceHeatingMixin — ⭐⭐ **this fire exists to warm where you stand.**
 *
 * The one distinction the envelope build turns on, and the reason it is
 * a mixin rather than a field on `FurnaceMixin`:
 *
 * > *A forge heats what you put IN it; a hearth heats where you stand.*
 *
 * `thermal.md` has a deliberate, well-argued rule — **a lit forge must
 * not warm the room it stands in** — because being *inside* the fire is
 * not being *near* it, and a smithy whose forge heated the air would be
 * uninhabitable. The rule is right and it is kept. What was missing was
 * the other kind of object: a hearth, a stove, a brazier, whose entire
 * purpose IS the room.
 *
 * ⚠ **Never compose this on `FurnaceMixin`.** That would claim it of
 * the forge, the oven and the kiln, and the only way back would be a
 * guard asking *is this a forge* — which is precisely the shape
 * `docs/antipatterns.md` calls the tell of a mixin on the wrong host.
 * Two objects, two claims, and the envelope narrows its contents with
 * `MixinApi.isSpaceHeating` without ever asking what anything IS.
 *
 * Composed **outermost**, over the furnace face, so it can read
 * `isLit()` and `fuelRemaining()`: a fire that has gone out warms
 * nothing, and it should not take a second flag to say so.
 *
 * ⭐ Outdoors there is no envelope to warm, and that is the ENVELOPE's
 * rule (a sky-exposed scope gets none) rather than a guard here — which
 * is why a `Campfire` may compose this honestly. A campfire warms the
 * people around it through its warming slots either way; what this adds
 * is that one lit inside four walls warms the walls too.
 *
 * Authored watts are honest for now. Deriving them from the fuel's
 * `heatOfCombustion` and a real mass reserve is a named deferred seam
 * (the energy build) — when it lands, rows change and this does not.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Furnace } from '../fire/Furnace';

/** Public shape added by SpaceHeatingMixin. */
export interface SpaceHeating {
  /**
   * What this fire is putting into the room right now, in watts — its
   * authored output while it is burning, and **zero** the moment it is
   * out or out of fuel.
   */
  spaceHeatOutputW(): number;
  /** The authored output while burning (W). */
  getHeatOutputW(): number;
  setHeatOutputW(value: number): void;
}

/**
 * A domestic fire's output. 1.5 kW is an open hearth's useful share —
 * most of what a real fire produces goes up the chimney, which is why
 * the number is nearer a room heater's than a bonfire's.
 *
 * Against the envelope arithmetic it means: a 3 m masonry cell shut
 * holds about +17 K over outside, and the same cell with its street
 * door open about +6 K. *A heated room with the door open is
 * expensive* falls out of that, rather than being asserted anywhere.
 */
const DEFAULT_HEAT_OUTPUT_W = 1500;

export function SpaceHeatingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class SpaceHeatingMixin extends Base implements SpaceHeating {
    static _mixinName: string = 'SpaceHeatingMixin';

    static fieldMeta: FieldMeta = {
      heatOutputW: { persistent: true, authorable: true },
    };

    /** What this fire puts into the room while burning, in watts. */
    public heatOutputW: number = DEFAULT_HEAT_OUTPUT_W;

    public getHeatOutputW(): number {
      return this.heatOutputW;
    }
    public setHeatOutputW(value: number): void {
      if (Number.isFinite(value) && value >= 0) this.heatOutputW = value;
    }

    /**
     * ⭐ Zero unless it is actually burning. Reads the furnace face
     * through the host cast (the `Furnace.furnaceHost` shape) — every
     * composer of this mixin composes `FurnaceMixin` below it, and a
     * host that somehow does not is treated as out rather than crashing
     * a room's temperature read.
     */
    public spaceHeatOutputW(): number {
      const host = this as unknown as Partial<Furnace>;
      if (typeof host.isLit !== 'function') return 0;
      if (typeof host.fuelRemaining !== 'function') return 0;
      if (!host.isLit() || host.fuelRemaining() <= 0) return 0;
      return this.heatOutputW;
    }
  };
}

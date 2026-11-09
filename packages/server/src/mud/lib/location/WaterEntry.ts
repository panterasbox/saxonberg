/**
 * WaterEntry — ⭐ **a way into the water from here** (controller-liquidity
 * W8, Appendix B).
 *
 * `swim` with no way named means *get into the water*, and where you stand
 * decides what that is: on a pool's open surface you let go and go in where
 * you are; on a bank or a quay it is the way down off the edge, which the
 * shore names; on dry ground, nothing. `SwimController` carried that as a
 * two-kind fork over the floor's class and the place's mixins; the place
 * answers it now, and the verb crosses the way it is given or says why not.
 *
 * **Hosts:** `ShoreMixin` (the way off the edge — composed inside it, so
 * every waterside place answers) and `WaterPlaceMixin` (the water itself:
 * its surface lets you in, deep water with no surface to leave is no way
 * in, and shallow water falls back to its shore). **IS NOT for:** a dry
 * place — the default refuses `no-water`.
 *
 * ⚠ A DOING protocol where the way is the place itself: going in off a
 * pool's surface happens in the call (the surface gives way, and says so,
 * as it does under any body it stops bearing). A way that is an exit is
 * returned for the verb to cross — the crossing is the mover's act and runs
 * every gate.
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import type Exit from '../boundary/Exit';

/** The way in: an exit to cross, or `null` — you are in already, here. */
export interface WaterEntryFacts {
  exit: Exit | null;
}

/**
 * ⭐ Every reason there is no way in — `SwimController` words each.
 *  - `no-water` — no water here to go into.
 *  - `iced-over` — the water the way leads to is frozen; only a hole.
 *  - `no-open-water` — standing in or on water with no open surface.
 *  - `already-in-water` — you are in it.
 */
export type WaterEntryRefusal =
  | ActRefusal<'no-water'>
  | ActRefusal<'iced-over'>
  | ActRefusal<'no-open-water'>
  | ActRefusal<'already-in-water'>;

/** What a place answers. */
export type WaterEntryAnswer = ActOutcome<WaterEntryFacts> | WaterEntryRefusal;

/** A place that knows the way into its water. */
export interface WaterEntry {
  /** The way from here into the water for `actor`, or why there is none. */
  wayIntoWater(actor: Stuff): Promise<WaterEntryAnswer>;
}

/**
 * ⭐ **`WaterEntryMixin` — the way-into-water protocol, as a mixin.**
 * The default refuses (`no-water`); `ShoreMixin` and `WaterPlaceMixin`
 * override.
 */
export function WaterEntryMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WaterEntryMixin extends Base implements WaterEntry {
    static _mixinName: string = 'WaterEntryMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The way in, or why none; the default refuses. */
    public async wayIntoWater(_actor: Stuff): Promise<WaterEntryAnswer> {
      return { ok: false, reason: 'no-water' };
    }
  };
}

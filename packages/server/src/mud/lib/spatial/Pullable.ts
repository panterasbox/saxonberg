/**
 * Pullable — ⭐ **something on the end of a line** (underwater D19,
 * renamed in review): a set pot out of the water, a diver up the column
 * on a lifeline, a bell down a band on its hoist. ONE verb, `pull`, over
 * a protocol the thing implements — the verb-collision ladder's first
 * rung (*unify behind an interface*): pulling a pot and pulling a diver
 * are the same act on different things, and the thing decides what it
 * means.
 *
 * ⛔ Not `haul`: haul, hauler and haulage are the logistics vocabulary
 * (goods moved by cart and wagon; the kernel's `HaulableMixin` is a cart
 * you hitch), and a rope verb must not take that word from it.
 *
 * Not a mixin: nothing about being pulled is shared state. A host
 * implements `pullBy`; the controller narrows by SHAPE (the `Pumpable`
 * precedent) and renders what the host returns. Every refusal is the
 * host's own sentence.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

/** Which way to pull, when the thing can go both ways (a bell). */
export type PullSense = 'up' | 'down';

/** What a pull did, in the thing's own words. */
export type PullOutcome =
  | {
      ok: true;
      self: Mml;
      peers?: Mml | null;
      /**
       * ⭐ A pull that takes time (underwater review): what is said now is
       * the start, and the pull lands after `realS` real seconds of the
       * puller's hands — `finish` says what it came to. `stop` leaves the
       * line where it was.
       */
      takes?: { realS: number; finish: () => Promise<PullOutcome> };
    }
  | { ok: false; reason: string; line: string };

/** The protocol: a thing that can be pulled on. */
export interface Pullable {
  /**
   * ⭐ Pull on this thing. `sense` is the way asked for, or `null` for the
   * thing's natural way (a pot comes up, a diver comes up).
   */
  pullBy(puller: Stuff, sense: PullSense | null): Promise<PullOutcome>;
}

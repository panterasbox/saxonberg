/**
 * Haulable — ⭐ **something you pull on a line** (underwater D19): a set
 * pot out of the water, a diver up the column, a bell down to the next
 * band. ONE verb, `haul`, over a protocol the thing implements — the
 * verb-collision ladder's first rung (*unify behind an interface*): the
 * fishing trade's `haul pot` and the diving trade's `haul diver` are the
 * same act on different things, and the thing decides what it means.
 *
 * Not a mixin: nothing about being hauled is shared state. A host
 * implements `haulBy`; the controller narrows by SHAPE (the `Pumpable`
 * precedent) and renders what the host returns. Every refusal is the
 * host's own sentence.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

/** Which way to haul, when the thing can go both ways (a bell). */
export type HaulSense = 'up' | 'down';

/** What a haul did, in the thing's own words. */
export type HaulOutcome =
  | { ok: true; self: Mml; peers?: Mml | null }
  | { ok: false; reason: string; line: string };

/** The protocol: a thing that can be hauled on. */
export interface Haulable {
  /**
   * ⭐ Haul on this thing. `sense` is the way asked for, or `null` for
   * the thing's natural way (a pot comes up, a diver comes up).
   */
  haulBy(hauler: Stuff, sense: HaulSense | null): Promise<HaulOutcome>;
}

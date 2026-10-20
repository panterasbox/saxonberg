/**
 * Tossable — ⭐ **a thing you throw TO somebody** (underwater review): the
 * end of a line to a swimmer going under. `throw <thing> at <them>` is an
 * attack; `throw <thing> to <them>` is a toss they are meant to catch,
 * and the thing decides what catching it means and how far it carries (a
 * line reaches the water below a quay). One verb, `throw` — `heave` is
 * one of its words, never a verb of its own.
 *
 * Not a mixin: nothing about being tossed is shared state. A host
 * implements `tossTo`; the controller narrows by SHAPE (the `Pullable`
 * precedent) and renders what the host returns.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Mml } from '../../api/mml';

/** What a toss did, in the thing's own words. */
export type TossOutcome =
  | { ok: true; self: Mml; peers?: Mml | null }
  | { ok: false; reason: string; line: string };

/** The protocol: a thing you can throw to somebody. */
export interface Tossable {
  /** Throw this to whoever `who` names, within the thing's own reach. */
  tossTo(thrower: Stuff, who: string): Promise<TossOutcome>;
}

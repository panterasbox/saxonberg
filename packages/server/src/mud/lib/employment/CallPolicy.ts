/**
 * CallPolicy — ⭐⭐⭐ **a house's authored rule for who among the able is
 * called.**
 *
 * Somebody orders a drink. Two bartenders are on the rail and both can
 * make it. Which one comes over?
 *
 * Until this existed the answer was `resolveMaker`'s tie-break: sort the
 * candidates by identity path and take the first. ⚠⚠ Every player Avatar's
 * identity path begins `/platform/`, every NPC's `/world/` — **so the
 * player won every tie, forever**, and a newly hired player's seat was
 * decorative in the other direction: with two NPCs, one of them served
 * every order of the bar's life and the other stood there. *Predictable
 * beats arbitrary; neither is right.*
 *
 * ## The policies, and why only two
 *
 * ⭐ A closed vocabulary with **a shipped consumer for each member** — the
 * rule this codebase keeps relearning. A third policy with no house
 * behind it is a word that cannot be wrong.
 *
 * - **`regulars`** — the bar. Capability, then *your regular* (the
 *   candidate who knows you best), then the freest, then rotation. It is
 *   the relational leg: a regular gets their regular, which is the whole
 *   reason a patron can *predict* who comes over.
 * - **`rota`** — the Hearthworks kitchen, the yards, the bakery. No
 *   relational leg at all: the least-recently-called able hand. A kitchen
 *   has no regulars and should not pretend to.
 *
 * ## ⚠⚠ What a house with NO rule does
 *
 * It **declines**. `call()` answers `{ ok: false, reason:
 * 'no-call-policy' }` and the caller refuses the order, rather than
 * quietly serving the first member — because *quietly serving the first
 * member* is the defect this file exists to retire, and reintroducing it
 * as a fallback would make the whole mechanism optional. `lint:menu-staff`
 * refuses a house that has a `fulfills` seat and no `call:`, so the
 * refusal is something an author meets at build time, not a player meets
 * at the rail.
 *
 * ⭐ `''` is legal on a house with **no** fulfilling seat: a chart that
 * calls nobody needs no rule. The gate asks only where there is somebody
 * to call.
 */

import type { Stuff } from '../stuff/Stuff';

export const CALL_POLICIES = ['regulars', 'rota'] as const;

export type CallPolicy = (typeof CALL_POLICIES)[number];

/**
 * What the caller hands the house. ⭐ The **candidate set is the caller's**,
 * already filtered for capability — which is what lets the same rule serve
 * a call across a room, a call down a radio, and a call to everybody on
 * the roster without the house knowing which it is. (Those other callers
 * are deferred; the shape is not.)
 */
export interface CallRequest {
  /** Whoever is asking — the patron, the dispatcher, the foreman. */
  readonly patron: Stuff;
  /** The able, already filtered by the caller. Never empty. */
  readonly candidates: readonly Stuff[];
}

export type CallVerdict =
  | { readonly ok: true; readonly chosen: Stuff }
  | {
      readonly ok: false;
      /**
       * `no-call-policy` — the house authored no rule, so it declines
       * rather than picking. `nobody` — the caller handed an empty set.
       */
      readonly reason: 'no-call-policy' | 'nobody';
    };

/**
 * MQL predicate registry — bareword filters that can appear in chain
 * position (`:living`, `:online`, `:mine`, `:here`, `:visible`,
 * `:here`).
 *
 * Each predicate declares its required permission tier and a check
 * function that decides whether a given Stuff passes. Unknown
 * barewords in chain position fall back to keyword filtering — the
 * resolver consults this registry first, and on miss uses the
 * keyword path. So predicates are reserved by *name match* on this
 * published list, not by parser keywords.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandGiver } from '../../lib/command/CommandGiver';
// `ConnectionApi` is reached through the resolver's online-holders
// provider (set by `mql/online-wire.ts`); pulling `ConnectionApi`
// directly here would resurrect the load-time cycle this file's
// position on the `command.ts → MqlApi` chain creates with
// `ConnectionManager → Interactive → Idea`.
import { MixinApi } from '../mixin';
import { PerceptionApi } from '../perception';
import { getOnlineHolders } from './online-provider';
import type { MqlContext } from './types';

export interface MqlPredicate {
  /** Decide whether `target` passes the predicate, given `giver`. */
  check(target: Stuff, giver: Stuff & CommandGiver, ctx: MqlContext): boolean;
}

/**
 * Returns true if `target` is alive in any sense the v1 game models.
 * Today that's "composes Mobile" — there is no `Alive` mixin yet.
 * Stationary-but-alive NPCs (bound spirits, fixtures) won't qualify
 * until the Alive mixin lands. Documented limitation.
 */
function isLiving(target: Stuff): boolean {
  return MixinApi.isMobile(target);
}

function isOnline(target: Stuff): boolean {
  for (const holder of getOnlineHolders()) {
    if (holder.stuffId === target.stuffId) return true;
  }
  return false;
}

/**
 * Owner-tracking subsystem doesn't exist yet. Stub returns false; a
 * `mine` query against any Stuff misses today. Will be replaced when
 * ownership lands.
 */
function isMine(_target: Stuff, _giver: Stuff & CommandGiver): boolean {
  return false;
}

function isHere(target: Stuff, giver: Stuff & CommandGiver): boolean {
  if (!MixinApi.isContainable(giver)) return false;
  const env = giver.getContainer();
  if (!env) return false;
  if (target.stuffId === env.stuffId) return true;
  if (MixinApi.isContainable(target)) {
    const targetEnv = target.getContainer();
    return !!targetEnv && targetEnv.stuffId === env.stuffId;
  }
  return false;
}

/**
 * Visible-to-giver — a thing in the giver's neighborhood (location,
 * inventory, or own person) that the giver actually perceives. The
 * neighborhood is the presence prefilter; `PerceptionApi.perceives`
 * refines it with concealment + per-viewer discovery (the refinement this
 * placeholder's comment reserved). `perceives` short-circuits true for an
 * un-concealed thing, so ordinary items stay visible.
 */
function isVisible(target: Stuff, giver: Stuff & CommandGiver): boolean {
  if (target.stuffId === giver.stuffId) return true;
  if (!isHere(target, giver)) return false;
  return PerceptionApi.perceives(giver, target);
}

/**
 * The full predicate registry. Lookups are case-sensitive (lower-
 * case keys); the resolver lowercases inputs to match.
 */
export const MQL_PREDICATES: Readonly<Record<string, MqlPredicate>> = {
  living: { check: isLiving },
  online: { check: isOnline },
  mine: { check: isMine },
  here: { check: isHere },
  visible: { check: isVisible },
};

/**
 * Test whether `name` is a registered predicate. The resolver uses
 * this to decide between predicate evaluation and keyword filter
 * fallback.
 */
export function isPredicateName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(MQL_PREDICATES, name);
}

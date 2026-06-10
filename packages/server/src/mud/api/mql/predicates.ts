/**
 * MQL predicate registry — bareword filters that can appear in chain
 * position (`:living`, `:online`, `:mine`, `:here`, `:visible`,
 * `:admin`).
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
import { getOnlineHolders } from './online-provider';
import type { MqlContext, PermissionTier } from './types';

export interface MqlPredicate {
  /** Permission tier required to invoke this predicate. */
  tier: PermissionTier;
  /** Decide whether `target` passes the predicate, given `giver`. The
   *  `ctx` argument carries the precomputed permission snapshot used
   *  by per-target gates (e.g., `:admin` consults
   *  `ctx.permission?.coreMemberIds`). */
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
 * Visible-to-giver — for v1 we treat anything in the giver's
 * neighborhood (location, inventory, or own person) as visible. A
 * real perception subsystem will refine this (light levels,
 * concealment, etc.).
 */
function isVisible(target: Stuff, giver: Stuff & CommandGiver): boolean {
  if (target.stuffId === giver.stuffId) return true;
  return isHere(target, giver);
}

function isAdmin(
  target: Stuff,
  _giver: Stuff & CommandGiver,
  ctx: MqlContext,
): boolean {
  // Per-target check: is THE TARGET (not the giver) an admin? The
  // dispatcher precomputes the set of playerIds in `'core'` and
  // stamps it on `ctx.permission.coreMemberIds`; this method
  // consults the snapshot synchronously. Absent snapshot → false
  // (the prior `_MqlAdminFlag.granter` default).
  const ids = ctx.permission?.coreMemberIds;
  if (!ids) return false;
  const playerId = (target as { getPlayerId?: () => string }).getPlayerId?.();
  if (!playerId) return false;
  return ids.has(playerId);
}

/**
 * The full predicate registry. Lookups are case-sensitive (lower-
 * case keys); the resolver lowercases inputs to match.
 */
export const MQL_PREDICATES: Readonly<Record<string, MqlPredicate>> = {
  living: { tier: 'public', check: isLiving },
  online: { tier: 'public', check: isOnline },
  mine: { tier: 'public', check: isMine },
  here: { tier: 'public', check: isHere },
  visible: { tier: 'public', check: isVisible },
  admin: { tier: 'admin', check: isAdmin },
};

/**
 * Test whether `name` is a registered predicate. The resolver uses
 * this to decide between predicate evaluation and keyword filter
 * fallback.
 */
export function isPredicateName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(MQL_PREDICATES, name);
}

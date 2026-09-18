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
import { ParcelApi } from '../parcel';
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
 * ⭐⭐ **`:mine` is the explicit stamp, plus title over an extent.**
 *
 * Two rungs answer, both synchronous in-memory index reads:
 *
 *   1. **Chattel** — the good carries this player's stamp. This is the
 *      deliberate act of titling a movable, and it is what a named pet,
 *      a bought saucer or a consigned good all have.
 *   2. **Parcel** — the target's template path falls under an extent
 *      this player holds title to. A room in your own home is yours
 *      without anybody stamping it.
 *
 * ⚠ Two rungs deliberately **do not** answer. The **author** rung is not
 * ownership — a row you wrote is not a possession, or every builder
 * would own the world. **Group-held** title is not yours either; it is
 * the group's, and `:mine` is first person singular.
 *
 * ⚠⚠ And the hard constraint this predicate exists under: **ownership
 * must never locate.** `:mine` answers *what* is yours; it must never
 * become a way to ask *where* your things are, or "find my cat" turns a
 * companion into a tracking device and a thief into a bloodhound. The
 * `find` row set carries no container and no location field, and there
 * is a test pinning exactly that.
 *
 * Both reads answer `false` before their registry warms, which is the
 * honest answer: nothing is known to be yours yet.
 */
function isMine(target: Stuff, giver: Stuff & CommandGiver): boolean {
  const me = (giver as unknown as Stuff).getIdentityPath();
  if (!me) return false;

  // ⭐ The verb is on the object: narrow locally, then ask the good
  // itself who is stamped on it (CLAUDE.md § Go Through the Api Layer —
  // a read that belongs to ONE object lives on that object).
  if (MixinApi.isChattel(target)) {
    const stamped = target.stampedOwner();
    if (stamped?.kind === 'player' && stamped.templatePath === me) return true;
  }

  const path = target.getTemplatePath();
  if (!path) return false;
  const owner = ParcelApi.coveringParcelOfSync(path)?.owner;
  return owner?.kind === 'player' && owner.templatePath === me;
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

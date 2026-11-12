/**
 * MQL predicate registry — bareword filters that can appear in chain
 * position (`:living`, `:online`, `:mine`, `:here`, `:visible`,
 * `:loose`, `:worn`, `:carried`).
 *
 * ⭐ A predicate DELEGATES; it never owns an algorithm (architecture.md §
 * *MQL is a VIEW over the model*): each is one line over a method the
 * model already answers, so anything a query can say a function call can
 * say too.
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

/**
 * ⭐ Here — the giver's PLACE itself, or a thing standing in it, or in the
 * vessel the giver sits in (controller-liquidity D7: `here` is the place,
 * walking up past a boat; the passenger beside you in it is here too).
 */
function isHere(target: Stuff, giver: Stuff & CommandGiver): boolean {
  if (!MixinApi.isContainable(giver)) return false;
  const place = giver.getEnclosingPlace();
  if (!place) return false;
  if (target.stuffId === place.stuffId) return true;
  if (!MixinApi.isContainable(target)) return false;
  const targetEnv = target.getContainer();
  if (!targetEnv) return false;
  return (
    targetEnv.stuffId === place.stuffId ||
    targetEnv.stuffId === giver.getContainer()?.stuffId
  );
}

/**
 * ⭐ `visible` is a CLASS word — a thing that presents itself to the eye
 * at all (composes `Visible`; the giver is one to itself). ⛔ It does not
 * ask whether the giver perceives it (size-and-carrying D23): MQL names
 * the same things for everyone, and perceiving is the act's — a surface
 * filters with `PerceptionApi.perceived`.
 */
function isVisible(target: Stuff, giver: Stuff & CommandGiver): boolean {
  if (target.stuffId === giver.stuffId) return true;
  return MixinApi.isVisible(target);
}

/**
 * ⭐ Loose — listed as its holder's own contents: not placed ON or IN
 * something else there (the back-bar's bottles), not a crop standing over
 * the ground. Delegates to the holder's `getLooseContents()`, whose rule
 * it is (`look`, `sense` and the inspection card all read it).
 */
function isLoose(target: Stuff): boolean {
  if (!MixinApi.isContainable(target)) return false;
  const holder = target.getContainer();
  if (!holder || !MixinApi.isContainer(holder)) return false;
  return holder.getLooseContents().includes(target);
}

/** Whether `target` occupies a slot on the thing that holds it. */
function occupiesHolderSlot(target: Stuff): boolean {
  if (!MixinApi.isContainable(target)) return false;
  const holder = target.getContainer();
  if (!holder || !MixinApi.isSlotted(holder)) return false;
  // ⭐ A carrier's HAND is not worn (size and carrying D12, the flip): what
  // a hand holds is `held` and, with the rest of what is on you, `carried`.
  const hands = MixinApi.isCarrying(holder) ? new Set(holder.handSlots()) : null;
  for (const [slot, occupants] of holder.getAllOccupants()) {
    if (hands?.has(slot)) continue;
    for (const o of occupants) if ((o as unknown as Stuff).stuffId === target.stuffId) return true;
  }
  return false;
}

/**
 * ⭐ Worn — occupies one of its holder's slots (`Slotted.getAllOccupants`)
 * that is not a hand: the coat on a person, the sheathed sword, the coupe
 * in the rack. A sword in a hand is `held` (the flip, W7).
 */
function isWorn(target: Stuff): boolean {
  return occupiesHolderSlot(target);
}

/**
 * ⭐ Carried — held as contents and in none of the holder's slots but a
 * hand (in a hand, a pocket, hung from a belt). `worn`
 * and `carried` PARTITION a holder's contents: wearing a shirt never takes
 * it out of the wearer's contents (the `wear` verb only claims slots), so
 * without the partition a shirt would list in both.
 */
function isCarried(target: Stuff): boolean {
  if (!MixinApi.isContainable(target) || !target.getContainer()) return false;
  return !occupiesHolderSlot(target);
}

/**
 * ⭐ Held — in hand: in one of a carrier's HAND slots (size and carrying
 * D12, the flip — nothing sits loose on a body, so `held` no longer means
 * "loose in the contents"). A body that is no carrier keeps the old rule (a
 * wieldable's slot, or loose in no slot). A coupe in a rack is not held: a
 * rack is not a body.
 */
function isHeld(target: Stuff): boolean {
  if (!MixinApi.isContainable(target)) return false;
  const holder = target.getContainer();
  if (!holder || !holder.isAgent()) return false;
  if (MixinApi.isCarrying(holder)) return holder.tierOf(target) === 'hand';
  // A body that carries nothing the carrier's way: loose is to hand, as before.
  if (!MixinApi.isSlotted(holder)) return true;
  let slotted = false;
  for (const [slot, occupants] of holder.getAllOccupants()) {
    for (const o of occupants) {
      if ((o as unknown as Stuff).stuffId !== target.stuffId) continue;
      slotted = true;
      if ((holder.getSlotSpec(slot)?.accepts ?? '').includes('Wieldable')) return true;
    }
  }
  return !slotted;
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
  loose: { check: isLoose },
  worn: { check: isWorn },
  carried: { check: isCarried },
  held: { check: isHeld },
};

/**
 * Test whether `name` is a registered predicate. The resolver uses
 * this to decide between predicate evaluation and keyword filter
 * fallback.
 */
export function isPredicateName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(MQL_PREDICATES, name);
}

/**
 * canReach — every bound Stuff must be physically reachable from the
 * actor right now, by the ONE rule (size-and-carrying D17):
 * `PerceptionApi.canReach` — a member of `PerceptionApi.reach` (your whole
 * carried tree; the place's top level and one level into the open things
 * there; the doors and ways you can see; the fixtures) whose own
 * `Containable.reachRefusal` is `null`.
 *
 * **Why the validator exists.** MQL's `scope:` declaration is a
 * search hint, not a security gate, and MQL names the same things for
 * everybody (D23): a query like `drop online:bob:i:sword` resolves to bob's
 * sword regardless of the YAML's `scope: "inventory"`. Validators on
 * `type: object` / `type: objects` fields enforce world-state constraints
 * the resolver can't — "this thing must actually be in arm's reach" is the
 * canonical example.
 *
 * ⭐ **The refusal names the next command** (D17; D-W10-12 — shut means
 * shut, everywhere, and never an implicit open): a thing the binder bound in
 * a shut holder says *"Your belt pouch is shut — `open pouch` first."*;
 * one in the pack on your back says *"Your canvas backpack is on your back
 * — take it off first (`remove backpack`)."*; anything else *"you can't
 * reach …"*. It fires AFTER binding, and the binder only binds what the
 * giver perceives — so it never names a thing the giver could not see.
 *
 * ⭐ A DEFAULTED list passes whole (D-W10-7): a slot bound from its view's
 * `default:` (`person:[capability.suture]`) is the author's pool, not the
 * player's word — and because the slot declares this validator the BINDER
 * has already narrowed it to what is to hand where it sits
 * (`PerceptionApi.reachableAmong`; finalize run 16), so a packed spare never
 * refuses the command. When none of the pool is to hand the binder binds it
 * as though named, unflagged, and this validator says why: *"Your medic's
 * pouch is shut — `open pouch` first."*
 *
 * ⭐ A FEATURE of the place you stand in is to hand: a match that arrived
 * through a detail or a held substance on the room or vessel around you
 * (`fill skin from sea` on the deck, `read plaque`) passes — the place
 * itself is named, never laid hands on, but its features are within reach.
 *
 * Empty MQL results pass through — the controller produces the
 * `you don't see X here` message.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import type { MqlMatchVia } from '../../../api/mql';
import { MqlApi } from '../../../api/mql';
import { PerceptionApi } from '../../../api/perception';
import { MixinApi } from '../../../api/mixin';
import { GrammarApi } from '../../../api/grammar';

/** Each bound thing beside the via it was matched through, when one is known. */
function viasOf(value: unknown, n: number): (MqlMatchVia | undefined)[] {
  if (value === null || typeof value !== 'object') return new Array(n).fill(undefined);
  const v = value as { via?: MqlMatchVia; vias?: (MqlMatchVia | undefined)[] };
  if (v.vias && v.vias.length === n) return v.vias;
  return new Array(n).fill(n === 1 ? v.via : undefined);
}

/** Is `stuff` the place (or vessel) around the giver, named through a feature? */
function featureAround(giver: Stuff, stuff: Stuff, via: MqlMatchVia | undefined): boolean {
  if (!via) return false;
  const featured = (via.detailPath?.length ?? 0) > 0 || via.bulk !== undefined;
  if (!featured || !MixinApi.isContainable(giver)) return false;
  return giver.getContainer() === stuff || giver.getEnclosingPlace() === stuff;
}

/** The word a player types for `x` — its authored keyword, quoted when it has a space. */
function keywordOf(x: Stuff): string {
  const kw = (MixinApi.isPerceptible(x) ? x.getPrimaryKeyword() : undefined) ?? x.presentationPhrase().bare();
  return kw.includes(' ') ? `"${kw}"` : kw;
}

/** `x` as the giver names it — *your belt pouch* when it is on them, else as they perceive it. */
function holderWords(giver: Stuff, x: Stuff): string {
  const onYou = MixinApi.isCarrying(giver) && giver.tierOf(x) !== 'elsewhere';
  const bare = x.presentationPhrase().bare().replace(/^(a|an|the) /i, '');
  return onYou ? `Your ${bare}` : GrammarApi.cap(x.describeFor(giver));
}

/** `'s`, or `'` after a stem ending in s (*your trousers' left pocket*). */
function possessive(x: Stuff): string {
  return x.presentationPhrase().bare().endsWith('s') ? "'" : "'s";
}

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;
  // ⭐ The author's pool, not the player's word (D-W10-7).
  if (typeof value === 'object' && value !== null && (value as { defaulted?: true }).defaulted === true) {
    return undefined;
  }

  const giver = context.commandGiver as Stuff;
  const vias = viasOf(value, stuffs.length);

  for (const [i, stuff] of stuffs.entries()) {
    // ⭐ The object's own reason first — it is the honest one (D17).
    if (MixinApi.isContainable(stuff)) {
      const refusal = stuff.reachRefusal(giver);
      if (refusal !== null) {
        const by = refusal.facts.by;
        return refusal.reason === 'packed'
          ? `${holderWords(giver, by)} is on your back — take it off first (\`remove ${keywordOf(by)}\`).`
          : refusal.facts.region !== undefined
            ? `${holderWords(giver, by)}${possessive(by)} ${refusal.facts.region} is shut — \`open "${refusal.facts.region}"\` first.`
            : `${holderWords(giver, by)} is shut — \`open ${keywordOf(by)}\` first.`;
      }
    }
    if (featureAround(giver, stuff, vias[i])) continue;
    // ⭐ One definition of reach, shared with the card holds.
    if (!PerceptionApi.canReach(giver, stuff, { location: context.location ?? null })) {
      return `you can't reach ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;

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
 * ⭐ **The refusal names what works** (D17; `mustNotBeShutAway` folded in
 * here): a thing the binder bound in a shut box says *"The box is shut."*;
 * one in the pack on your back says *"The pack is on your back — take it
 * off first."*; anything else *"you can't reach …"*. It fires AFTER
 * binding, and the binder only binds what the giver perceives — so it never
 * names a thing the giver could not see.
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

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const giver = context.commandGiver as Stuff;
  const vias = viasOf(value, stuffs.length);

  for (const [i, stuff] of stuffs.entries()) {
    // ⭐ The object's own reason first — it is the honest one (D17).
    if (MixinApi.isContainable(stuff)) {
      const refusal = stuff.reachRefusal(giver);
      if (refusal !== null) {
        const by = GrammarApi.cap(refusal.facts.by.describeFor(giver));
        return refusal.reason === 'packed'
          ? `${by} is on your back — take it off first.`
          : `${by} is shut.`;
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

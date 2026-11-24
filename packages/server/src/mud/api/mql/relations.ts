/**
 * MQL's built-in relations — the one table that says what every built-in
 * `~name` means (naming overhaul D-B2). `me:~` prints it, so the grammar
 * documents itself; a view's `scope:` and a typed query read the same
 * entries, so a seed and a scope can no longer mean two things.
 *
 * Each built-in has **one answer** — no relation has two faces
 * (mql-anchors § 22): `~here` is the place you stand in, never "the place
 * and its ways and the buildings on it".
 *
 * `whose` says who may ask it of whom: `anyone` answers for any left side
 * the step applies to (`~here` of anything contained, `~inventory` of any
 * container, `~buildings` of any place); `self` answers only when the left
 * side is the asker — asked of anyone else it is empty, visibly.
 *
 * ⭐ Built-ins are consulted BEFORE a holder's own sets
 * (`RelatingMixin.relatedBy`), so a player's list named `inventory` can
 * never mask the carried things (mql-anchors § 15).
 *
 * Sealed pipeline internal (`api/mql/**`): only `api/mql.ts` and its
 * siblings import it.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../mixin';
import { StuffApi } from '../stuff';
import { PerceptionApi } from '../perception';
import type { MqlContext } from './types';
import { BUILTIN_RELATION_WORDS, type BuiltinRelationName } from '../../lib/relation/BuiltinRelations';
import {
  candidateFor,
  candidatesForFlat,
  candidatesForInventory,
  candidatesForPeers,
  candidatesForPerson,
  candidatesForReachable,
  candidatesHeldBy,
  type ScopeCandidate,
} from './scope-walk';

/** One built-in relation. */
export interface BuiltinRelation {
  name: string;
  /** The one line `which ~` prints for it. */
  meaning: string;
  /** `self`: answers only when the left side is the asker. */
  whose: 'anyone' | 'self';
  /** The set, for one left side, as the asker sees it. */
  members(left: Stuff, ctx: MqlContext): ScopeCandidate[];
}

/** The player-avatar identity family (D17's identity, never lineage). */
const AVATAR_IDENTITY_ROOT = '/platform/agent/Avatar';

/** The pronoun-memory slot a built-in reads. */
type StashSlot = 'it' | 'them' | 'him' | 'her' | 'last';

function stash(slot: StashSlot): BuiltinRelation['members'] {
  return (left, ctx) => {
    if (!MixinApi.isFocused(left)) return [];
    const stored = left.getPronounMemory().read(slot);
    if (!stored) return [];
    return stored.stuff.map((s) => ({ ...candidateFor(s, ctx.commandGiver), ...(stored.via ? { via: stored.via } : {}) }));
  };
}

/** The loaded avatar of a player id, or null. */
export function avatarOfPlayer(id: string): Stuff | null {
  return StuffApi.findByIdentityPath(`${AVATAR_IDENTITY_ROOT}/${id}`)[0] ?? null;
}

/** Each built-in word's set — keyed by the vocabulary, so a word with no set does not compile. */
const MEMBERS: Record<BuiltinRelationName, BuiltinRelation['members']> = {
  here: (left, ctx) => {
    const place = MixinApi.isContainable(left) ? left.getEnclosingPlace() : null;
    return place ? [candidateFor(place, ctx.commandGiver)] : [];
  },
  inventory: (left, ctx) =>
    left === ctx.commandGiver ? candidatesForInventory(left) : candidatesHeldBy(left, false, ctx.commandGiver),
  peers: (left) => candidatesForPeers(left),
  reachable: (left) => candidatesForReachable(left),
  person: (left) => candidatesForPerson(left),
  horizon: (left) => candidatesForFlat(PerceptionApi.horizonFor(left).things.map((t) => t.stuff), left),
  buildings: (left, ctx) =>
    left.isPlace() ? candidatesForFlat(left.landedStructuresNow() as unknown as Stuff[], ctx.commandGiver) : [],
  // ⭐ Everyone you KEEP — every contact list and every managed group you
  // belong to (owner, naming-overhaul review: `~contacts` promised the union of
  // every built-in; it never was). Yourself excluded.
  contacts: (left, ctx) => {
    if (!MixinApi.isContacts(left)) return [];
    const out: Stuff[] = [];
    const seen = new Set<string>([left.stuffId]);
    const keep = (s: Stuff | null): void => {
      if (s !== null && !seen.has(s.stuffId)) {
        seen.add(s.stuffId);
        out.push(s);
      }
    };
    for (const e of left.allContacts()) {
      keep(e.kind === 'avatar' ? avatarOfPlayer(e.playerId) : (StuffApi.findByIdentityPath(e.templatePath)[0] ?? null));
    }
    for (const g of left.residentGroups()) {
      for (const id of g.memberIds) keep(id.startsWith('/') ? (StuffApi.findByIdentityPath(id)[0] ?? null) : avatarOfPlayer(id));
    }
    return candidatesForFlat(out, ctx.commandGiver);
  },
  it: stash('it'),
  them: stash('them'),
  him: stash('him'),
  her: stash('her'),
  last: stash('last'),
};

const BUILTINS: readonly BuiltinRelation[] = BUILTIN_RELATION_WORDS.map((w) => ({ ...w, members: MEMBERS[w.name] }));

/** The built-ins, by name. */
export const BUILTIN_RELATIONS: ReadonlyMap<string, BuiltinRelation> = new Map(
  BUILTINS.map((b) => [b.name, b]),
);

/** Every built-in, in table order (what `me:~` lists first). */
export function builtinRelations(): readonly BuiltinRelation[] {
  return BUILTINS;
}

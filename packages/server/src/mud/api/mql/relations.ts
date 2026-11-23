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
  /** The one line `thing:~` prints for it. */
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

const BUILTINS: readonly BuiltinRelation[] = [
  {
    name: 'here',
    meaning: 'the place you stand in',
    whose: 'anyone',
    members: (left, ctx) => {
      const place = MixinApi.isContainable(left) ? left.getEnclosingPlace() : null;
      return place ? [candidateFor(place, ctx.commandGiver)] : [];
    },
  },
  {
    name: 'inventory',
    meaning: 'what is carried',
    whose: 'anyone',
    members: (left, ctx) =>
      left === ctx.commandGiver ? candidatesForInventory(left) : candidatesHeldBy(left, false, ctx.commandGiver),
  },
  {
    name: 'peers',
    meaning: 'what stands where you are, and one level into open things there',
    whose: 'self',
    members: (left) => candidatesForPeers(left),
  },
  {
    name: 'reachable',
    meaning: 'everything within reach — carried, standing here, and the place',
    whose: 'self',
    members: (left) => candidatesForReachable(left),
  },
  {
    name: 'person',
    meaning: 'your body and what you wear and hold',
    whose: 'self',
    members: (left) => candidatesForPerson(left),
  },
  {
    name: 'horizon',
    meaning: 'what you can see from here that is not here',
    whose: 'self',
    members: (left) => candidatesForFlat(PerceptionApi.horizonFor(left).things.map((t) => t.stuff), left),
  },
  {
    name: 'buildings',
    meaning: 'the buildings whose door is at hand from this place',
    whose: 'anyone',
    members: (left, ctx) =>
      left.isPlace() ? candidatesForFlat(left.landedStructuresNow() as unknown as Stuff[], ctx.commandGiver) : [],
  },
  {
    // ⭐ Everyone you KEEP — every contact list and every managed group you
    // belong to (owner, naming-overhaul review: `~contacts` promised the union of
    // every built-in; it never was). Yourself excluded.
    name: 'contacts',
    meaning: 'everyone on your contact lists or in your groups who is in the world',
    whose: 'self',
    members: (left, ctx) => {
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
  },
  { name: 'it', meaning: 'the thing you last named', whose: 'self', members: stash('it') },
  { name: 'them', meaning: 'the things you last named', whose: 'self', members: stash('them') },
  { name: 'him', meaning: 'the man you last named', whose: 'self', members: stash('him') },
  { name: 'her', meaning: 'the woman you last named', whose: 'self', members: stash('her') },
  { name: 'last', meaning: 'what your last query found', whose: 'self', members: stash('last') },
];

/** The built-ins, by name. */
export const BUILTIN_RELATIONS: ReadonlyMap<string, BuiltinRelation> = new Map(
  BUILTINS.map((b) => [b.name, b]),
);

/** Every built-in, in table order (what `me:~` lists first). */
export function builtinRelations(): readonly BuiltinRelation[] {
  return BUILTINS;
}

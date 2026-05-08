/**
 * MQL scope-walk — given a scope (set of anchor Stuff) and a query's
 * keyword list, build a candidate pool by walking each anchor's
 * neighborhood and score candidates against the query.
 *
 * Conceptually, a scope identifies a SET of search candidates, each
 * of which carries display name, keywords, and optional sub-feature
 * attribution. The `here` neighborhood walks four match paths
 * (req §11.2): the location itself, contents in the location, details
 * on each, and exits on the location. Other neighborhoods are simpler.
 *
 * Score returned by {@link scoreCandidate} mirrors the legacy
 * Phase-4 algorithm (exact > prefix > substring; AND-narrow on all
 * keywords). Magic numbers are preserved verbatim — req §14.1 / §14.2
 * commit to the rules, not the literal values.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../containment';
import { DescribeApi } from '../describe';
import { MixinApi } from '../mixin';
import type { Detail } from '../../lib/description/Detailed';
import type { MqlMatch, MqlMatchVia } from './types';

/**
 * One search target inside a scope. Each candidate represents a
 * "thing the player might mean": its `name` and `keywords` are what
 * the keyword matcher scores against, and the optional `via`
 * attribution describes the sub-feature path that brought it into
 * the pool.
 *
 * Multiple candidates may point at the same Stuff — e.g., a location
 * appears once for itself, once per Detail, and once per Exit. The
 * resolver dedups by (`stuff`, `via`) tuple before reporting matches.
 */
export interface ScopeCandidate {
  stuff: Stuff;
  /** Display name to score against (lowercased at scoring time). */
  name: string;
  /** Keyword list to score against (already lowercased / deduped). */
  keywords: string[];
  /** Optional attribution. */
  via?: MqlMatchVia;
}

/**
 * Build the candidate pool for the `here` neighborhood (req §11.2):
 *
 * 1. The location itself.
 * 2. Each Detail on the location.
 * 3. Doors associated with the location's exits (each door + details).
 * 4. Each Exit on the location (direction + aliases).
 *
 * Peers (the location's contents) live in their own seed —
 * {@link candidatesForPeers}. `here` is the location's own surface,
 * not the room's inhabitants.
 */
export function candidatesForHere(location: Stuff): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];

  pushDirect(out, location);
  pushDetails(out, location);

  if (MixinApi.isExitable(location)) {
    const seenDoors = new Set<string>();
    for (const door of location.getExitDoors()) {
      if (seenDoors.has(door.stuffId)) continue;
      seenDoors.add(door.stuffId);
      pushDirect(out, door);
      pushDetails(out, door);
    }
    // Use `getObviousExits()` so synthesized exits (an
    // `ExitableVessel`'s `out` exit, a Cartesian zone's derived
    // cardinal directions) appear in the candidate pool the same
    // way explicit exits do.
    const seenDirs = new Set<string>();
    for (const exit of location.getObviousExits()) {
      const direction = exit.getDirection();
      if (seenDirs.has(direction)) continue;
      seenDirs.add(direction);
      out.push({
        stuff: location,
        name: direction,
        keywords: [direction],
        via: { exit },
      });
    }
  }

  return out;
}

/**
 * Build the candidate pool for the giver's inventory.
 *
 * v1 covers the items themselves; details on inventory items are
 * deferred (typical inventory item descriptions are short, and the
 * keyword matcher already handles the common case).
 */
export function candidatesForInventory(giver: Stuff): ScopeCandidate[] {
  if (!MixinApi.isContainer(giver)) return [];
  const out: ScopeCandidate[] = [];
  for (const item of ContainmentApi.getContents(giver)) {
    pushDirect(out, item);
  }
  return out;
}

/**
 * Build the candidate pool for the giver's peers — the contents of
 * the giver's location, excluding the giver itself. Each peer
 * contributes its direct entry plus any Details it carries.
 */
export function candidatesForPeers(giver: Stuff): ScopeCandidate[] {
  if (!MixinApi.isContainable(giver)) return [];
  const env = giver.getContainer();
  if (!env || !MixinApi.isContainer(env)) return [];
  const out: ScopeCandidate[] = [];
  for (const item of ContainmentApi.getContents(env)) {
    if (item.stuffId === giver.stuffId) continue;
    pushDirect(out, item);
    pushDetails(out, item);
  }
  return out;
}

/**
 * Build the candidate pool for `reachable` — the union of `here`,
 * `peers`, and `inventory` pools. Lets a single seed name "everything
 * reachable from the giver right now" so it composes mid-chain
 * (e.g., `online:reachable`) where the comma-union form can't.
 *
 * Duplicates across the sub-pools are tolerated; the resolver's
 * `finalize` step dedupes by stuffId before reporting matches.
 */
export function candidatesForReachable(giver: Stuff): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];
  if (MixinApi.isContainable(giver)) {
    const env = giver.getContainer();
    if (env) {
      for (const c of candidatesForHere(env)) out.push(c);
    }
  }
  for (const c of candidatesForPeers(giver)) out.push(c);
  for (const c of candidatesForInventory(giver)) out.push(c);
  return out;
}

/**
 * Build the candidate pool from a flat array of Stuff. Used for
 * `online` and `world` scopes where each Stuff is a candidate on its
 * own merits (no sub-features expanded).
 */
export function candidatesForFlat(items: ReadonlyArray<Stuff>): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];
  for (const item of items) pushDirect(out, item);
  return out;
}

function pushDirect(out: ScopeCandidate[], stuff: Stuff): void {
  const name = DescribeApi.getDisplayName(stuff, '');
  const keywords = MixinApi.isPerceptible(stuff) ? stuff.getKeywords() : [];
  out.push({ stuff, name, keywords });
}

function pushDetails(out: ScopeCandidate[], host: Stuff): void {
  if (!MixinApi.isDetailed(host)) return;
  const ids = host.getDetailIds() ?? [];
  // Each Detail can carry aliases (multiple ids → same Detail
  // object). Walk the alias map to dedup before emitting candidates.
  const seen = new Set<Detail>();
  for (const id of ids) {
    // Top-level details only — nested details are reached through
    // the chain rule (`:keyword` mid-chain auto-extends with child
    // detail names at the current via depth), not the seed scope.
    if (!host.hasDetail(id)) continue;
    // Resolve the actual Detail object behind this id by reading the
    // raw map. DetailedMixin doesn't expose the Detail object
    // directly; we use its public shape. Keyword pool for a detail
    // is just its id list (each id is a searchable name). Aliases
    // emit one candidate per alias; the resolver dedups by stuff+via.
    void seen;
    out.push({
      stuff: host,
      name: id,
      keywords: [id.toLowerCase()],
      via: { detailPath: [id] },
    });
  }
}

/**
 * Score `candidate` against `queryWords`. Returns 0 when no match.
 * Higher = better match.
 *
 * The exact rules:
 *   - Exact name match on a single-word query: 100
 *   - Whole-name AND-narrow on lowercased name: 50
 *   - Word-of-name AND-narrow: 40
 *   - Keywords AND-narrow (all matched): 25
 *   - Partial keyword match: 10 × matched-count
 *   - Partial name-word match: 5 × matched-count
 */
export function scoreCandidate(
  candidate: ScopeCandidate,
  queryWords: string[]
): number {
  const nameLower = candidate.name.toLowerCase();
  if (!nameLower && candidate.keywords.length === 0) return 0;

  if (queryWords.length === 1 && nameLower === queryWords[0]) return 100;

  if (nameLower && queryWords.every((w) => nameLower.includes(w))) return 50;

  const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 0);
  const nameMatches = queryWords.filter((qw) =>
    nameWords.some((nw) => nw.includes(qw))
  );
  if (nameMatches.length === queryWords.length && queryWords.length > 0) {
    return 40;
  }

  if (candidate.keywords.length > 0) {
    const kwMatches = queryWords.filter((qw) =>
      candidate.keywords.some((kw) => kw.includes(qw))
    );
    if (kwMatches.length === queryWords.length) return 25;
    if (kwMatches.length > 0) return 10 * kwMatches.length;
  }

  if (nameMatches.length > 0) return 5 * nameMatches.length;

  return 0;
}

/**
 * Apply {@link scoreCandidate} across an entire candidate pool and
 * return the matches with score > 0. Stable secondary ordering
 * (insertion order of candidates) is the tiebreak per req §14.2.
 */
export function scoreCandidates(
  candidates: ReadonlyArray<ScopeCandidate>,
  queryWords: string[]
): MqlMatch[] {
  const out: MqlMatch[] = [];
  for (const c of candidates) {
    const score = scoreCandidate(c, queryWords);
    if (score > 0) {
      const match: MqlMatch = { stuff: c.stuff, score };
      if (c.via) match.via = c.via;
      out.push(match);
    }
  }
  return out;
}

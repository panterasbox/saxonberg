/**
 * MQL scope-walk — given a scope (set of anchor Stuff) and a query's
 * keyword list, build a candidate pool by walking each anchor's
 * neighborhood and score candidates against the query.
 *
 * Conceptually, a scope identifies a SET of search candidates, each
 * of which carries the keywords the object answers to and optional
 * sub-feature attribution. WHICH things the giver's reach pools hold
 * (`here` · `peers` · `inventory` · `person` · `reachable`) is
 * `PerceptionApi.reach`'s, the one definition `canReach` reads too; this
 * file builds and scores their candidates.
 *
 * Score returned by {@link scoreCandidate} is the keyword tier
 * (`GrammarApi.TIER_PHRASE` and below) — one list, the object's own; the
 * name is not special (one-resolution slate § 4).
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import { GrammarApi } from '../grammar';
import { MixinApi } from '../mixin';
import { PerceptionApi, type ReachPool } from '../perception';
import type { MqlMatch, MqlMatchVia } from './types';

/**
 * One search target inside a scope. Each candidate represents a
 * "thing the player might mean": its `keywords` are what the scorer
 * reads — the object's own face for the viewer, and nothing else (the
 * name is one of them; see {@link candidateFor}) — and the optional
 * `via` attribution describes the sub-feature path that brought it into
 * the pool.
 *
 * Multiple candidates may point at the same Stuff (a chain step inside
 * a detail tree). The resolver dedups by (`stuff`, `via`) tuple before
 * reporting matches.
 */
export interface ScopeCandidate {
  stuff: Stuff;
  /** Keyword list to score against (lowercased). */
  keywords: string[];
  /** Optional attribution. */
  via?: MqlMatchVia;
  /**
   * The features of the object a match may be ATTRIBUTED to — a detail,
   * the held substance. Words a subset of `keywords`; see
   * {@link candidateFor}.
   */
  facets?: ScopeFacet[];
}

/** One attributable feature of a candidate — its words and its via. */
export interface ScopeFacet {
  keywords: string[];
  via: MqlMatchVia;
}

/**
 * ⭐⭐ **MQL's reach pools are FILTERS over `PerceptionApi.reach`** — the
 * one definition of what the giver can lay hands on (controller-liquidity
 * W20; one rule since size-and-carrying D17), the same list `canReach` /
 * `reachableAmong` test membership in. Which things are in a pool is
 * decided there and only there; this file turns each into a candidate (the
 * keyword face, the facets) in the order `reach` emits — the person
 * nearest first (hand · ready · packed), then the place's surface, then
 * what stands there.
 *
 * ⛔ **No perception here** (D23): the resolver names the same things for
 * every viewer. A surface that binds or shows the result filters it with
 * `PerceptionApi.perceived`.
 */
function candidatesFromReach(
  giver: Stuff,
  pools: readonly ReachPool[],
  viewer: Stuff | null = giver,
): ScopeCandidate[] {
  return PerceptionApi.reach(giver, { pools }).map((r) => candidateFor(r.stuff, viewer));
}

/**
 * The `here` pool — the surface of the place the giver is in, and of the
 * vessel it sits in when that is not the place: the place itself, the
 * doors of the ways it can see, those ways (an `ExitableVessel`'s `out`,
 * a Cartesian zone's cardinals included), the buildings whose landing it
 * is, open ground seen across a way. Never what stands there (`peers`).
 */
export function candidatesForHere(giver: Stuff, viewer: Stuff | null = giver): ScopeCandidate[] {
  return candidatesFromReach(giver, ['around', 'here'], viewer);
}

/**
 * The giver's inventory — everything it carries, its whole carried tree
 * (never into another body), nearest first: hand · ready · packed (D17).
 * A thing behind a shut lid or in a pack on the back is IN the pool — the
 * verb's `canReach` says *the box is shut* / *take it off first* after
 * binding.
 */
export function candidatesForInventory(giver: Stuff): ScopeCandidate[] {
  return candidatesFromReach(giver, ['inventory']);
}

/**
 * The giver's peers — what stands in the place with it, and in the vessel
 * it sits in (the passenger beside you in a shut coach), one level into
 * open things there; fixtures included, because a sconce is a thing a
 * person hangs and takes down while `here` is the surface you never pick
 * up. Never the giver itself.
 */
export function candidatesForPeers(giver: Stuff, viewer: Stuff | null = giver): ScopeCandidate[] {
  return candidatesFromReach(giver, ['peers'], viewer);
}

/**
 * The **on-person** pool — the giver, what is attached to it (slot
 * occupants, the apps an implant hosts) and what it carries; nothing of
 * the room's. The `person` seed's pool. Bearer-semantics consumers (a
 * presented key, a payment credential, a hosted comms app) anchor here so
 * a matching item lying on the floor never counts as "presented".
 */
export function candidatesForPerson(giver: Stuff): ScopeCandidate[] {
  return candidatesFromReach(giver, ['self', 'attached', 'inventory']);
}

/**
 * `reachable` — everything the giver can lay hands on, and the place and
 * vessel that hold it (`around`, named but not touched): all six pools,
 * person first (first-match consumers and tie-broken keyword targeting
 * prefer your own gear over the floor's), the giver itself last.
 * Composes mid-chain (`online:reachable`) where the comma-union form
 * can't. The giver is in it: `look bob` when you are bob finds you. Duplicates across pools are
 * tolerated; the resolver's `finalize` dedupes.
 */
export function candidatesForReachable(giver: Stuff): ScopeCandidate[] {
  // ⭐ Its light is walked once per place by the resolution that calls it
  // (`MqlLogic` runs every resolution as a steady read).
  // ⭐ The giver LAST (size and carrying drive, step 12): a noun that names
  // a kind of person — `i human`, `attack human` — names someone else in
  // the room before it names you. On `self` first, `attack human` answered
  // "You can't attack yourself" and `i human` listed your own clothes.
  // `look bob` when you are bob still finds you: nobody else answers.
  return candidatesFromReach(giver, ['attached', 'inventory', 'around', 'here', 'peers', 'self']);
}

/**
 * ⭐ **A holder read from OUTSIDE** — the mid-chain seed on somebody or
 * something else (`bob:inventory`, `crate:person`): what it holds and
 * wears, its own top level and one level into the open things there, as
 * the room is read (D17). Never down through another body's bags: those
 * are the BEARER's tree, not a passer-by's. WHICH things depends on the
 * anchor alone, so it is the same set for every asker; `viewer` is handed
 * only to each thing's own keyword face (names are the asker's).
 */
export function candidatesHeldBy(anchor: Stuff, withSelf: boolean, viewer: Stuff | null): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];
  const seen = new Set<string>();
  const push = (x: Stuff): void => {
    if (seen.has(x.stuffId)) return;
    seen.add(x.stuffId);
    out.push(candidateFor(x, viewer));
  };
  if (withSelf) {
    push(anchor);
    if (MixinApi.isSlotted(anchor)) {
      for (const occupants of anchor.getAllOccupants().values()) for (const o of occupants) push(o);
    }
  }
  if (MixinApi.isContainer(anchor)) {
    noteTouched(anchor);
    for (const x of anchor.getReachableContents()) push(x);
  }
  return out;
}

/**
 * Build the candidate pool from a flat array of Stuff. Used for
 * `online` and `world` scopes where each Stuff is a candidate on its
 * own merits (no sub-features expanded).
 */
export function candidatesForFlat(items: ReadonlyArray<Stuff>, viewer: Stuff | null): ScopeCandidate[] {
  return items.map((item) => candidateFor(item, viewer));
}

/**
 * ⭐ What a TRACKED resolve read (crowded-rooms N2): every candidate it
 * tested, the holder each candidate stands in, and every holder whose
 * contents it enumerated. Live only inside {@link trackTouched}; a resolve
 * nobody asked about pays nothing. A live subscription installs a
 * dependency on each, so it wakes when any of them fires — a newcomer
 * arriving fires `contents` on the place it was enumerated from.
 */
let touchedSink: Set<Stuff> | null = null;

/** Run `run` recording what it reads; the record is returned beside its value. */
export function trackTouched<T>(run: () => T): { value: T; touched: Stuff[] } {
  const prev = touchedSink;
  const sink = new Set<Stuff>();
  touchedSink = sink;
  try {
    const value = run();
    return { value, touched: [...sink] };
  } finally {
    touchedSink = prev;
  }
}

/** Note that a tracked resolve read `stuff` (a no-op outside one). */
export function noteTouched(stuff: Stuff): void {
  if (touchedSink === null) return;
  touchedSink.add(stuff);
}

/**
 * ⭐ **The one candidate an object makes — read off its own face.** MQL
 * reads a Stuff ONLY through what it says it answers to: its keywords for
 * `viewer` (`perceivedKeywordsFor` — what a person is perceived as, a
 * thing's own `getKeywords(viewer)`), never a word built here. A name is
 * one of those keywords (`NamedMixin.getKeywords` folds it in), a detail
 * id is one (`DetailedMixin.getKeywords`), and so is the substance a
 * vessel holds (`BulkableMixin.getKeywords` — `drink coffee` binds the
 * cup). The one-resolution slate § 5.
 *
 * The **facets** are attribution, not words: when the words that matched
 * are a detail's id or the held substance's, the match carries
 * `via.detailPath` / `via.bulk` as a fact, so `look sigil` still says
 * which feature of the host was meant. Each facet's words are a subset of
 * `keywords`, read from the same mixin surface that put them there.
 *
 * ⚠ `viewer` is not optional in spirit. A detail key is a targeting
 * token, so an item that answers to `sigil` has told you what it is
 * before you look at anything. `null` is system mode.
 */
export function candidateFor(stuff: Stuff, viewer: Stuff | null): ScopeCandidate {
  if (touchedSink !== null) {
    touchedSink.add(stuff);
    const holder = MixinApi.isContainable(stuff) ? stuff.getContainer() : null;
    if (holder !== null) touchedSink.add(holder as unknown as Stuff);
  }
  const said = (viewer ? stuff.perceivedKeywordsFor(viewer) : ownKeywords(stuff, undefined))
    .map((k) => k.toLowerCase());
  // ⭐ What answers to a word answers to its plural: `all watches`, `get all
  // swords` (the grammar's own examples, and the drive's `wind@"all watches"`).
  const keywords = [...new Set([...said, ...said.map((k) => GrammarApi.pluralize(stuff, k))])];
  const facets: ScopeFacet[] = [];
  if (MixinApi.isDetailed(stuff)) {
    // Top-level details only — nested details are reached through the
    // chain rule (`:keyword` mid-chain auto-extends with child detail
    // names at the current via depth).
    for (const id of stuff.getDetailIds(undefined, viewer ?? undefined) ?? []) {
      facets.push({ keywords: [id.toLowerCase()], via: { detailPath: [id] } });
    }
  }
  if (MixinApi.isPlacing(stuff)) {
    // ⭐ A named region (a coat's `inner pocket`) is a facet of its host.
    for (const name of stuff.namedRegions()) {
      facets.push({ keywords: [name.toLowerCase()], via: { region: name } });
    }
  }
  if (MixinApi.isBulkable(stuff)) {
    for (const affordance of ['interior', 'surface'] as const) {
      const held = stuff.getHeldKeywords(affordance);
      if (held.length > 0) facets.push({ keywords: held, via: { bulk: { affordance } } });
    }
  }
  const c: ScopeCandidate = { stuff, keywords };
  if (facets.length > 0) c.facets = facets;
  return c;
}

/** The keyword face with no viewer (system mode, the slow path's anchor). */
function ownKeywords(stuff: Stuff, viewer: Stuff | undefined): string[] {
  if (MixinApi.isPerceptible(stuff)) return stuff.getKeywords(viewer);
  if (MixinApi.isNamed(stuff)) return stuff.getKeywords(viewer);
  return [];
}

/**
 * Score `candidate` against `queryWords` by its keywords alone — the
 * naming rule is `GrammarApi`'s (naming overhaul D-C1); this reads the
 * candidate's one list into it. 0 when no match; higher is better.
 */
export function scoreCandidate(
  candidate: ScopeCandidate,
  queryWords: string[]
): number {
  return GrammarApi.scoreAll([candidate.keywords], queryWords)[0] ?? 0;
}

/**
 * The attribution a match carries: the facet whose words reach the
 * match's own score when the rest of the keywords do not. `look sigil` on
 * the wand is its `sigil` detail; `look wand` is the wand.
 */
function attributionOf(c: ScopeCandidate, queryWords: string[], score: number): MqlMatchVia | undefined {
  if (!c.facets) return c.via;
  const facetWords = new Set(c.facets.flatMap((f) => f.keywords));
  const [rest = 0, ...facetScores] = GrammarApi.scoreAll(
    [c.keywords.filter((k) => !facetWords.has(k)), ...c.facets.map((f) => f.keywords)],
    queryWords,
  );
  if (rest >= score) return c.via;
  const reached = c.facets.filter((_, i) => (facetScores[i] ?? 0) >= score);
  // ⭐ A word naming several chambers of this one host (`pocket` on a coat)
  // names the host, not a chamber (size and carrying D-W10-6): the
  // container decides among alike chambers and `put` asks among differing.
  if (reached.length > 1 && reached.every((f) => f.via.region !== undefined)) return c.via;
  const f = reached[0];
  return f !== undefined ? { ...c.via, ...f.via } : c.via;
}

/**
 * One candidate scored as a match — its score and the attribution the
 * words that matched carry — or `null` when it does not answer at all.
 */
export function matchCandidate(c: ScopeCandidate, queryWords: string[]): MqlMatch | null {
  return matchScored(c, queryWords, scoreCandidate(c, queryWords));
}

/** {@link matchCandidate} for a score already computed (the batch path). */
function matchScored(c: ScopeCandidate, queryWords: string[], score: number): MqlMatch | null {
  if (score <= 0) return null;
  const match: MqlMatch = { stuff: c.stuff, score };
  const via = attributionOf(c, queryWords, score);
  if (via) match.via = via;
  return match;
}

/**
 * Apply {@link scoreCandidate} across an entire candidate pool and
 * return the matches with score > 0. Stable secondary ordering
 * (insertion order of candidates) is the tiebreak per req §14.2.
 *
 * ⭐ The highest tier present cuts every tier below it, and a candidate
 * that answers to EVERY word (`GrammarApi.TIER_PREFIX` or better) cuts every
 * partial absolutely — a partial is a fallback for when nothing names the
 * whole phrase, never a companion to one (`get "latex cup"` once picked
 * up the three cups AND the coagulating pan, whose keywords say "latex
 * pan"). Things that answer alike still prompt (`look rod` among three
 * rods).
 */
export function scoreCandidates(
  candidates: ReadonlyArray<ScopeCandidate>,
  queryWords: string[]
): MqlMatch[] {
  // ⭐ One Api call for the whole pool (a crowd pays one frame).
  const scores = GrammarApi.scoreAll(candidates.map((c) => c.keywords), queryWords);
  const out: MqlMatch[] = [];
  candidates.forEach((c, i) => {
    const match = matchScored(c, queryWords, scores[i] ?? 0);
    if (match) out.push(match);
  });
  for (const floor of [GrammarApi.TIER_PHRASE, GrammarApi.TIER_WORDS, GrammarApi.TIER_PREFIX]) {
    if (out.some((m) => m.score >= floor)) return out.filter((m) => m.score >= floor);
  }
  return out;
}

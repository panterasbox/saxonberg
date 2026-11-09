/**
 * MQL scope-walk — given a scope (set of anchor Stuff) and a query's
 * keyword list, build a candidate pool by walking each anchor's
 * neighborhood and score candidates against the query.
 *
 * Conceptually, a scope identifies a SET of search candidates, each
 * of which carries the keywords the object answers to and optional
 * sub-feature attribution. The `here` neighborhood is the location
 * itself, its doors and its exits; peers are what stands in it. Other
 * neighborhoods are simpler.
 *
 * Score returned by {@link scoreCandidate} is the keyword tier
 * ({@link TIER_PHRASE} and below) — one list, the object's own; the
 * name is not special (one-resolution slate § 4).
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { GrammarApi } from '../grammar';
import { MixinApi } from '../mixin';
import { PerceptionApi } from '../perception';
import Place from '../../lib/stuff/Place';
import type { MqlMatch, MqlMatchVia } from './types';
import type { ReachDepth } from '../command';

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
 * Build the candidate pool for the `here` neighborhood (req §11.2):
 *
 * 1. The location itself (its details are its own keywords — see
 *    {@link candidateFor}).
 * 2. Doors associated with the location's exits.
 * 3. Each Exit the viewer can see — the exit itself, by its direction
 *    and keywords.
 *
 * Peers (the location's contents) live in their own seed —
 * {@link candidatesForPeers}. `here` is the location's own surface,
 * not the room's inhabitants.
 */
export function candidatesForHere(
  location: Stuff,
  viewer: Stuff,
  attention?: number,
): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];

  pushDirect(out, location, viewer, attention);

  if (MixinApi.isExitable(location)) {
    const seenDoors = new Set<string>();
    for (const door of location.getExitDoors()) {
      if (seenDoors.has(door.stuffId)) continue;
      seenDoors.add(door.stuffId);
      pushDirect(out, door, viewer, attention);
    }
    // ⭐ Each exit the VIEWER can see is a candidate in its own right
    //: its `stuff` IS the way, read like every other
    // candidate through its Perceptible face — the name and keywords are
    // the EXIT's (`Exit.getKeywords`: authored + direction + short forms),
    // never built here. `obviousExitsFor(viewer)` so a
    // hidden way stays hidden and synthesized exits (an `ExitableVessel`'s
    // `out`, a Cartesian zone's cardinals) appear like explicit ones.
    // `look north` describes the way; `open north` reaches its door
    // through `MqlApi.effectiveTarget`; `go north` crosses it.
    for (const exit of location.obviousExitsFor(viewer)) {
      pushDirect(out, exit, viewer, attention);
    }
    // ⭐ The buildings whose LANDING this is (paint build, 2026-10-31): a
    // structure is an Idea, never in a room, so it enters the pool from
    // where it meets the weather — `look cottage` from the lane, `paint
    // hesper` from the quay — with no new seed.
    if (location instanceof Place) {
      for (const structure of location.landedStructuresNow()) {
        pushDirect(out, structure, viewer, attention);
      }
    }
    // ⭐ A place read from where it is reached (tracts build D30): open
    // ground through an exit binds by its own name from this side, so
    // `look upper bench` from the yard needs no new seed. Only the place
    // — never what stands in it — and only when it is loaded already.
    const seenPlaces = new Set<string>();
    for (const exit of location.obviousExitsFor(viewer)) {
      const far = exit.peekDestination();
      if (!far || far === location || !far.isPlace()) continue;
      if (!(far as Stuff & Place).isSeenAcrossExit()) continue;
      if (seenPlaces.has(far.stuffId)) continue;
      seenPlaces.add(far.stuffId);
      pushDirect(out, far, viewer, attention);
    }
  }

  return out;
}

/**
 * Build the candidate pool for the giver's inventory — what it carries, at
 * the reach rung (`Container.getReachableContents`): `top` its own
 * contents, `open` (the default) and inside the open vessels among them,
 * all the way down; `deep` everything, shut or not.
 *
 * v1 covers the items themselves; details on inventory items are
 * deferred (typical inventory item descriptions are short, and the
 * keyword matcher already handles the common case).
 */
export function candidatesForInventory(
  giver: Stuff,
  attention?: number,
  depth?: ReachDepth,
): ScopeCandidate[] {
  if (!MixinApi.isContainer(giver)) return [];
  const out: ScopeCandidate[] = [];
  for (const item of giver.getReachableContents(depth ?? 'open')) {
    pushDirect(out, item, giver, attention);
  }
  return out;
}

/**
 * Build the candidate pool for the giver's peers — the contents of
 * the giver's location, excluding the giver itself. Each peer
 * contributes one candidate (its details are among its keywords).
 *
 * Fixtures count as peers. A wall sconce, a neon sign, a mounted TV is
 * an object standing in the room with you, even though it rides the
 * room's `getFixtures()` rather than its `getContents()` — and it is
 * `peers`, not `here`, precisely because `here` is the surface you
 * never pick up (the room, its details, its exits and their doors)
 * while a fixture is a thing a person hangs and takes down. Without
 * this every fixture in the game is unnameable by every verb: `look
 * sconce` finds nothing, `switch sconce on` finds nothing, and a lamp a
 * player hung cannot be taken back down.
 */
export function candidatesForPeers(
  giver: Stuff,
  attention?: number,
  depth?: ReachDepth,
): ScopeCandidate[] {
  if (!MixinApi.isContainable(giver)) return [];
  // ⭐ Anchored on the PLACE (controller-liquidity D7) — in a boat on the
  // river, what stands on the river — and on the vessel the giver sits in
  // when that is not the place: the passenger beside you in a shut coach
  // is to hand though the coach's lid is between you and the road.
  const place = giver.getEnclosingPlace();
  const immediate = giver.getContainer();
  const holders: (Stuff & Container)[] = [];
  for (const h of [place, immediate]) {
    if (h && MixinApi.isContainer(h) && !holders.some((x) => x.stuffId === h.stuffId)) {
      holders.push(h);
    }
  }
  const out: ScopeCandidate[] = [];
  const seen = new Set<string>([giver.stuffId]);
  for (const env of holders) {
    // One level into an OPEN container standing in the room — the glass
    // rack's coupes, the floor stock's kegs, a crate's limes — at the
    // default rung: the ONE walk (`Container.getReachableContents`) that
    // `PerceptionApi.canReach` reads too, so what this scope offers is
    // what a hand can take.
    for (const item of env.getReachableContents(depth ?? 'open')) {
      if (seen.has(item.stuffId)) continue;
      seen.add(item.stuffId);
      pushDirect(out, item, giver, attention);
    }
    if (MixinApi.isAdornable(env)) {
      for (const fixture of env.getFixtures()) {
        if (seen.has(fixture.stuffId)) continue;
        seen.add(fixture.stuffId);
        pushDirect(out, fixture, giver, attention);
      }
    }
  }
  return out;
}


/**
 * Build the candidate pool for `reachable` — the union of the giver,
 * `here`, `peers`, and `inventory` pools. Lets a single seed name
 * "everything reachable from the giver right now" so it composes
 * mid-chain (e.g., `online:reachable`) where the comma-union form
 * can't.
 *
 * The giver itself is in the pool: you can reach yourself, and
 * scope-walked queries for the giver's own keywords (`look bob`
 * when you are bob) need to find it. Pronouns (`me`) and the
 * sub-pools (`here`, `peers`, `inventory`) all keep their stricter
 * meanings.
 *
 * Duplicates across the sub-pools are tolerated; the resolver's
 * `finalize` step dedupes by stuffId before reporting matches.
 */
/**
 * The **on-person** pool — everything the giver carries *as* their
 * person, and nothing of the room's: self → own attunement-hosted
 * updates → installed slot occupants (+ each attuned occupant's
 * hosted updates) → carried inventory (+ each carried attuned host's
 * hosted updates). The `person` seed's pool, and the on-person half
 * of `reachable`. Bearer-semantics consumers (a presented key, a
 * payment credential, a hosted comms/forums app) anchor here so a
 * matching item lying on the floor never counts as "presented".
 */
export function candidatesForPerson(
  giver: Stuff,
  attention?: number,
  depth?: ReachDepth,
): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];
  pushDirect(out, giver, giver, attention);
  pushHostedUpdates(out, giver, giver, attention);
  if (MixinApi.isSlotted(giver)) {
    for (const occupants of giver.getAllOccupants().values()) {
      for (const occ of occupants) {
        pushDirect(out, occ, giver, attention);
        pushHostedUpdates(out, occ, giver, attention);
      }
    }
  }
  for (const c of candidatesForInventory(giver, attention, depth)) out.push(c);
  if (MixinApi.isContainer(giver)) {
    for (const item of giver.getContents()) {
      pushHostedUpdates(out, item, giver, attention);
    }
  }
  return out;
}

export function candidatesForReachable(
  giver: Stuff,
  attention?: number,
  depth?: ReachDepth,
): ScopeCandidate[] {
  // ⭐ Its light is walked once per place by the resolution that calls it
  // (`MqlLogic` runs every resolution as a steady read).
  //
  // ON-PERSON-FIRST emission order (the former `findReachable`
  // contract, now the seed's): the whole `person` pool, then the
  // surrounding place, then peers. First-match consumers (`.find`
  // over the pool) and tie-broken keyword targeting both prefer your
  // own gear over the floor's.
  const out = candidatesForPerson(giver, attention, depth);
  if (MixinApi.isContainable(giver)) {
    // The place's surface, and the vessel's you sit in when that is not
    // the place (a coach's door and its way `out`).
    const place = giver.getEnclosingPlace();
    if (place) {
      for (const c of candidatesForHere(place, giver, attention)) out.push(c);
    }
    const immediate = giver.getContainer();
    if (immediate && place && immediate.stuffId !== place.stuffId) {
      for (const c of candidatesForHere(immediate, giver, attention)) out.push(c);
    }
  }
  for (const c of candidatesForPeers(giver, attention, depth)) out.push(c);
  return out;
}

/**
 * Emit `host`'s attunement-hosted updates (the aether apps plugged
 * into an `AetherMixin` host) as reachable candidates for `viewer`.
 * Skips the viewer itself (defensive — no self-recursion).
 */
function pushHostedUpdates(
  out: ScopeCandidate[],
  host: Stuff,
  viewer: Stuff | null,
  attention?: number,
): void {
  if (!MixinApi.isAether(host)) return;
  for (const u of host.getHostedUpdates()) {
    if (u === viewer) continue;
    pushDirect(out, u, viewer, attention);
  }
}

/**
 * Build the candidate pool from a flat array of Stuff. Used for
 * `online` and `world` scopes where each Stuff is a candidate on its
 * own merits (no sub-features expanded).
 */
export function candidatesForFlat(
  items: ReadonlyArray<Stuff>,
  viewer: Stuff | null,
  attention?: number,
): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];
  for (const item of items) pushDirect(out, item, viewer, attention);
  return out;
}

function pushDirect(
  out: ScopeCandidate[],
  stuff: Stuff,
  viewer: Stuff | null,
  attention?: number,
): void {
  // System mode (viewer === null — see MqlContext.commandGiver): a
  // viewer-blind engine enumeration. No perception gate, the object's own
  // keywords instead of recognition-relative ones. Unreachable from
  // player-typed MQL (the dispatcher always sets a giver).
  if (viewer === null) {
    out.push(candidateFor(stuff, null));
    return;
  }
  // Honest fog: a concealed thing the viewer hasn't discovered / can't yet
  // perceive isn't a targetable candidate (it isn't in the viewer's world).
  // `perceives` short-circuits true for un-concealed things, so the common
  // path is untouched. `attention` (undefined for player queries → passive
  // baseline) lets a detection consumer resolve what it perceives when
  // actively watching (see MqlContext.attention).
  if (!PerceptionApi.perceives(viewer, stuff, attention)) return;
  out.push(candidateFor(stuff, viewer));
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
 * The keyword tiers (one-resolution § 4: *the name is not special*). The
 * scorer reads ONE list — the candidate's keywords — and ranks how the
 * query's words meet it:
 *
 *   - {@link TIER_PHRASE} — a keyword IS the phrase. `look clay` at the pit
 *     is the lumps (`clay`), not the pit (`clay pit`); `look at the top end`
 *     is the patch (`top end`), not the stand that answers to `top`.
 *   - {@link TIER_WORDS} — every query word is a WHOLE word of a keyword:
 *     `net` is a word of `drift net` and begins no word of `keepnet` (the
 *     fishing drive found it three times: creel/eel, ledger/edge,
 *     keepnet/net).
 *   - {@link TIER_PREFIX} — every query word BEGINS a keyword word.
 *   - partials — {@link TIER_PARTIAL} × the words that begin one; a
 *     fallback for when nothing answers to every word.
 *
 * ⚠ A query word matches where a WORD of a keyword BEGINS, never in the
 * middle of one: `consign "plant pot"`, with no plant pot in hand, put the
 * player's aether imPLANT up for sale (the ceramics drive C, run 28); `get
 * 1 brick` took the "brick table" by its keyword's tail.
 */
export const TIER_PHRASE = 100;
/** See {@link TIER_PHRASE}. */
export const TIER_WORDS = 60;
/** See {@link TIER_PHRASE}. */
export const TIER_PREFIX = 40;
/** See {@link TIER_PHRASE}: the per-word step of a partial. */
export const TIER_PARTIAL = 10;

/**
 * The tier a score sits in — what the binder compares ACROSS scope tries
 * (`CommandLogic.walkScopes`): a whole-name hit in a later try beats a
 * partial in an earlier one, and a tie goes to the earlier. Partials are
 * one tier, however many words they caught.
 */
export function scoreTier(score: number): number {
  if (score >= TIER_PHRASE) return 3;
  if (score >= TIER_WORDS) return 2;
  if (score >= TIER_PREFIX) return 1;
  return 0;
}

/**
 * Score `candidate` against `queryWords` by its keywords alone. Returns 0
 * when no match; higher is better. See {@link TIER_PHRASE}.
 */
export function scoreCandidate(
  candidate: ScopeCandidate,
  queryWords: string[]
): number {
  return scoreKeywords(candidate.keywords, queryWords);
}

function scoreKeywords(keywords: readonly string[], queryWords: string[]): number {
  if (keywords.length === 0 || queryWords.length === 0) return 0;
  const phrase = queryWords.join(' ');
  if (keywords.some((kw) => kw === phrase)) return TIER_PHRASE;
  const words = keywords.flatMap((kw) => kw.split(/\s+/)).filter((w) => w.length > 0);
  if (queryWords.every((qw) => words.includes(qw))) return TIER_WORDS;
  const begun = queryWords.filter((qw) => words.some((w) => w.startsWith(qw)));
  if (begun.length === queryWords.length) return TIER_PREFIX;
  return TIER_PARTIAL * begun.length;
}

/**
 * The attribution a match carries: the facet whose words reach the
 * match's own score when the rest of the keywords do not. `look sigil` on
 * the wand is its `sigil` detail; `look wand` is the wand.
 */
function attributionOf(c: ScopeCandidate, queryWords: string[], score: number): MqlMatchVia | undefined {
  if (!c.facets) return c.via;
  const facetWords = new Set(c.facets.flatMap((f) => f.keywords));
  const rest = scoreKeywords(c.keywords.filter((k) => !facetWords.has(k)), queryWords);
  if (rest >= score) return c.via;
  for (const f of c.facets) {
    if (scoreKeywords(f.keywords, queryWords) >= score) return { ...c.via, ...f.via };
  }
  return c.via;
}

/**
 * One candidate scored as a match — its score and the attribution the
 * words that matched carry — or `null` when it does not answer at all.
 */
export function matchCandidate(c: ScopeCandidate, queryWords: string[]): MqlMatch | null {
  const score = scoreCandidate(c, queryWords);
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
 * that answers to EVERY word ({@link TIER_PREFIX} or better) cuts every
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
  const out: MqlMatch[] = [];
  for (const c of candidates) {
    const match = matchCandidate(c, queryWords);
    if (match) out.push(match);
  }
  for (const floor of [TIER_PHRASE, TIER_WORDS, TIER_PREFIX]) {
    if (out.some((m) => m.score >= floor)) return out.filter((m) => m.score >= floor);
  }
  return out;
}

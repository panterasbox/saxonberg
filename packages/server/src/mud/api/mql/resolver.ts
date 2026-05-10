/**
 * MQL resolver — runs a parsed AST against an {@link MqlContext} to
 * produce a list of {@link MqlMatch} records.
 *
 * Pipeline:
 *
 *   raw input ─→ desugar ─→ lex ─→ parse ─→ resolve
 *
 * `resolve` is the single entry point used by `MqlApi.resolveOne` and
 * `MqlApi.resolveMany` (Phase 7). Both delegate to this module; the
 * difference is in how they wrap the match list.
 *
 * Phase 5 scope: direct seeds (pronouns, paths, stuff ids, literals,
 * `$$`, scope-promoted seeds), keyword-search seeds resolved via the
 * giver's `scope` fragment, `:i` / `:e` transforms, set ops (union /
 * difference), and detail navigation via the unified chain rule —
 * `:keyword` mid-chain narrows the prior set with the keyword space
 * auto-extended by detail names at the current `via.detailPath` depth.
 * Bracket filter expressions, predicates, and pronoun memory arrive
 * in later phases.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../containment';
import { DescribeApi } from '../describe';
import { MixinApi } from '../mixin';
import { PathPatternApi } from '../path-pattern';
import { StuffApi } from '../stuff';
import { desugar } from './desugar';
import { getOnlineHolders } from './online-provider';
import { parse, type MqlParseError } from './parser';
import { checkTier } from './permissions';
import { isPredicateName, MQL_PREDICATES } from './predicates';
import {
  candidatesForFlat,
  candidatesForHere,
  candidatesForInventory,
  candidatesForPeers,
  candidatesForReachable,
  scoreCandidate,
  scoreCandidates,
  type ScopeCandidate,
} from './scope-walk';
import type {
  AtomNode,
  ChainElement,
  ChainNode,
  ChainOp,
  CmpOp,
  ExprNode,
  KeywordsNode,
  MqlContext,
  MqlMany,
  MqlMatch,
  MqlMatchVia,
  PronounNode,
  QueryNode,
  SublistNode,
  ValueNode,
} from './types';
// Loads `detailPath` and `exit` augmentations onto `MqlMatchVia`.
import './via-augment';

export class MqlResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MqlResolveError';
  }
}

/** Public re-export so test code and callers can catch resolver-side
 *  errors without importing each leaf module. */
export { MqlPermissionError } from './permissions';
export type { MqlParseError };

/**
 * Resolve a query string against a context, returning the full list
 * of matches (sorted, deduped). Higher-score matches first; insertion
 * order is the secondary tiebreak.
 *
 * `MqlApi.resolveOne` picks `[0]` (or null); `MqlApi.resolveMany`
 * returns the full array. Both call this same code path.
 */
export function resolve(query: string, ctx: MqlContext): MqlMatch[] {
  const desugared = desugar(query);
  const ast = parse(desugared);
  const matches = resolveQuery(ast, ctx);
  return finalize(matches);
}

/**
 * Resolve a parsed AST. Exposed separately for callers that have
 * already lex/parsed (e.g., for caching or pre-validation).
 */
export function resolveQuery(ast: QueryNode, ctx: MqlContext): MqlMatch[] {
  const all: MqlMatch[] = [];
  for (const sub of ast.sublists) {
    const subMatches = resolveSublist(sub, ctx);
    for (const m of subMatches) all.push(m);
  }
  return all;
}

function resolveSublist(node: SublistNode, ctx: MqlContext): MqlMatch[] {
  let matches = resolveChain(node.base, ctx);
  for (const sub of node.subtract) {
    const subtract = resolveChain(sub, ctx);
    const subtractIds = new Set(subtract.map((m) => m.stuff.stuffId));
    matches = matches.filter((m) => !subtractIds.has(m.stuff.stuffId));
  }
  return matches;
}

function resolveChain(node: ChainNode, ctx: MqlContext): MqlMatch[] {
  let matches = resolveSeed(node.head, ctx);
  for (const op of node.rest) {
    matches = applyChainOp(matches, op, ctx);
  }
  return matches;
}

// ----- seeds ---------------------------------------------------------

function resolveSeed(node: ChainElement, ctx: MqlContext): MqlMatch[] {
  switch (node.kind) {
    case 'pronoun':
      return resolvePronoun(node, ctx);
    case 'keywords':
      return resolveKeywordSeed(node, ctx);
    case 'literal':
      return resolveLiteralSeed(node.value, ctx);
    case 'path': {
      checkTier('authoring', node.pattern, ctx.commandGiver);
      // First: live clones whose `templatePath` matches under glob
      // semantics. Existing pre-Phase behavior.
      const clones = StuffApi.findByPathGlob(node.pattern);
      if (clones.length > 0) return matchesFromStuff(clones);
      // Fallback for non-glob paths: the addressable Template record
      // itself, so verbs can act on a template that has no live
      // clones (e.g., `destruct /obj/Avatar/foo`). Glob patterns
      // (`*`, `**`, `?`) skip this — they're search-shaped queries
      // and the empty-result is meaningful.
      const isGlob = /[*?]/.test(node.pattern);
      if (isGlob) return [];
      return matchesFromStuff(StuffApi.findTemplatesByPath(node.pattern));
    }
    case 'stuffId': {
      checkTier('authoring', `#${node.id}`, ctx.commandGiver);
      const found = StuffApi.findById(node.id);
      return found ? matchesFromStuff([found]) : [];
    }
    case 'lastResult':
      return matchesFromStash(ctx, 'last');
    case 'group':
      return resolveQuery(node.query, ctx);
    case 'transform':
    case 'ordinal':
    case 'bracket-ordinal':
    case 'bracket-range':
    case 'bracket-filter':
      throw new MqlResolveError(
        `'${describeKind(node.kind)}' is not valid as a seed — chain it after a base seed`
      );
    default: {
      const exhaustive: never = node;
      throw new Error(`unhandled seed kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function resolvePronoun(node: PronounNode, ctx: MqlContext): MqlMatch[] {
  switch (node.name) {
    case 'me':
      return matchesFromStuff([ctx.commandGiver]);
    case 'here': {
      const env = MixinApi.isContainable(ctx.commandGiver)
        ? ctx.commandGiver.getContainer()
        : null;
      return env ? matchesFromStuff([env]) : [];
    }
    case 'it':
    case 'them':
    case 'him':
    case 'her':
      return matchesFromStash(ctx, node.name);
  }
}

function matchesFromStash(
  ctx: MqlContext,
  slot: 'it' | 'him' | 'her' | 'them' | 'last'
): MqlMatch[] {
  // Gate on FocusedMixin — non-Focused givers (scripted NPCs without
  // pronoun memory) see an empty stash, so dynamic pronouns and `$$`
  // resolve to no matches rather than throwing.
  if (!MixinApi.isFocused(ctx.commandGiver)) return [];
  const stash = ctx.commandGiver.getPronounMemory();
  const stored = stash.read(slot);
  if (!stored) return [];
  return stashEntryToMatches(stored);
}

function stashEntryToMatches(stored: MqlMany): MqlMatch[] {
  const via = stored.via;
  return stored.stuff.map((s) => {
    const m: MqlMatch = { stuff: s, score: 100 };
    if (via) m.via = via;
    return m;
  });
}

function resolveKeywordSeed(node: KeywordsNode, ctx: MqlContext): MqlMatch[] {
  // Single-word seed promotions: `inventory`, `online`, `world`,
  // `peers`, `reachable`.
  if (node.words.length === 1) {
    const w = node.words[0]!;
    if (w === 'inventory') {
      return matchesFromStuff([ctx.commandGiver]);
    }
    if (w === 'online') {
      checkTier('admin', 'online', ctx.commandGiver);
      return matchesFromStuff(allOnlineCommandGivers());
    }
    if (w === 'world') {
      checkTier('admin', 'world', ctx.commandGiver);
      return matchesFromStuff(StuffApi.getAllObjects());
    }
    if (w === 'peers') {
      return candidatesToMatches(candidatesForPeers(ctx.commandGiver));
    }
    if (w === 'reachable') {
      return candidatesToMatches(candidatesForReachable(ctx.commandGiver));
    }
  }
  // Otherwise: keyword search against the field's scope.
  return scopeKeywordSearch(node.words, ctx);
}

/**
 * Turn a candidate pool into seed matches. Dedup by `(stuff, via)` is
 * deferred to {@link finalize}, which keeps the highest-scored entry
 * per `stuffId`. Each candidate scores 100 — seed promotion is a
 * direct anchor, not a keyword match.
 */
function candidatesToMatches(pool: ScopeCandidate[]): MqlMatch[] {
  return pool.map((c) => {
    const m: MqlMatch = { stuff: c.stuff, score: 100 };
    if (c.via) m.via = c.via;
    return m;
  });
}

function resolveLiteralSeed(value: string, ctx: MqlContext): MqlMatch[] {
  // A literal is an exact-name search that preserves whitespace.
  // Treat it as a single keyword that scoring runs against the full
  // candidate name.
  const lit = value.toLowerCase();
  const candidates = candidatesForScope(ctx.scope, ctx);
  const out: MqlMatch[] = [];
  for (const c of candidates) {
    const nameLower = c.name.toLowerCase();
    if (nameLower === lit) {
      // Exact match — top score.
      const m: MqlMatch = { stuff: c.stuff, score: 100 };
      if (c.via) m.via = c.via;
      out.push(m);
    }
  }
  return out;
}

// ----- scope-walking -------------------------------------------------

/**
 * Build the candidate pool for a scope MQL fragment. Two paths:
 *
 *   1. **Fast path** — the fragment is a recognized seed name (`here`,
 *      `peers`, `reachable`, `inventory`, `online`, `world`, `me`),
 *      a path glob, a stuff id, or a comma-union of such tokens.
 *      Each token expands directly to its candidate pool.
 *
 *   2. **Slow path** — anything else (a keyword, an arbitrary chain,
 *      a bracket filter, etc.). The fragment is parsed and resolved
 *      as a full MQL query against an inner `reachable` context, and
 *      each resulting `(Stuff, via)` anchor's neighborhood becomes
 *      part of the candidate pool. This is what makes a focus chain
 *      like `"here:bookcase:book"` evaluate cleanly as a scope —
 *      the pool is the book detail's neighborhood (its children, if
 *      any).
 *
 * Falls back to `reachable` when the fragment is empty, the slow
 * path produces no anchors, or the slow-path parse/resolve throws —
 * the graceful-fallback rule from the unified-scope delta. Typical
 * trigger: the player walked into a different room and the old focus
 * chain doesn't resolve in the new context.
 */
export function candidatesForScope(
  scope: string,
  ctx: MqlContext
): ScopeCandidate[] {
  const trimmed = scope.trim();
  if (!trimmed) return candidatesForReachable(ctx.commandGiver);

  // Fast path: comma-union of recognized seed names. Every part has
  // to be recognized; a single unrecognized part bumps the whole
  // fragment to the slow path so we don't silently drop intent.
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  const fast: ScopeCandidate[] = [];
  let allRecognized = parts.length > 0;
  for (const part of parts) {
    const partial = candidatesForScopePart(part, ctx);
    if (partial === null) {
      allRecognized = false;
      break;
    }
    for (const c of partial) fast.push(c);
  }
  if (allRecognized) return fast;

  // Slow path: parse-and-resolve the fragment, walk each anchor's
  // neighborhood. Reachable backstops on miss.
  const slow = candidatesFromQuery(trimmed, ctx);
  if (slow.length > 0) return slow;
  return candidatesForReachable(ctx.commandGiver);
}

/**
 * Resolve `fragment` as a full MQL query against an inner `reachable`
 * context, then walk each anchor's neighborhood. The inner scope is
 * `reachable` (not the outer scope) to give bareword keywords a
 * defensible search area without re-entering the slow path.
 *
 * Returns `[]` when the fragment fails to parse or resolves to
 * nothing — callers fall back to reachable in that case.
 */
function candidatesFromQuery(
  fragment: string,
  ctx: MqlContext
): ScopeCandidate[] {
  let matches: MqlMatch[];
  try {
    matches = resolve(fragment, {
      commandGiver: ctx.commandGiver,
      scope: 'reachable',
    });
  } catch {
    return [];
  }
  const out: ScopeCandidate[] = [];
  for (const m of matches) {
    for (const c of candidatesForAnchor(m.stuff, m.via)) out.push(c);
  }
  return out;
}

/**
 * Neighborhood walk for a `(stuff, via)` anchor — used by the
 * scope-as-MQL slow path. Emits one candidate per addressable
 * keyword in the anchor's neighborhood:
 *
 *   - The anchor itself: name + keywords (or the detail tip name if
 *     `via.detailPath` is set).
 *   - Detail names at the current via depth (top-level when no via,
 *     child-of-tip when via set).
 *   - When **no via** AND the stuff is a `Container`: include its
 *     contents (each item plus its own details).
 *   - When **no via** AND the stuff is `Exitable`: include doors and
 *     direction candidates.
 *
 * The "no via" gate on contents/exits matches the via-aware transform
 * rule: a candidate with via is "inside" a detail, so its
 * neighborhood is the detail tree, not the host's contents.
 */
function candidatesForAnchor(
  stuff: Stuff,
  via: MqlMatchVia | undefined
): ScopeCandidate[] {
  const out: ScopeCandidate[] = [];
  const path = via?.detailPath;
  const insideDetail = path && path.length > 0;

  if (insideDetail) {
    const tip = path[path.length - 1]!;
    const c: ScopeCandidate = {
      stuff,
      name: tip,
      keywords: [tip.toLowerCase()],
      via,
    };
    out.push(c);
  } else {
    out.push({
      stuff,
      name: nameOf(stuff),
      keywords: keywordsOf(stuff),
    });
  }

  // Detail names at the current via depth.
  if (MixinApi.isDetailed(stuff)) {
    const parent = insideDetail ? path[path.length - 1] : undefined;
    const ids = stuff.getDetailIds(parent) ?? [];
    for (const id of ids) {
      const childPath = insideDetail ? [...path, id] : [id];
      out.push({
        stuff,
        name: id,
        keywords: [id.toLowerCase()],
        via: { ...via, detailPath: childPath },
      });
    }
  }

  // Stuff containment context only when not inside a detail tree.
  if (!insideDetail) {
    if (MixinApi.isContainer(stuff)) {
      for (const item of ContainmentApi.getContents(stuff)) {
        out.push({
          stuff: item,
          name: nameOf(item),
          keywords: keywordsOf(item),
        });
        if (MixinApi.isDetailed(item)) {
          const ids = item.getDetailIds() ?? [];
          for (const id of ids) {
            out.push({
              stuff: item,
              name: id,
              keywords: [id.toLowerCase()],
              via: { detailPath: [id] },
            });
          }
        }
      }
    }
    if (MixinApi.isExitable(stuff)) {
      const seenDoors = new Set<string>();
      for (const door of stuff.getExitDoors()) {
        if (seenDoors.has(door.stuffId)) continue;
        seenDoors.add(door.stuffId);
        out.push({
          stuff: door,
          name: nameOf(door),
          keywords: keywordsOf(door),
        });
        if (MixinApi.isDetailed(door)) {
          const ids = door.getDetailIds() ?? [];
          for (const id of ids) {
            out.push({
              stuff: door,
              name: id,
              keywords: [id.toLowerCase()],
              via: { detailPath: [id] },
            });
          }
        }
      }
      const seenDirs = new Set<string>();
      for (const exit of stuff.getObviousExits()) {
        const direction = exit.getDirection();
        if (seenDirs.has(direction)) continue;
        seenDirs.add(direction);
        out.push({
          stuff,
          name: direction,
          keywords: [direction],
          via: { exit },
        });
      }
    }
  }

  return out;
}

function candidatesForScopePart(
  part: string,
  ctx: MqlContext
): ScopeCandidate[] | null {
  const lower = part.toLowerCase();
  if (lower === 'here' || lower === '') return candidatesForHereScope(ctx);
  if (lower === 'inventory') return candidatesForInventory(ctx.commandGiver);
  if (lower === 'peers') return candidatesForPeers(ctx.commandGiver);
  if (lower === 'reachable') return candidatesForReachable(ctx.commandGiver);
  if (lower === 'online') {
    try {
      checkTier('admin', 'online', ctx.commandGiver);
    } catch {
      return [];
    }
    return candidatesForFlat(allOnlineCommandGivers());
  }
  if (lower === 'world') {
    try {
      checkTier('admin', 'world', ctx.commandGiver);
    } catch {
      return [];
    }
    return candidatesForFlat(StuffApi.getAllObjects());
  }
  if (lower === 'me') {
    return [
      {
        stuff: ctx.commandGiver,
        name: 'me',
        keywords: ['me'],
      },
    ];
  }
  if (part.startsWith('/')) {
    try {
      checkTier('authoring', part, ctx.commandGiver);
    } catch {
      return [];
    }
    return candidatesForFlat(StuffApi.findByPathGlob(part));
  }
  if (part.startsWith('#') && part.length > 1) {
    try {
      checkTier('authoring', part, ctx.commandGiver);
    } catch {
      return [];
    }
    const found = StuffApi.findById(part.slice(1));
    return found ? candidatesForFlat([found]) : [];
  }
  return null;
}

function candidatesForHereScope(ctx: MqlContext): ScopeCandidate[] {
  if (!MixinApi.isContainable(ctx.commandGiver)) return [];
  const env = ctx.commandGiver.getContainer();
  if (!env) return [];
  return candidatesForHere(env);
}

function scopeKeywordSearch(words: string[], ctx: MqlContext): MqlMatch[] {
  const candidates = candidatesForScope(ctx.scope, ctx);
  return scoreCandidates(candidates, words);
}

// ----- chain operators ----------------------------------------------

function applyChainOp(
  input: MqlMatch[],
  op: ChainOp,
  ctx: MqlContext
): MqlMatch[] {
  return applyColon(input, op.element, ctx);
}

/**
 * Single-word keyword forms that name a candidate-set seed.
 * Mid-chain these dispatch to either the **flat-map** path
 * (element-derivable seeds — see {@link ELEMENT_DERIVABLE_SEEDS})
 * or the **intersection** path (everything else in this set).
 *
 * Pronouns (`me`, `here`) and the `it`/`him`/`her`/`them` family
 * deliberately stay out: `here` is a registered predicate
 * (location-or-contents membership), `me` mid-chain has no useful
 * meaning beyond what `:i` / `:e` already cover, and the dynamic
 * pronouns dispatch through the seed-shaped intersect path below.
 */
const NAMED_SEED_KEYWORDS: ReadonlySet<string> = new Set([
  'online',
  'inventory',
  'world',
  'peers',
  'reachable',
]);

/**
 * Element-derivable seeds. Mid-chain, these flat-map over the prior
 * set: for each prior match, build the seed's candidate pool with
 * that prior Stuff as the anchor (in place of the giver), union the
 * results, and exclude the prior set's stuffIds from the union (so
 * "peers of these people" doesn't include those people).
 *
 * The fixed-pool seeds (`me`, `here`, `online`, `world`, paths,
 * stuff ids, `$$`, groups) take the intersection path — see
 * {@link intersectWithSeed}. The transforms `:i` / `:e` are
 * conceptually the same family as flat-map (already per-element);
 * they have their own dispatch in {@link applyTransform}.
 *
 * See `docs/subsystems/mql.md` and `docs/mql-grammar.md` for the
 * grammar-level rationale.
 */
const ELEMENT_DERIVABLE_SEEDS: ReadonlySet<string> = new Set([
  'peers',
  'reachable',
  'inventory',
]);

function applyColon(
  input: MqlMatch[],
  el: ChainElement,
  ctx: MqlContext
): MqlMatch[] {
  switch (el.kind) {
    case 'transform':
      return applyTransform(input, el.transform);
    case 'keywords': {
      if (el.words.length === 1) {
        const name = el.words[0]!;
        if (ELEMENT_DERIVABLE_SEEDS.has(name)) {
          return flatMapBySeed(input, name);
        }
        if (NAMED_SEED_KEYWORDS.has(name)) {
          return intersectWithSeed(input, el, ctx);
        }
      }
      return filterByKeywordsOrPredicate(input, el.words, ctx);
    }
    case 'literal':
      return filterByLiteral(input, el.value);
    case 'pronoun':
    case 'path':
    case 'stuffId':
    case 'lastResult':
    case 'group':
      // Fixed-pool seeds mid-chain intersect the prior set with the
      // seed's candidate set by `stuffId`. Score and `via`
      // attribution from the prior set are preserved — intersection
      // doesn't change *how* a Stuff was found, only whether it
      // survives.
      return intersectWithSeed(input, el, ctx);
    case 'ordinal':
      return applyOrdinal(input, el.index);
    case 'bracket-ordinal':
      return applyOrdinal(input, el.index);
    case 'bracket-range':
      return applyRange(input, el);
    case 'bracket-filter':
      return filterByExpression(input, el.expr, ctx);
    default: {
      const exhaustive: never = el;
      throw new Error(`unhandled chain element kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Intersect the prior match list with the candidate set produced by
 * re-resolving `el` as a seed. Permission gates fire from the seed
 * resolution path (`flower:online` from a non-admin throws).
 */
function intersectWithSeed(
  input: MqlMatch[],
  el: ChainElement,
  ctx: MqlContext
): MqlMatch[] {
  const seedMatches = resolveSeed(el, ctx);
  const allowed = new Set(seedMatches.map((m) => m.stuff.stuffId));
  return input.filter((m) => allowed.has(m.stuff.stuffId));
}

/**
 * Flat-map an element-derivable seed (`peers`, `reachable`,
 * `inventory`) over the prior set: for each prior match, build the
 * seed's candidate pool **anchored on that match's Stuff** (in place
 * of the giver), then union the results.
 *
 * Each resulting match takes its `via` from the candidate (e.g.,
 * detail subcandidates carry `via.detailPath`, exit candidates carry
 * `via.exit`). Score is inherited from the prior match — same
 * convention as {@link applyTransform}.
 *
 * Dedup is by `(stuffId, JSON-stringified via)` — same shape as the
 * resolver's terminal `finalize`. Two prior matches that flat-map to
 * the same `(stuff, via)` collapse.
 *
 * **Set-aware exclusion is per seed.** `peers` and `inventory`
 * exclude the prior set from the result, because their per-element
 * definitions exclude the focal naturally and the union otherwise
 * cross-pollinates (`(bob, joe):peers` would pull bob in via
 * `peers(joe)` and vice versa). `reachable`, by contrast, INCLUDES
 * the focal in its per-element definition (you can reach yourself);
 * dropping the prior set there would silently kick out legitimate
 * self-reachable matches. So `(bob, joe):reachable` keeps bob and
 * joe in the result, while `(bob, joe):peers` excludes them.
 */
function flatMapBySeed(
  input: MqlMatch[],
  seedName: string
): MqlMatch[] {
  if (input.length === 0) return [];
  const excludePriorSet = SEEDS_EXCLUDING_PRIOR.has(seedName);
  const priorIds = excludePriorSet
    ? new Set(input.map((m) => m.stuff.stuffId))
    : null;
  const out: MqlMatch[] = [];
  const seen = new Set<string>();
  for (const m of input) {
    const candidates = candidatesForElementDerivable(seedName, m.stuff);
    for (const c of candidates) {
      if (priorIds && priorIds.has(c.stuff.stuffId)) continue;
      const key = c.stuff.stuffId + '|' + (c.via ? JSON.stringify(c.via) : '');
      if (seen.has(key)) continue;
      seen.add(key);
      const next: MqlMatch = { stuff: c.stuff, score: m.score };
      if (c.via) next.via = c.via;
      out.push(next);
    }
  }
  return out;
}

/**
 * Element-derivable seeds whose per-element definition excludes the
 * focal Stuff (peers excludes the focal by definition; inventory's
 * contents-of-x doesn't include x). For these, `flatMapBySeed`
 * subtracts the prior set from the union to prevent cross-pollination
 * — bob appearing in `peers(joe)` and joe appearing in `peers(bob)`.
 *
 * `reachable` is intentionally absent: it includes the focal in its
 * per-element definition (you can reach yourself), so excluding the
 * prior set would silently drop self-reachable matches.
 */
const SEEDS_EXCLUDING_PRIOR: ReadonlySet<string> = new Set([
  'peers',
  'inventory',
]);

function candidatesForElementDerivable(
  seedName: string,
  anchor: Stuff
): ScopeCandidate[] {
  switch (seedName) {
    case 'peers':
      return candidatesForPeers(anchor);
    case 'inventory':
      return candidatesForInventory(anchor);
    case 'reachable':
      return candidatesForReachable(anchor);
    default:
      return [];
  }
}

/**
 * Apply a chain transform — `:i` (descend), `:I` (descend deep),
 * `:e` (ascend), `:E` (ascend to root).
 *
 * Polymorphic on the match's `via.detailPath`:
 *
 *   - With **no via**, the operators behave on Stuff containment.
 *       `:i` yields immediate contents (Container).
 *       `:I` yields the entire `getDeepContents()` subtree.
 *       `:e` yields the environment (Containable).
 *       `:E` walks the environment chain to the topmost
 *         non-null container.
 *
 *   - With **via.detailPath set**, the operators behave on the detail
 *     tree.
 *       `:i` yields one match per child detail at the current path
 *         tip (via extended one level).
 *       `:I` walks the detail subtree from the tip and emits one
 *         match per descendant detail (DFS pre-order, vias extended
 *         along the path).
 *       `:e` pops one detail level (or to no-via if at the top).
 *       `:E` drops the entire detail path (anchor stays on the same
 *         Stuff, no via).
 *
 * Conceptually `:i` / `:I` / `:e` / `:E` are uniform descend / ascend
 * operators, polymorphic on whether the candidate is in a detail
 * tree or a Stuff-containment context.
 */
function applyTransform(
  input: MqlMatch[],
  transform: 'i' | 'I' | 'e' | 'E'
): MqlMatch[] {
  const out: MqlMatch[] = [];
  for (const m of input) {
    const path = m.via?.detailPath;
    const insideDetailTree = path && path.length > 0;
    if (transform === 'i') {
      if (insideDetailTree) {
        if (!MixinApi.isDetailed(m.stuff)) continue;
        const parent = path![path!.length - 1];
        const childIds = m.stuff.getDetailIds(parent) ?? [];
        for (const id of childIds) {
          out.push({
            stuff: m.stuff,
            score: m.score,
            via: { ...m.via, detailPath: [...path!, id] },
          });
        }
      } else {
        if (!MixinApi.isContainer(m.stuff)) continue;
        for (const item of ContainmentApi.getContents(m.stuff)) {
          out.push({ stuff: item, score: m.score });
        }
      }
    } else if (transform === 'I') {
      if (insideDetailTree) {
        if (!MixinApi.isDetailed(m.stuff)) continue;
        // Walk the detail subtree from the current tip and emit one
        // match per descendant, vias extended along the walk path.
        for (const subPath of walkDetailDescendants(m.stuff, path!)) {
          out.push({
            stuff: m.stuff,
            score: m.score,
            via: { ...m.via, detailPath: subPath },
          });
        }
      } else {
        if (!MixinApi.isContainer(m.stuff)) continue;
        for (const item of m.stuff.getDeepContents()) {
          out.push({ stuff: item, score: m.score });
        }
      }
    } else if (transform === 'e') {
      if (insideDetailTree) {
        if (path!.length === 1) {
          // Pop to no-via (still anchored on the same Stuff).
          const next: MqlMatch = { stuff: m.stuff, score: m.score };
          const restVia = stripDetailPath(m.via);
          if (restVia) next.via = restVia;
          out.push(next);
        } else {
          out.push({
            stuff: m.stuff,
            score: m.score,
            via: { ...m.via, detailPath: path!.slice(0, -1) },
          });
        }
      } else {
        if (!MixinApi.isContainable(m.stuff)) continue;
        const env = m.stuff.getContainer();
        if (env) out.push({ stuff: env, score: m.score });
      }
    } else {
      // transform === 'E' — pop entirely / walk to root.
      //
      // Asymmetric on purpose: `:E` from a detail-tree match drops
      // the detail path back to the host Stuff (same Stuff, no
      // via), without walking up. A subsequent `:E` from there
      // hits the no-via branch and walks to the root container.
      // So `me:i:sword:engraving:E` → sword;
      // `me:i:sword:engraving:E:E` → the sword's root container.
      if (insideDetailTree) {
        const next: MqlMatch = { stuff: m.stuff, score: m.score };
        const restVia = stripDetailPath(m.via);
        if (restVia) next.via = restVia;
        out.push(next);
      } else {
        if (!MixinApi.isContainable(m.stuff)) continue;
        const root = m.stuff.getRootContainer();
        if (root) out.push({ stuff: root, score: m.score });
      }
    }
  }
  return out;
}

/**
 * Return a copy of `via` with `detailPath` removed. Returns
 * `undefined` if the resulting via has no remaining augmentations,
 * so the match can drop its via entirely rather than carry an empty
 * object.
 */
function stripDetailPath(via: MqlMatchVia | undefined): MqlMatchVia | undefined {
  if (!via) return undefined;
  const { detailPath: _drop, ...rest } = via;
  return Object.keys(rest).length === 0 ? undefined : (rest as MqlMatchVia);
}

/**
 * Walk the detail subtree rooted at `host`'s current path tip (last
 * segment of `path`) DFS pre-order and yield each descendant's
 * full path (`[...path, child, ...]`). Used by `:I` mid-via to
 * emit one match per detail descendant.
 *
 * `path` is the current via.detailPath of the prior match; the
 * walk starts at its tip and descends through `getDetailIds(parent)`
 * recursively. Containment is acyclic by construction so no cycle
 * protection is needed.
 */
function walkDetailDescendants(
  host: Stuff,
  path: string[],
): string[][] {
  if (!MixinApi.isDetailed(host)) return [];
  const out: string[][] = [];
  const recurse = (currentPath: string[]): void => {
    const tip = currentPath[currentPath.length - 1]!;
    const childIds = host.getDetailIds(tip) ?? [];
    for (const id of childIds) {
      const next = [...currentPath, id];
      out.push(next);
      recurse(next);
    }
  };
  recurse(path);
  return out;
}

function filterByKeywordsOrPredicate(
  input: MqlMatch[],
  words: string[],
  ctx: MqlContext
): MqlMatch[] {
  // A single-word filter that matches a registered predicate gets
  // dispatched to the predicate registry. Everything else (multi-
  // word filters, single-word non-predicate names) falls through to
  // keyword filtering. Predicates declare their permission tier
  // separately from operators.
  if (words.length === 1 && isPredicateName(words[0]!)) {
    const name = words[0]!;
    const predicate = MQL_PREDICATES[name]!;
    checkTier(predicate.tier, name, ctx.commandGiver);
    const out: MqlMatch[] = [];
    for (const m of input) {
      if (predicate.check(m.stuff, ctx.commandGiver)) out.push(m);
    }
    return out;
  }
  return filterByKeywords(input, words);
}

/**
 * Mid-chain `:keyword` narrowing. The candidate space for each prior
 * match is built per the unified addressing rule:
 *
 *   - **No via** — direct candidate is the host stuff (its display
 *     name + perceptible keywords). Detail-extension candidates: one
 *     per top-level detail of the host.
 *   - **via.detailPath set** — direct candidate is the tip detail
 *     (its name as both display and keyword). Detail-extension
 *     candidates: one per child detail at the current path tip.
 *
 * Each variant scores against the keyword(s) independently and brings
 * its own via attribution. The best-scoring match for each prior
 * survives into the output.
 *
 * This is what lets `here:bookcase:book` walk into the bookcase
 * detail's book child and `here:bookcase:i:book` reach the same
 * place — `:i` between detail steps is redundant because `:keyword`
 * already auto-extends with child names.
 */
function filterByKeywords(input: MqlMatch[], words: string[]): MqlMatch[] {
  if (words.length === 0) return input;
  const out: MqlMatch[] = [];
  for (const m of input) {
    const direct = directCandidate(m);
    const detailCandidates = detailExtensionCandidates(m);

    // Pick the best candidate by RAW score (not max-with-prior) — the
    // prior match's score is locked in regardless, but the candidate
    // selection has to choose between siblings, so an exact 100 on a
    // child detail must outrank a substring 50 on the parent detail's
    // name.
    let bestRaw = 0;
    let bestVia: MqlMatchVia | undefined = undefined;
    let matched = false;
    for (const c of [direct, ...detailCandidates]) {
      const score = scoreCandidate(c, words);
      if (score === 0) continue;
      if (!matched || score > bestRaw) {
        bestRaw = score;
        bestVia = c.via;
        matched = true;
      }
    }
    if (matched) {
      const next: MqlMatch = {
        stuff: m.stuff,
        score: Math.max(m.score, bestRaw),
      };
      if (bestVia) next.via = bestVia;
      out.push(next);
    }
  }
  return out;
}

/**
 * Build the direct (non-extension) candidate for a prior match. When
 * the prior carries `via.detailPath`, the candidate addresses the tip
 * detail by name; otherwise it addresses the host stuff with its own
 * keywords + display name.
 */
function directCandidate(m: MqlMatch): ScopeCandidate {
  const path = m.via?.detailPath;
  if (path && path.length > 0) {
    const tip = path[path.length - 1]!;
    const c: ScopeCandidate = {
      stuff: m.stuff,
      name: tip,
      keywords: [tip.toLowerCase()],
    };
    if (m.via) c.via = m.via;
    return c;
  }
  const c: ScopeCandidate = {
    stuff: m.stuff,
    name: nameOf(m.stuff),
    keywords: keywordsOf(m.stuff),
  };
  if (m.via) c.via = m.via;
  return c;
}

/**
 * Build sub-candidates for the host's details at the current via
 * depth. With no via, top-level detail names; with `via.detailPath`
 * set, the children of the path's tip. Each sub-candidate is the
 * same Stuff with `via.detailPath` extended by the detail's name.
 */
function detailExtensionCandidates(m: MqlMatch): ScopeCandidate[] {
  if (!MixinApi.isDetailed(m.stuff)) return [];
  const currentPath = m.via?.detailPath ?? [];
  const parent = currentPath[currentPath.length - 1];
  const ids = m.stuff.getDetailIds(parent) ?? [];
  const out: ScopeCandidate[] = [];
  for (const id of ids) {
    const lower = id.toLowerCase();
    out.push({
      stuff: m.stuff,
      name: id,
      keywords: [lower],
      via: { ...m.via, detailPath: [...currentPath, id] },
    });
  }
  return out;
}

// ----- bracket filter expressions -----------------------------------

function filterByExpression(
  input: MqlMatch[],
  expr: ExprNode,
  ctx: MqlContext
): MqlMatch[] {
  const out: MqlMatch[] = [];
  for (const m of input) {
    if (evaluateExpr(expr, m.stuff, ctx)) out.push(m);
  }
  return out;
}

function evaluateExpr(
  expr: ExprNode,
  stuff: Stuff,
  ctx: MqlContext
): boolean {
  switch (expr.kind) {
    case 'or':
      return evaluateExpr(expr.left, stuff, ctx) || evaluateExpr(expr.right, stuff, ctx);
    case 'and':
      return evaluateExpr(expr.left, stuff, ctx) && evaluateExpr(expr.right, stuff, ctx);
    case 'not':
      return !evaluateExpr(expr.child, stuff, ctx);
    case 'has':
      return readAtom(expr.atom, stuff, ctx) !== undefined;
    case 'comparison': {
      const left = readAtom(expr.left, stuff, ctx);
      // Comparison against a missing property is always false (req §4.3).
      if (left === undefined) return false;
      return compare(left, expr.op, valueOf(expr.right));
    }
    case 'truthy': {
      const v = readAtom(expr.atom, stuff, ctx);
      return Boolean(v);
    }
  }
}

/**
 * Read the value of an atom against `stuff`. Returns `undefined` for
 * "no such fact" — the comparison rule treats undefined as false-on-
 * comparison.
 *
 * Each authoring-tier namespace gates its own access via the
 * permission framework; the resolver runs the gate here so a query
 * like `[mixin.X]` from a non-author trips the right error before
 * filtering touches a single Stuff.
 */
function readAtom(
  atom: AtomNode,
  stuff: Stuff,
  ctx: MqlContext
): string | number | boolean | undefined {
  if (atom.kind === 'name') {
    return nameOf(stuff);
  }
  if (atom.kind === 'id') {
    return stuff.stuffId;
  }
  // namespaced
  const op = `${atom.namespace}.${atom.key}`;
  switch (atom.namespace) {
    case 'prop':
      checkTier('authoring', op, ctx.commandGiver);
      return readProp(stuff, atom.key);
    case 'mixin':
      checkTier('authoring', op, ctx.commandGiver);
      return hasMixinByLowercaseName(stuff, atom.key);
    case 'class':
      checkTier('authoring', op, ctx.commandGiver);
      return matchesClass(stuff, atom.key);
    case 'keyword':
      checkTier('authoring', op, ctx.commandGiver);
      return keywordsOf(stuff).includes(atom.key.toLowerCase());
    case 'template':
      checkTier('authoring', op, ctx.commandGiver);
      return matchesTemplate(stuff, atom.key);
    default:
      throw new MqlResolveError(
        `unknown filter namespace '${atom.namespace}' (expected prop, mixin, class, keyword, or template)`
      );
  }
}

function valueOf(value: ValueNode): string | number {
  if (value.kind === 'value-int') return value.value;
  return value.value;
}

function compare(
  left: string | number | boolean,
  op: CmpOp,
  right: string | number
): boolean {
  if (op === '=') return looseEq(left, right);
  if (op === '!=') return !looseEq(left, right);
  // Ordering comparisons: only meaningful on numbers. String < / >
  // also work in JS, but we keep things simple.
  if (typeof left !== typeof right) return false;
  switch (op) {
    case '>':
      return (left as number) > (right as number);
    case '<':
      return (left as number) < (right as number);
    case '>=':
      return (left as number) >= (right as number);
    case '<=':
      return (left as number) <= (right as number);
  }
}

function looseEq(
  left: string | number | boolean,
  right: string | number
): boolean {
  if (typeof left === 'boolean') {
    if (typeof right === 'string') {
      const r = right.toLowerCase();
      if (r === 'true') return left === true;
      if (r === 'false') return left === false;
    }
    return false;
  }
  return left === right;
}

function readProp(stuff: Stuff, key: string): string | number | boolean | undefined {
  if (!MixinApi.isPropertied(stuff)) return undefined;
  const props = stuff.getProps();
  const value = props[key];
  if (value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  // Non-scalar property values — render to undefined for comparison
  // purposes so `[prop.complex > 5]` doesn't blow up.
  return undefined;
}

function matchesClass(stuff: Stuff, className: string): boolean {
  // Case-insensitive walk over the prototype chain. The lexer
  // lowercases barewords, so the player-typed `[class.Sword]` arrives
  // as `sword` here and matches any constructor whose name compares
  // equal under `toLowerCase()`.
  const target = className.toLowerCase();
  let proto = Object.getPrototypeOf(stuff) as { constructor?: { name?: string } } | null;
  while (proto && proto.constructor) {
    const name = proto.constructor.name;
    if (typeof name === 'string' && name.toLowerCase() === target) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

/**
 * Case-insensitive mixin lookup. The lexer lowercases barewords, so
 * we have to enumerate the mixin names on `stuff` (and any installed
 * shadows) and match by `toLowerCase()` instead of relying on
 * `MixinApi.hasMixin`'s exact compare.
 */
function hasMixinByLowercaseName(stuff: Stuff, name: string): boolean {
  const target = name.toLowerCase();
  const ctor = stuff.constructor as Parameters<
    typeof MixinApi.queryMixins
  >[0];
  for (const m of MixinApi.queryMixins(ctor)) {
    const mn = m._mixinName;
    if (typeof mn === 'string' && mn.toLowerCase() === target) return true;
  }
  return false;
}

function matchesTemplate(stuff: Stuff, pattern: string): boolean {
  const path = (stuff as unknown as { templatePath?: string }).templatePath;
  if (!path) return false;
  return PathPatternApi.matches(path, pattern);
}

function filterByLiteral(input: MqlMatch[], literal: string): MqlMatch[] {
  const lit = literal.toLowerCase();
  const out: MqlMatch[] = [];
  for (const m of input) {
    if (nameOf(m.stuff).toLowerCase() === lit) {
      out.push(m);
    }
  }
  return out;
}

function applyOrdinal(input: MqlMatch[], index: number): MqlMatch[] {
  if (input.length === 0) return [];
  // 1-based; negative counts from end.
  const idx = index > 0 ? index - 1 : input.length + index;
  if (idx < 0 || idx >= input.length) return [];
  return [input[idx]!];
}

function applyRange(
  input: MqlMatch[],
  range: { start: number; end: number | null; mode: 'inclusive' | 'from-end' | 'to-end' }
): MqlMatch[] {
  if (input.length === 0) return [];
  const startIdx = range.start > 0 ? range.start - 1 : input.length + range.start;
  let endIdx: number;
  if (range.mode === 'to-end') {
    endIdx = input.length - 1;
  } else if (range.mode === 'from-end') {
    // [N..<M] = N through (length - M)
    endIdx = input.length - (range.end ?? 0);
  } else {
    endIdx = (range.end ?? 0) > 0 ? (range.end ?? 0) - 1 : input.length + (range.end ?? 0);
  }
  if (startIdx > endIdx) return [];
  const lo = Math.max(0, startIdx);
  const hi = Math.min(input.length - 1, endIdx);
  return input.slice(lo, hi + 1);
}

// ----- helpers ------------------------------------------------------

function matchesFromStuff(items: ReadonlyArray<Stuff>): MqlMatch[] {
  return items.map((s) => ({ stuff: s, score: 100 }));
}

function nameOf(stuff: Stuff): string {
  return DescribeApi.getDisplayName(stuff, '');
}

function keywordsOf(stuff: Stuff): string[] {
  return MixinApi.isPerceptible(stuff) ? stuff.getKeywords() : [];
}

function allOnlineCommandGivers(): Stuff[] {
  return getOnlineHolders();
}

function describeKind(kind: ChainElement['kind']): string {
  return kind;
}

/**
 * Sort by score descending and dedup by stuffId, keeping the
 * highest-scored entry for each id. The stable iteration order of
 * the input gives us the secondary tiebreak (req §14.2).
 */
function finalize(matches: MqlMatch[]): MqlMatch[] {
  const byId = new Map<string, MqlMatch>();
  for (const m of matches) {
    const existing = byId.get(m.stuff.stuffId);
    if (!existing || m.score > existing.score) {
      byId.set(m.stuff.stuffId, m);
    }
  }
  // Preserve the original order for ties, but sort by score
  // descending. Build pairs of (originalIndex, match) so we can
  // stable-sort.
  const indexed: Array<[number, MqlMatch]> = [];
  let i = 0;
  for (const m of matches) {
    if (byId.get(m.stuff.stuffId) === m) {
      indexed.push([i, m]);
    }
    i += 1;
  }
  indexed.sort((a, b) => b[1].score - a[1].score || a[0] - b[0]);
  return indexed.map(([, m]) => m);
}

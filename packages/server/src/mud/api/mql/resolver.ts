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
    case 'path':
      checkTier('authoring', node.pattern, ctx.commandGiver);
      return matchesFromStuff(StuffApi.findByPathGlob(node.pattern));
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
 * Build the candidate pool for a scope MQL fragment. Recognizes the
 * scope-as-fragment shapes that v1 supports: a single direct seed
 * (`here`, `peers`, `reachable`, `inventory`, `online`, `world`,
 * `me`), a comma-union of such seeds, or a path/stuff-id seed.
 *
 * Falls back to `reachable` when the fragment is empty, unrecognized,
 * or fails to resolve to any anchor — the graceful-fallback rule from
 * the unified-scope delta. `reachable` is the closest analogue to the
 * old conflated `here` (location + peers + inventory).
 */
export function candidatesForScope(
  scope: string,
  ctx: MqlContext
): ScopeCandidate[] {
  const trimmed = scope.trim();
  if (!trimmed) return candidatesForReachable(ctx.commandGiver);

  // Split on top-level commas. v1 only supports flat unions of
  // recognized scope tokens; nested parens / chains aren't expected
  // here. Anything more sophisticated falls back to the keyword
  // search-as-anchors path.
  const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  const out: ScopeCandidate[] = [];
  let recognized = false;
  for (const part of parts) {
    const partial = candidatesForScopePart(part, ctx);
    if (partial !== null) {
      recognized = true;
      for (const c of partial) out.push(c);
    }
  }
  if (!recognized) return candidatesForReachable(ctx.commandGiver);
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
 * Single-word keyword forms that name a seed pool. Mid-chain, these
 * intersect rather than keyword-filter — `online:reachable` means
 * "the online set ∩ the reachable set", not "online matches with the
 * keyword 'reachable'." Pronouns (`me`, `here`) and the `it`/`him`/
 * `her`/`them` family deliberately stay out of this list: `here` is
 * still a registered predicate (location-or-contents membership)
 * and `me` mid-chain has no useful seed-intersection meaning beyond
 * what `:i` / `:e` already cover.
 */
const NAMED_SEED_KEYWORDS: ReadonlySet<string> = new Set([
  'online',
  'inventory',
  'world',
  'peers',
  'reachable',
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
      if (el.words.length === 1 && NAMED_SEED_KEYWORDS.has(el.words[0]!)) {
        return intersectWithSeed(input, el, ctx);
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
      // Seed-shaped chain elements mid-chain intersect the prior set
      // with the seed's candidate set by `stuffId`. Score and `via`
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

function applyTransform(
  input: MqlMatch[],
  transform: 'i' | 'e'
): MqlMatch[] {
  const out: MqlMatch[] = [];
  for (const m of input) {
    if (transform === 'i') {
      if (!MixinApi.isContainer(m.stuff)) continue;
      for (const item of ContainmentApi.getContents(m.stuff)) {
        out.push({ stuff: item, score: m.score });
      }
    } else {
      if (!MixinApi.isContainable(m.stuff)) continue;
      const env = m.stuff.getContainer();
      if (env) out.push({ stuff: env, score: m.score });
    }
  }
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
 * match gets auto-extended with detail names at the current
 * `via.detailPath` depth — direct (host keywords + name) plus one
 * sub-candidate per detail at the current depth, each carrying the
 * extended `via.detailPath`. Score every variant; keep the matching
 * ones with their respective `via`.
 *
 * This is the unified addressing rule that covers what the old `.X`
 * detail-drill operator did, and lets a chain like `here:bookcase:book`
 * resolve to the book child detail of the bookcase detail of the room.
 */
function filterByKeywords(input: MqlMatch[], words: string[]): MqlMatch[] {
  if (words.length === 0) return input;
  const out: MqlMatch[] = [];
  for (const m of input) {
    // Direct candidate: host's own keywords + display name, prior via
    // preserved.
    const direct: ScopeCandidate = {
      stuff: m.stuff,
      name: nameOf(m.stuff),
      keywords: keywordsOf(m.stuff),
    };
    if (m.via) direct.via = m.via;

    // Detail-extension candidates: one per detail at the current via
    // depth (top-level when no via, child-of-tip when via set). Each
    // lands as a separate candidate so it can be scored against the
    // query independently and bring its own via attribution.
    const detailCandidates = detailExtensionCandidates(m);

    let best: { score: number; via: MqlMatchVia | undefined } | null = null;
    for (const c of [direct, ...detailCandidates]) {
      const score = scoreCandidate(c, words);
      if (score === 0) continue;
      const candidateScore = Math.max(m.score, score);
      if (!best || candidateScore > best.score) {
        best = { score: candidateScore, via: c.via };
      }
    }
    if (best) {
      const next: MqlMatch = { stuff: m.stuff, score: best.score };
      if (best.via) next.via = best.via;
      out.push(next);
    }
  }
  return out;
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

/**
 * Public type surface for MQL — the MUD Query Language.
 *
 * The runtime entry points live on {@link ../mql:MqlApi}; this module
 * defines the data shapes those entry points consume and produce.
 *
 * Two product-level result types reflect caller intent:
 *
 *   - {@link MqlOne} — single-cardinality lookup. Returned from
 *     `MqlApi.resolveOne`. Future auto-disambiguation (UI prompt when
 *     several candidates score equally) will hook into this surface
 *     additively; v1 just picks the highest-scored match.
 *
 *   - {@link MqlMany} — multi-cardinality lookup. Returned from
 *     `MqlApi.resolveMany`. Never disambiguated — multi-intent is the
 *     point.
 *
 * Both carry an optional {@link MqlMatchVia} attribution describing
 * which sub-feature path produced the match (a Detail name, an Exit
 * reference, etc.). Subsystems augment `MqlMatchVia` via TypeScript
 * declaration merging; the base shape is intentionally empty.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import type { Unit } from '../../lib/quantity';

/**
 * Resolution context for an MQL query.
 *
 * - `commandGiver` — the actor whose perspective drives the lookup.
 *   Inventory, pronoun memory, and "you" pronouns flow from this Stuff.
 *
 * - `scope` — an MQL fragment string identifying the search area. Per
 *   the unified-scope model, scope is just another query — `"here"`,
 *   `"inventory, here"`, `"online"`, `"/platform/agent/Avatar/*"`, `"#abc123"`.
 *   The dispatcher resolves the fragment to anchor Stuff(s); the
 *   resolver walks each anchor's neighborhood (own keywords, contents,
 *   details, environment, exits) to score query candidates.
 */
export interface MqlContext {
  /**
   * The viewer the query resolves for — perception (honest fog),
   * recognition-relative naming, and the giver-anchored seeds
   * (`me`/`here`/`peers`/`reachable`/`inventory`) all key off it.
   *
   * `null` is the **code-only system mode** (the `attention`
   * precedent — the command dispatcher always sets a giver, so
   * player-typed MQL can never reach it): a viewer-blind enumeration
   * for engine mechanics (registry sweeps, fixture indexes). Under a
   * null giver only the viewer-free seeds resolve (`world`, path
   * globs, `#id`, `online`); giver-anchored seeds and bareword
   * predicates throw, candidates emit with baseline names and no
   * perception gate.
   */
  commandGiver: (Stuff & CommandGiver) | null;
  scope: string;
  /**
   * The perception attention the scope-walk resolves concealed candidates
   * at — the `PerceptionApi.perceives` gate's attention term. A **code-only**
   * field: the command dispatcher never sets it, so player-typed MQL always
   * resolves at the passive baseline and honest fog is unchanged. Only
   * in-code callers opt in — a detection consumer (the `wary` sentry brain)
   * passes its active `alertness` so `peers:living` enumerates the creatures
   * it perceives *when actively watching*, not merely what a passing glance
   * would catch. Absent → the passive baseline (byte-identical to prior
   * behavior). Applies to direct-seed resolution (`peers` / `reachable` /
   * `here` / `inventory` / `online` / `world`) and their mid-chain
   * element-derived forms.
   */
  attention?: number;
}

/**
 * The error class the subscription substrate classifies on
 * (`'permission'` vs `'parse'` / `'resolve'`). ⚠ No resolver path throws
 * it any more (content-packs wave 3 — resolving is never a permission);
 * the class stays as the name the substrate and the client import.
 */
export class MqlPermissionError extends Error {
  constructor(
    message: string,
    public readonly operator: string,
  ) {
    super(message);
    this.name = 'MqlPermissionError';
  }
}

/**
 * Sub-feature attribution. Tells callers which path produced the
 * match, so a controller (e.g., GoController) can act on the discovery
 * (traverse the Exit, drill into the Detail) without re-discovering it.
 *
 * The base shape is intentionally empty; subsystems augment via
 * `declare module '../api/mql/types' { interface MqlMatchVia { … } }`:
 *
 *   - `lib/description/Detailed.ts` adds `detailPath?: string[]`.
 *   - `lib/spatial/Exit.ts` adds `exit?: Exit`.
 *
 * When matches arrive via mixed paths (e.g., one detail, one exit),
 * the resolver returns `via: undefined` per the consistency rule.
 */
export interface MqlMatchVia {}

/**
 * Internal per-match record tracked by the resolver. Carries the
 * matched Stuff, its score under the scoring rule, and any
 * sub-feature attribution. Phase 7's `MqlApi.resolveOne` /
 * `MqlApi.resolveMany` collapse these into the public result shapes.
 *
 * Not exported from the public `MqlApi` surface.
 */
export interface MqlMatch {
  stuff: Stuff;
  score: number;
  via?: MqlMatchVia;
}

/**
 * The value an MQL quantity carries — what the quantity *is*:
 *
 *   - `'count'` — a discrete integer count (`5 coins`, `coin:{5}`).
 *     Consumed by `GlobbableApi.applyQuantity`.
 *   - `'all'` — the sentinel "the whole lot" (`all coins`, `coin:{*}`).
 *   - `'measure'` — a continuous bulk measure (`2 cups`,
 *     `water:{2 cups}`). Carries a serializable `{ value, unit }`
 *     (the `Quantity.toJSON` shape, NOT a live `Quantity` — the AST /
 *     wire layers stay plain-data). Consumed by `BulkableApi.transfer`
 *     via the bulk verbs; glob's count/all path ignores it.
 */
export type MqlQuantityValue =
  | { kind: 'count'; n: number }
  | { kind: 'all' }
  | { kind: 'measure'; value: number; unit: Unit };

/**
 * A resolved quantity hint riding on an MQL result.
 *
 * `value.kind` is what the quantity *is* — see {@link MqlQuantityValue}.
 *
 * `mode` is **transport-only**: it carries the syntax-form signal
 * (formal `:{N}` → strict; natural-language `2 X` → lenient) from
 * the resolver to the helper. `GlobbableApi.applyQuantity` is its
 * only legitimate consumer. **Controllers don't read `mode`** — they
 * pass the whole `MqlQuantity` through to the helper without
 * branching. The one exception is a controller that wants to
 * deliberately override policy
 * (`applyQuantity(stuff, { ...quantity, mode: 'strict' }, action)`),
 * which is a loud, explicit signal; v1 has no such verbs.
 */
export type MqlQuantity = {
  value: MqlQuantityValue;
  mode: 'strict' | 'lenient';
};

/**
 * Alias used by the desugar pass — same shape as the resolved
 * quantity that ends up on `MqlOne` / `MqlMany`. Kept distinct from
 * `MqlQuantity` so the path-from-input transformations read
 * cleanly: desugar produces a *hint*, the resolver promotes it to a
 * *result quantity* (potentially merging with a parser-produced
 * `QuantityNode`).
 */
export type MqlQuantityHint = MqlQuantity;

/**
 * Result of `MqlApi.resolveOne`. `stuff` is null when there were no
 * matches; otherwise it's the highest-scored candidate. `via` is the
 * sub-feature attribution for that candidate, or undefined when the
 * match was direct.
 *
 * `quantity` carries the leading-number or formal `:{N}` hint when
 * the query supplied one; controllers thread it into
 * `GlobbableApi.applyQuantity` to distribute the action across
 * candidates.
 */
export interface MqlOne {
  stuff: Stuff | null;
  via?: MqlMatchVia;
  quantity?: MqlQuantity;
}

/**
 * Result of `MqlApi.resolveMany`. `stuff` is the full list of matches
 * (empty array when none). `via` describes the attribution at the
 * query level, present only when every match arrived through the same
 * sub-feature path; mixed paths produce `via: undefined`.
 *
 * `quantity` carries the leading-number or formal `:{N}` hint when
 * the query supplied one. See {@link MqlQuantity}.
 */
export interface MqlMany {
  stuff: Stuff[];
  via?: MqlMatchVia;
  quantity?: MqlQuantity;
}

/**
 * Per-field model-side wrapper for a `type: object` resolution. The
 * dispatcher lands this on `model[fieldName]` after running MQL,
 * bundling everything a controller might need:
 *
 *   - `stuff`: the resolved Stuff, or `null` when MQL produced no
 *     match. (Inherited from {@link MqlOne}.) Distinguished
 *     from the field being absent on the model (player typed
 *     nothing) — controllers can tell the two apart.
 *
 *   - `via`: sub-feature attribution (`exit` for direction matches,
 *     `detailPath` for detail drills, etc.). (Inherited from
 *     {@link MqlOne}.)
 *
 *   - `raw`: the player-typed text post-desugar, before MQL replaced
 *     it with the resolved Stuff. Always present when this wrapper
 *     exists.
 *
 *   - `prep`: lowercased preposition the matcher consumed for this
 *     field per the YAML's `prepositions:` declaration. Absent when
 *     no preposition was declared or none typed.
 *
 * Controllers destructure directly:
 *
 *   const { stuff, via, raw, prep } = model.target;
 */
export interface MqlOneResult extends MqlOne {
  raw: string;
  prep?: string;
}

/**
 * Plural counterpart to {@link MqlOneResult}. Adds `raw` and `prep` to
 * {@link MqlMany}. `stuff` is the full match list (empty
 * array when MQL produced no match — still a valid outcome the
 * controller decides about); `via` is the query-level attribution
 * (only when every match arrived through the same path).
 *
 * Inherits `quantity` from {@link MqlMany} — see {@link MqlQuantity}.
 */
export interface MqlManyResult extends MqlMany {
  raw: string;
  prep?: string;
}


// ---------------------------------------------------------------------------
// AST nodes — produced by the parser, consumed by the resolver.
// ---------------------------------------------------------------------------

/**
 * Pronoun keyword — recognized at the head of a chain. (Mid-chain
 * occurrences fall through to {@link KeywordsNode}.)
 */
export type PronounName = 'me' | 'here' | 'it' | 'them' | 'him' | 'her';

/** Top-level node — the whole query, possibly a comma-union. */
export interface QueryNode {
  kind: 'query';
  /** One or more sublists; multiple entries means union (`A, B, C`). */
  sublists: SublistNode[];
}

/**
 * A single sublist: a base chain plus any number of right-hand chains
 * to subtract. Set difference is left-associative —
 * `A - B - C` = `(A - B) - C`, modeled by storing `B` and `C` in
 * {@link subtract} in order.
 */
export interface SublistNode {
  kind: 'sublist';
  base: ChainNode;
  subtract: ChainNode[];
}

/**
 * A chain: a head element followed by zero or more chain operations.
 * Each operation introduces a new element via the `:` operator. The
 * old `.X` detail-drill operator is gone — detail navigation is now
 * uniform with keyword filtering: `:keyword` mid-chain auto-extends
 * the candidate space with detail names at the current via depth.
 * The `.` token survives in the lexer for namespaced atoms inside
 * bracket bodies (`prop.X`, `mixin.X`), but it never appears as a
 * top-level chain operator.
 */
export interface ChainNode {
  kind: 'chain';
  head: ChainElement;
  rest: ChainOp[];
}

/** One step of a chain: the `:` operator plus the element it
 *  introduces. */
export interface ChainOp {
  op: ':';
  element: ChainElement;
}

export type ChainElement =
  | PronounNode
  | KeywordsNode
  | LiteralNode
  | PathNode
  | StuffIdNode
  | LastResultNode
  | TransformNode
  | OrdinalNode
  | BracketNode
  | GroupNode
  | QuantityNode;

export interface PronounNode {
  kind: 'pronoun';
  name: PronounName;
}

/**
 * AND-narrow keyword search/filter. Multi-word forms (`red rose`) are
 * one node with multiple `words` — parser collected consecutive
 * barewords into the same node. Position in the chain determines
 * meaning: at head, search the field's scope; mid-chain, filter the
 * current set.
 */
export interface KeywordsNode {
  kind: 'keywords';
  words: string[];
}

/** `'…'` — quoted literal name/keyword search (whitespace preserved). */
export interface LiteralNode {
  kind: 'literal';
  value: string;
}

/** `/path/with/*globs` — template-path glob seed. */
export interface PathNode {
  kind: 'path';
  pattern: string;
}

/** `#abc123` — direct stuff id seed. */
export interface StuffIdNode {
  kind: 'stuffId';
  id: string;
}

/** `$$` — the previous query's full result. */
export interface LastResultNode {
  kind: 'lastResult';
}

/**
 * Chain transforms — descend / ascend operators.
 *
 *   - `:i` shallow inventory / detail-children — one container level
 *     down (no via) or one detail level down (via set).
 *   - `:I` deep inventory — every Stuff in the contents subtree (no
 *     via), or every detail descendant from the current tip (via set).
 *   - `:e` shallow environment — one container level up (no via) or
 *     one detail level up (via set).
 *   - `:E` root environment — walk to the topmost containing Stuff
 *     (no via) or pop the entire detail path (via set).
 *
 *   - `:b` bulk — keep the holder Stuff on the target field and stamp
 *     `via.bulk = { affordance: 'interior' }` when it's a Bulkable
 *     interior holder; drop it otherwise (capability-gated, like `:i`).
 *
 * Lower-case forms are single-step; upper-case forms are the deep /
 * root counterparts. Case is preserved through the lexer's
 * `transformLetter` token. `:B` is unallocated (a bare `B` lowercases
 * to a `'b'` keyword filter).
 */
export interface TransformNode {
  kind: 'transform';
  transform: 'i' | 'I' | 'e' | 'E' | 'b';
}

/** `#5` at chain position — equivalent to `:[5]`. */
export interface OrdinalNode {
  kind: 'ordinal';
  index: number;
}

export type BracketNode =
  | { kind: 'bracket-ordinal'; index: number }
  | {
      kind: 'bracket-range';
      start: number;
      /** End index for inclusive/from-end ranges; null for `[N..]`
       *  (to-end). */
      end: number | null;
      mode: 'inclusive' | 'from-end' | 'to-end';
    }
  | { kind: 'bracket-filter'; expr: ExprNode };

/** `(query)` — explicit grouping inside a chain. */
export interface GroupNode {
  kind: 'group';
  query: QueryNode;
}

/**
 * Formal quantity syntax — `:{N}`, `:{*}`, or the bulk measure
 * `:{N unit}` (`water:{2 cups}`). Mid-chain only; rejected as a chain
 * head (no current set to address). The resolver does NOT modify the
 * candidate set when it sees a `QuantityNode` — it just threads the
 * quantity forward onto the final `MqlMany` / `MqlOne` wrapper, marked
 * `mode: 'strict'`. See {@link MqlQuantityValue}, {@link MqlQuantity},
 * `docs/mql-grammar.md § Formal quantity` (user-facing surface), and
 * `docs/subsystems/glob.md § MQL touchpoints` (runtime hookup).
 */
export interface QuantityNode {
  kind: 'quantity';
  value: MqlQuantityValue;
}

// Filter expression AST (inside `[…]`).

export type ExprNode =
  | { kind: 'or'; left: ExprNode; right: ExprNode }
  | { kind: 'and'; left: ExprNode; right: ExprNode }
  | { kind: 'not'; child: ExprNode }
  | { kind: 'comparison'; left: AtomNode; op: CmpOp; right: ValueNode }
  | { kind: 'has'; atom: AtomNode }
  | { kind: 'truthy'; atom: AtomNode };

export type CmpOp = '=' | '!=' | '>' | '<' | '>=' | '<=';

export type AtomNode =
  | { kind: 'namespaced'; namespace: string; key: string }
  | { kind: 'name' }
  | { kind: 'id' };

export type ValueNode =
  | { kind: 'value-int'; value: number }
  | { kind: 'value-quoted'; value: string }
  | { kind: 'value-ident'; value: string };

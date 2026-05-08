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

/**
 * Resolution context for an MQL query.
 *
 * - `commandGiver` — the actor whose perspective drives the lookup.
 *   Inventory, pronoun memory, and "you" pronouns flow from this Stuff.
 *
 * - `scope` — an MQL fragment string identifying the search area. Per
 *   the unified-scope model, scope is just another query — `"here"`,
 *   `"inventory, here"`, `"online"`, `"/obj/Avatar/*"`, `"#abc123"`.
 *   The dispatcher resolves the fragment to anchor Stuff(s); the
 *   resolver walks each anchor's neighborhood (own keywords, contents,
 *   details, environment, exits) to score query candidates.
 */
export interface MqlContext {
  commandGiver: Stuff & CommandGiver;
  scope: string;
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
 * Result of `MqlApi.resolveOne`. `stuff` is null when there were no
 * matches; otherwise it's the highest-scored candidate. `via` is the
 * sub-feature attribution for that candidate, or undefined when the
 * match was direct.
 */
export interface MqlOne {
  stuff: Stuff | null;
  via?: MqlMatchVia;
}

/**
 * Result of `MqlApi.resolveMany`. `stuff` is the full list of matches
 * (empty array when none). `via` describes the attribution at the
 * query level, present only when every match arrived through the same
 * sub-feature path; mixed paths produce `via: undefined`.
 */
export interface MqlMany {
  stuff: Stuff[];
  via?: MqlMatchVia;
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
 */
export interface MqlManyResult extends MqlMany {
  raw: string;
  prep?: string;
}

/**
 * Permission tier for MQL operators and seeds. Operators that touch
 * sensitive data (`online`, `world`, path globs) declare a tier; the
 * resolver gates access against the giver's privilege level.
 */
export type PermissionTier = 'public' | 'authoring' | 'admin';

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
  | GroupNode;

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
 * Lower-case forms are single-step; upper-case forms are the deep /
 * root counterparts. Case is preserved through the lexer's
 * `transformLetter` token.
 */
export interface TransformNode {
  kind: 'transform';
  transform: 'i' | 'I' | 'e' | 'E';
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

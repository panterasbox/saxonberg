/**
 * Traversal — one walk, parameterized.
 *
 * ⭐⭐ **The doctrine: one traversal, or none.** This repo had eleven
 * hand-written walks over the world's shape — a frontier, a visited
 * set and a bound each. That is not eleven implementations of one
 * thing; it is **eleven behaviours**, and four of them were
 * order-dependent in ways a player can perceive. The three perception
 * modalities and the audience gather each thread one mutable `visited`
 * set through a depth-first recursion, so neighbour order decides
 * which room is charged at which depth, the dB a listener hears, and
 * the compass direction printed beside it. Nobody chose that; it is
 * what a copy does.
 *
 * ⛔⛔ **What this class does NOT own: policy.** It owns the frontier,
 * the visited set, the bounds, the recursion order and the expansion
 * count. Hazard guards, atmosphere refusal, `published`, mode
 * admission, cost caps — every one of those lives in the **caller's**
 * `neighbours` or `descend`. A skeleton that knew about doors would be
 * the twelfth walk with extra steps.
 *
 * ⚠ **The skeleton is deliberately SYNCHRONOUS.** The perception
 * walks' entry points are sync (`signalAt` returns a `Light`), and
 * making the walk async would change their call shape across every
 * consumer. Async callers materialise their graph first and then walk
 * it synchronously — which is also exactly the shape hierarchical
 * search wants (load a zone's nodes async, walk them sync).
 *
 * ⚠⚠ **The depth gate fires BEFORE the visited mark**, because that is
 * what the perception walks do today and it is observable: a node
 * first reached at depth 3 is refused *without being marked*, so it
 * stays reachable at depth ≤ 2 by another path. Marking it would
 * silently darken rooms. `scripts/__tests__/golden/perception-characterization.json`
 * is what holds this; see `routing-plan.md` § Risks 12.
 *
 * Generic over the node type `N`, the fold result `R`, and the carry
 * `C` — so a containment walk is one `neighbours` function away
 * (deferred; `routing-requirements.md` § Non-goals).
 */

/** One step to a neighbour. `edge` is the caller's own edge value. */
export interface Leg<N> {
  node: N;
  dir?: string | null;
  /** Linear attenuation along this leg (the perception walks' `tau`). */
  tau?: number;
  /** The leg's own cost on the minutes axis, when the caller knows one. */
  minutes?: number | null;
  /** Whatever the caller wants back in `fold` / `descend`. */
  edge?: unknown;
}

/**
 * The three ways a walk may be bounded.
 *
 * ⭐ `hops` and `cost` are **natural limits** — the walk simply does
 * not expand past them, the way `MAX_HOPS`, `AIR_REACH` and a forage
 * radius do. `nodes` is the **budget**: reaching it is a *refusal*,
 * reported as `exhausted: 'nodes'`, because a search that ran out of
 * allowance has not proved there is no way. Conflating the two is how
 * a caller comes to believe "no route" when the truth was "I stopped
 * looking".
 */
export interface Bound {
  hops?: number;
  nodes?: number;
  cost?: number;
}

export type TraversalOrder = 'depth-first' | 'breadth-first' | 'cheapest-first';

export interface TraversalSpec<N, R, C = void> {
  order: TraversalOrder;
  /** The visited identity — a `stuffId`, a template path, a node ref. */
  keyOf(node: N): string;
  /**
   * ORDERED neighbours. ⚠ The order IS behaviour for a depth-first
   * walk; the caller's own guards belong here.
   */
  neighbours(node: N, depth: number): readonly Leg<N>[];
  bound: Bound;
  /**
   * Transform the carry along a leg. Return `null` to **refuse the
   * leg** — a cost cap, a mode the traveller does not admit, a
   * boundary that does not conduct.
   */
  descend?(carry: C, leg: Leg<N>, depth: number): C | null;
  /**
   * Pre-order. Return a value to **short-circuit this node with it**
   * (a vacuum returns the empty accumulator); return `'halt'` to stop
   * the whole walk here (mine air stops at the first breathing room).
   */
  enter?(node: N, depth: number, carry: C): R | 'halt' | undefined;
  /**
   * Post-order: this node's own contribution, plus its children's
   * results **in neighbour order**. Runs on every node the walk
   * entered, leaves included (`children = []`).
   */
  fold(
    node: N,
    depth: number,
    carry: C,
    children: readonly { leg: Leg<N>; result: R }[]
  ): R;
  /** `cheapest-first` only: the leg's cost on the axis being minimised. */
  cost?(leg: Leg<N>): number;
  /** Caller-threaded, when a walk shares one visited set across calls. */
  visited?: Set<string>;
}

export interface TraversalResult<N, R> {
  result: R;
  /** How many nodes the walk entered — the compute meter's input. */
  expanded: number;
  /**
   * ⭐ `'nodes'` iff the **budget** ran out. A natural `hops`/`cost`
   * limit is not exhaustion: the walk did what it was asked.
   */
  exhausted: 'nodes' | null;
  /** The node whose `enter` returned `'halt'`, when one did. */
  halted?: N;
}

/** The carry a walk starts with, and the seed `fold` gets. */
export interface TraversalStart<C> {
  carry: C;
  depth?: number;
}

export class Traversal<N, R, C = void> {
  private readonly spec: TraversalSpec<N, R, C>;

  constructor(spec: TraversalSpec<N, R, C>) {
    this.spec = spec;
    if (spec.order === 'cheapest-first' && !spec.cost) {
      throw new Error(
        'Traversal: a cheapest-first walk needs a `cost(leg)` — there is ' +
          'no axis to minimise without one.'
      );
    }
  }

  /** Walk from one start. */
  public walk(start: N, from: TraversalStart<C>): TraversalResult<N, R> {
    return this.walkFrom([start], from);
  }

  /**
   * Walk from several starts at once — a zone's entrances, a lane's
   * seeds, every trunk of a grid. The starts share one visited set, so
   * the first to reach a node owns it.
   */
  public walkFrom(
    starts: readonly N[],
    from: TraversalStart<C>
  ): TraversalResult<N, R> {
    const state: WalkState<N> = {
      visited: this.spec.visited ?? new Set<string>(),
      expanded: 0,
      exhausted: null,
      halted: undefined,
    };
    const depth = from.depth ?? 0;

    const first = starts[0];
    if (first === undefined) {
      throw new Error('Traversal.walkFrom: no start node');
    }

    let result: R;
    if (this.spec.order === 'depth-first') {
      // ⭐ Deliberately refused rather than invented. A depth-first
      // walk's answer is ONE node's fold over its subtree; several
      // roots would need a synthetic parent to fold them into, and
      // there is no honest node to name as that parent. Every
      // multi-start caller in the tree (a zone's entrances, a lane's
      // seeds, a grid's trunks) wants a reach set, which is a queued
      // order. If a depth-first multi-root caller ever appears it
      // brings its own answer to that question.
      if (starts.length > 1) {
        throw new Error(
          'Traversal.walkFrom: a depth-first walk takes ONE start — ' +
            'several roots have no node to fold into. Use a queued order.'
        );
      }
      // ⚠⚠ Same sentinel care as the queued path, and the test is
      // `expanded`, NOT `dfs !== undefined`. A depth-first walk enters
      // its start first or not at all, so `expanded === 0` means the
      // start itself was refused (already visited, or past the depth
      // gate) and the fallback fold is the honest empty answer.
      // Reading the RESULT instead would double-fold every `R = void`
      // walk — see the forage census.
      const dfs = this.#dfs(first, depth, from.carry, state);
      result =
        state.expanded > 0
          ? (dfs as R)
          : this.spec.fold(first, depth, from.carry, []);
    } else {
      result = this.#queued(starts, depth, from.carry, state);
    }

    return {
      result,
      expanded: state.expanded,
      exhausted: state.exhausted,
      ...(state.halted !== undefined ? { halted: state.halted } : {}),
    };
  }

  // ── depth-first ────────────────────────────────────────────────────

  /**
   * Returns `undefined` when the node was refused (already visited,
   * past the depth gate, or the budget is gone) — a refused node makes
   * no contribution to its parent's fold.
   */
  #dfs(node: N, depth: number, carry: C, state: WalkState<N>): R | undefined {
    const { spec } = this;

    // ⚠⚠ The depth gate FIRST, and the node is NOT marked. See the
    // file header: marking here would change what a second path can
    // still reach, which is observable as light and sound.
    if (spec.bound.hops !== undefined && depth > spec.bound.hops) {
      return undefined;
    }
    const key = spec.keyOf(node);
    if (state.visited.has(key)) return undefined;
    if (this.#overBudget(state)) return undefined;
    state.visited.add(key);
    state.expanded += 1;

    const early = spec.enter?.(node, depth, carry);
    if (early === 'halt') {
      state.halted = node;
      return spec.fold(node, depth, carry, []);
    }
    if (early !== undefined) return early;

    const children: { leg: Leg<N>; result: R }[] = [];
    for (const leg of spec.neighbours(node, depth)) {
      const next = spec.descend
        ? spec.descend(carry, leg, depth + 1)
        : (carry as C);
      if (next === null) continue;
      const r = this.#dfs(leg.node, depth + 1, next, state);
      if (r !== undefined) children.push({ leg, result: r });
      if (state.halted !== undefined) break;
    }
    return spec.fold(node, depth, carry, children);
  }

  // ── breadth-first and cheapest-first ───────────────────────────────

  /**
   * Both queued orders share one loop: breadth-first marks visited **on
   * dequeue** and re-checks on enqueue (the shape a forage census and
   * a lane compile already use), and cheapest-first is Dijkstra with a
   * deterministic tie-break on `keyOf` — ⭐ *deterministic*, because
   * "the router picked a different road today" is a bug report nobody
   * can act on.
   *
   * ⚠ **A queued walk has no tree, so there is no post-order fold to
   * build.** `fold` is called once per entered node, in visit order,
   * always with `children = []`, and its LAST return is the walk's
   * result. That is not a compromise — it is what every queued caller
   * in this tree actually does: accumulate into its own closure (a
   * reach set, a downstream set, a three-way forage census) and hand
   * back the accumulator. A node's cheapest-cost predecessor, which a
   * route needs, is the caller's to record in `fold`.
   */
  #queued(
    starts: readonly N[],
    depth: number,
    carry: C,
    state: WalkState<N>
  ): R {
    const { spec } = this;
    const first = starts[0] as N;
    const cheapest = spec.order === 'cheapest-first';
    const queue: QueueEntry<N, C>[] = starts.map((node) => ({
      node,
      depth,
      carry,
      cost: 0,
    }));
    // ⚠⚠ A BOOLEAN, not `last !== undefined`. `R` may legitimately BE
    // `void`, and `last ?? fold(start, …)` then folded the start a
    // SECOND time — which the forage census caught as a doubled
    // bloom area (12 m² where one cherry tree stands in 6). A
    // sentinel that collides with a valid result is not a sentinel.
    let folded = false;
    let last: R | undefined;

    while (queue.length > 0) {
      if (cheapest) {
        // Smallest cost first, `keyOf` breaking every tie.
        queue.sort(
          (a, b) =>
            a.cost - b.cost || spec.keyOf(a.node).localeCompare(spec.keyOf(b.node))
        );
      }
      const entry = queue.shift()!;
      const key = spec.keyOf(entry.node);
      if (state.visited.has(key)) continue;
      if (spec.bound.hops !== undefined && entry.depth > spec.bound.hops) {
        continue;
      }
      if (spec.bound.cost !== undefined && entry.cost > spec.bound.cost) {
        continue;
      }
      if (this.#overBudget(state)) break;
      state.visited.add(key);
      state.expanded += 1;

      const early = spec.enter?.(entry.node, entry.depth, entry.carry);
      if (early === 'halt') {
        state.halted = entry.node;
        last = spec.fold(entry.node, entry.depth, entry.carry, []);
        folded = true;
        break;
      }
      if (early !== undefined) {
        last = early;
        folded = true;
        continue;
      }

      last = spec.fold(entry.node, entry.depth, entry.carry, []);
      folded = true;

      for (const leg of spec.neighbours(entry.node, entry.depth)) {
        if (state.visited.has(spec.keyOf(leg.node))) continue;
        const next = spec.descend
          ? spec.descend(entry.carry, leg, entry.depth + 1)
          : (entry.carry as C);
        if (next === null) continue;
        queue.push({
          node: leg.node,
          depth: entry.depth + 1,
          carry: next,
          cost: entry.cost + (spec.cost ? spec.cost(leg) : 0),
        });
      }
    }

    // A walk that entered NOTHING still owes the caller an
    // accumulator — every start was already visited, or the budget was
    // spent before the first node.
    return folded ? (last as R) : spec.fold(first, depth, carry, []);
  }

  #overBudget(state: WalkState<N>): boolean {
    const { nodes } = this.spec.bound;
    if (nodes === undefined) return false;
    if (state.expanded < nodes) return false;
    state.exhausted = 'nodes';
    return true;
  }
}

interface WalkState<N> {
  visited: Set<string>;
  expanded: number;
  exhausted: 'nodes' | null;
  halted: N | undefined;
}

interface QueueEntry<N, C> {
  node: N;
  depth: number;
  carry: C;
  cost: number;
}

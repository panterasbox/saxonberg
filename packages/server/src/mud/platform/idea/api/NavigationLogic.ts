// NavigationLogic — the hot-reloadable logic singleton behind
// NavigationApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import type LocationGraphRegistry from '../LocationGraphRegistry';
import type { PlaceNode } from '../../../lib/location/PlaceNode';
import type { GraphFinding } from '../../../lib/location/GraphInvariants';
import { DocumentApi } from '../../../api/document';
import { WorldClockApi } from '../../../api/worldclock';
import type {
  MapClaim,
  MapDocument,
} from '../../../lib/location/MapClaim';
import type { CardinalDirection } from '../../../api/navigation';
import { Traversal } from '../../../lib/location/Traversal';
import type { Leg } from '../../../lib/location/Traversal';
import {
  TravelProfile,
  OmnivorousTravelProfile,
  type TravelProfileSpec,
} from '../../../lib/location/TravelProfile';
import {
  KnowledgeGraph,
  type ClaimLike,
  type KnownWay,
} from '../../../lib/location/KnowledgeGraph';
import type {
  RouteAssumption,
  RouteLeg,
  RouteOutcome,
  RoutePlan,
  RouteSource,
} from '../../../lib/location/RoutePlan';

/** Where the graph registry stands. */
const GRAPH_REGISTRY_PATH = '/platform/idea/LocationGraphRegistry';

/**
 * The registry, or null before it has warmed.
 *
 * ⚠ `null` is a real answer and every caller treats it as one: the
 * registry is booted from the platform pack's manifest, and plenty runs
 * before that — the installer's own 2,500 row writes, every unit test
 * that never boots a world. A graph read before the warm answers
 * *nothing yet*, not *no such place*, which is why the projection hook
 * checks `isGraphWarm()` first rather than relying on these to no-op.
 */
function registry(): LocationGraphRegistry | null {
  return (
    StuffApi.findByTemplatePath<LocationGraphRegistry>(GRAPH_REGISTRY_PATH) ??
    null
  );
}

/**
 * Offsets keyed by long-form direction name.
 *
 * y grows north (matches "map up"); z grows up (standard).
 */
const DIRECTION_OFFSETS: Record<CardinalDirection, [number, number, number]> = {
  north: [0, 1, 0],
  south: [0, -1, 0],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  northeast: [1, 1, 0],
  northwest: [-1, 1, 0],
  southeast: [1, -1, 0],
  southwest: [-1, -1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

/**
 * Alias → canonical long form. Keys are lower-cased tokens the parser will
 * see (`n`, `ne`, `u`, `d`, ...).
 */
const DIRECTION_ALIASES: Record<string, CardinalDirection> = {
  n: 'north',
  north: 'north',
  s: 'south',
  south: 'south',
  e: 'east',
  east: 'east',
  w: 'west',
  west: 'west',
  ne: 'northeast',
  northeast: 'northeast',
  nw: 'northwest',
  northwest: 'northwest',
  se: 'southeast',
  southeast: 'southeast',
  sw: 'southwest',
  southwest: 'southwest',
  u: 'up',
  up: 'up',
  d: 'down',
  down: 'down',
};

/** Inverses for the 10 cardinals (used for arrival messages). */
const DIRECTION_INVERSES: Record<CardinalDirection, CardinalDirection> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  northwest: 'southeast',
  southeast: 'northwest',
  southwest: 'northeast',
  up: 'down',
  down: 'up',
};

const CARDINALS: readonly CardinalDirection[] = [
  'north',
  'south',
  'east',
  'west',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
  'up',
  'down',
];

/** Module-private canonical lookup — shared by every method below. */
function normalize(input: string): CardinalDirection | undefined {
  return DIRECTION_ALIASES[input.trim().toLowerCase()];
}

const NavigationApiCallers = SecurityPolicies.FromModule('/api/navigation#NavigationApi'
);

/**
 * What travels down a leg while a route is being searched: where I am,
 * where I came from, and by which way. ⭐ Carrying the predecessor
 * rather than observing it is what makes a cheapest-first search
 * record the CHEAPEST arrival — see `planOver`.
 */
/** What a reach answers: the places, the ways between them, the cost. */
export interface ReachResult {
  reached: string[];
  edges: Array<{ from: string; to: string; dir: string }>;
  expanded: number;
  /** ⚠ `true` means the set is a FLOOR — the budget ran out. */
  exhausted: boolean;
}

interface StepCarry {
  at: string;
  from: string | null;
  way: KnownWay | null;
}

/**
 * NavigationLogic — the hot-reloadable logic singleton behind
 * {@link NavigationApi}.
 *
 * Holds the canonical direction table (offsets, aliases, inverses) and
 * the lookup methods. Lives at `/platform/idea/api/navigation`; `NavigationApi`'s
 * statics forward here via `StuffApi.singletonSync`. Each public method
 * is gated `FromModule('/api/navigation#NavigationApi')` (per-method,
 * not class-level — see {@link MaterialLogic} for why).
 *
 * The direction constants and the `CardinalDirection` vocabulary are
 * *placed* here (constants are placed, not re-exported); the type is
 * re-exported type-only from the Api face. Internal lookups go through
 * the module-private `normalize` free function rather than
 * `this.normalizeDirection`, so there are no intra-singleton self-calls
 * to trip the gate.
 *
 * @internal
 */
@Unshadowable
export class NavigationLogic extends ApiLogic {
  /** See {@link NavigationApi.normalizeDirection}. */
  @CallSecurity(NavigationApiCallers)
  public normalizeDirection(input: string): CardinalDirection | undefined {
    return normalize(input);
  }

  /** See {@link NavigationApi.invertDirection}. */
  @CallSecurity(NavigationApiCallers)
  public invertDirection(direction: string): CardinalDirection | undefined {
    const canonical = normalize(direction);
    if (!canonical) return undefined;
    return DIRECTION_INVERSES[canonical];
  }

  /** See {@link NavigationApi.directionOffset}. */
  @CallSecurity(NavigationApiCallers)
  public directionOffset(
    direction: string
  ): [number, number, number] | undefined {
    const canonical = normalize(direction);
    if (!canonical) return undefined;
    return DIRECTION_OFFSETS[canonical];
  }

  /** See {@link NavigationApi.isCardinalDirection}. */
  @CallSecurity(NavigationApiCallers)
  public isCardinalDirection(direction: string): boolean {
    return normalize(direction) !== undefined;
  }

  /** See {@link NavigationApi.cardinalDirections}. */
  @CallSecurity(NavigationApiCallers)
  public cardinalDirections(): readonly CardinalDirection[] {
    return CARDINALS;
  }

  /* ── the location graph ─────────────────────────────────────────────
   *
   * ⭐ Every method here is STRING-KEYED and takes plain data. Nothing
   * takes a `Stuff`: `NavigationApi` is not on `lint:object-verbs`'s
   * exempt list, and it should not be — the graph is addressed by
   * identity, which is a string, and a method that took a live place
   * would be asking its caller to have stood one up.
   *
   * ⚠ The state and the projection live on `LocationGraphRegistry`
   * (the `AddressRegistry` → `AddressLogic` arrangement): the index
   * must survive a reload of this file, and a reload of the registry
   * re-clones it and rebuilds idempotently.
   */

  /** See {@link NavigationApi.isGraphWarm}. */
  @CallSecurity(NavigationApiCallers)
  public isGraphWarm(): boolean {
    return registry()?.isWarm() ?? false;
  }

  /** See {@link NavigationApi.rebuildGraph}. */
  @CallSecurity(NavigationApiCallers)
  public async rebuildGraph(): Promise<number> {
    return (await registry()?.rebuild()) ?? 0;
  }

  /** See {@link NavigationApi.projectRow}. */
  @CallSecurity(NavigationApiCallers)
  public async projectRow(path: string): Promise<void> {
    await registry()?.projectRow(path);
  }

  /** See {@link NavigationApi.removeRow}. */
  @CallSecurity(NavigationApiCallers)
  public async removeRow(path: string): Promise<void> {
    await registry()?.removeRow(path);
  }

  /** See {@link NavigationApi.reprojectExtent}. */
  @CallSecurity(NavigationApiCallers)
  public async reprojectExtent(extent: string): Promise<number> {
    return (await registry()?.reprojectExtent(extent)) ?? 0;
  }

  /** See {@link NavigationApi.node}. */
  @CallSecurity(NavigationApiCallers)
  public async node(identity: string): Promise<PlaceNode | null> {
    return (await registry()?.node(identity)) ?? null;
  }

  /** See {@link NavigationApi.nodesInZone}. */
  @CallSecurity(NavigationApiCallers)
  public async nodesInZone(zonePath: string): Promise<PlaceNode[]> {
    return (await registry()?.nodesInZone(zonePath)) ?? [];
  }

  /** See {@link NavigationApi.nodesInExtent}. */
  @CallSecurity(NavigationApiCallers)
  public async nodesInExtent(extent: string): Promise<PlaceNode[]> {
    return (await registry()?.nodesInExtent(extent)) ?? [];
  }

  /** See {@link NavigationApi.pointingAt}. */
  @CallSecurity(NavigationApiCallers)
  public async pointingAt(identity: string): Promise<PlaceNode[]> {
    return (await registry()?.pointingAt(identity)) ?? [];
  }

  /** See {@link NavigationApi.interzoneSkeleton}. */
  @CallSecurity(NavigationApiCallers)
  public async interzoneSkeleton(): Promise<PlaceNode[]> {
    return (await registry()?.interzoneSkeleton()) ?? [];
  }

  /** See {@link NavigationApi.edgesIntoUnpublished}. */
  @CallSecurity(NavigationApiCallers)
  public async edgesIntoUnpublished(): Promise<PlaceNode[]> {
    return (await registry()?.edgesIntoUnpublished()) ?? [];
  }

  /** See {@link NavigationApi.checkGraph}. */
  @CallSecurity(NavigationApiCallers)
  public async checkGraph(scope?: string): Promise<GraphFinding[]> {
    return (await registry()?.checkGraph(scope)) ?? [];
  }


  /* ── routing ─────────────────────────────────────────────────────────
   *
   * ⭐⭐⭐ **A plan is a hypothesis, and the knowledge source is the
   * whole design.** `routeBetween` plans over the WORLD index — an
   * omniscient view, legitimate for a brain whose author declared what
   * it knows and for a compile. `routeOnMap` plans over ONE PERSON'S
   * CLAIMS, and ⛔ cannot reach the index at all: the four core
   * modules it calls through may not import it, and
   * `lint:graph-walks`' second check holds that with no ceiling.
   *
   * ⚠ Every search spends a CALLER-DECLARED BUDGET with no default.
   * Performance is the caller's to bound, because the alternative is
   * the engine deciding how much of the world an NPC may think about —
   * and how much an NPC knows is 100% the author's. Exhaustion is a
   * STATED refusal (`'budget'`), never silently *no way*.
   */

  /** See {@link NavigationApi.routeBetween}. */
  @CallSecurity(NavigationApiCallers)
  public async routeBetween(
    from: string,
    to: string,
    profile: TravelProfileSpec,
    knowledge: { extent?: string },
    budget: number,
  ): Promise<RouteOutcome> {
    const reg = registry();
    // ⚠ A real answer, not a throw: plenty runs before the registry is
    // cloned from the pack manifest. A brain skips the beat; a compile
    // records a problem.
    if (!reg) return { ok: false, reason: 'graph-cold', expanded: 0 };
    const graph = await reg.graphView(knowledge.extent);
    return this.planOver(graph, from, to, profile, 'world', budget);
  }

  /** See {@link NavigationApi.routeOnMap}. */
  @CallSecurity(NavigationApiCallers)
  public async routeOnMap(
    viewerKey: string,
    localityPrefix: string,
    from: string,
    to: string,
    profile: TravelProfileSpec,
    budget: number,
  ): Promise<RouteOutcome> {
    // ⛔⛔ The ONLY read on this path is the person's own claims.
    // There is no registry call here and there must never be one.
    //
    // ⚠ Read through `DocumentApi` directly rather than through
    // `this.readMap(...)`: an intra-singleton self-call goes back out
    // through the security proxy and the per-method
    // `FromModule('/api/navigation#NavigationApi')` gate DENIES it —
    // this file's own header warns about exactly that, which is why
    // the direction lookups use a module-private free function.
    const rows = await DocumentApi.readMaps(viewerKey, localityPrefix);
    const maps: MapDocument[] = rows.map((r) => {
      const data = r.data as unknown as MapDocument;
      return {
        locality: typeof data?.locality === 'string' ? data.locality : '',
        claims: Array.isArray(data?.claims) ? data.claims : [],
      };
    });
    const claims: ClaimLike[] = [];
    for (const map of maps) {
      for (const claim of map.claims) {
        // A band is water, not a way: it never enters a route plan.
        if (claim.kind === 'band') continue;
        claims.push({
          kind: claim.kind,
          place: claim.place,
          ...(claim.dir !== undefined ? { dir: claim.dir } : {}),
          to: claim.to ?? null,
          toLabel: claim.toLabel ?? null,
          channel: claim.channel,
          lastSeen: claim.lastSeen,
          ...(claim.conditional === true ? { conditional: true } : {}),
        });
      }
    }
    const graph = KnowledgeGraph.fromClaims(claims);
    return this.planOver(graph, from, to, profile, 'map', budget);
  }

  /** See {@link NavigationApi.routeOverEdges}. */
  @CallSecurity(NavigationApiCallers)
  public routeOverEdges(
    edges: readonly { from: string; to: string; dir?: string; minutes?: number | null }[],
    from: string,
    to: string,
    budget: number,
  ): RouteOutcome {
    const graph = KnowledgeGraph.fromEdges(edges);
    // ⚠ The OMNIVOROUS profile, by design: an authored edge is the
    // author saying *this way is for this lane*, so there is nothing
    // left to admit. See `KnowledgeGraph.fromEdges`.
    const any = new OmnivorousTravelProfile();
    return this.planOver(graph, from, to, any.toSpec(), 'world', budget, true);
  }

  /** See {@link NavigationApi.reachFrom}. */
  @CallSecurity(NavigationApiCallers)
  public async reachFrom(
    starts: readonly string[],
    profile: TravelProfileSpec,
    knowledge: { extent?: string },
    budget: number,
  ): Promise<ReachResult> {
    const reg = registry();
    if (!reg) {
      return { reached: [], edges: [], expanded: 0, exhausted: false };
    }
    const graph = await reg.graphView(knowledge.extent);
    const traveller = new TravelProfile(profile);
    const seeds = starts.filter((s) => graph.has(s));
    if (seeds.length === 0) {
      return { reached: [], edges: [], expanded: 0, exhausted: false };
    }
    const reached: string[] = [];
    // ⭐ The EDGES the reach used, not only the places it touched. A
    // lane is an adjacency map, not a node set, and rebuilding one
    // from the reached set would mean re-reading every node — so the
    // walk reports what it walked.
    const edges: Array<{ from: string; to: string; dir: string }> = [];
    const walk = new Traversal<string, string[], void>({
      order: 'breadth-first',
      keyOf: (id) => id,
      neighbours: (id) => {
        const legs = this.legsOf(graph, id, traveller);
        for (const leg of legs) {
          edges.push({ from: id, to: leg.node, dir: leg.dir ?? '' });
        }
        return legs;
      },
      bound: { nodes: budget },
      fold: (id) => {
        reached.push(id);
        return reached;
      },
    });
    const out = walk.walkFrom(seeds, { carry: undefined });
    // ⚠ Only edges between places the reach actually ENTERED. A leg
    // out of the last node before the budget ran out points at a place
    // the lane does not contain, and an adjacency entry for it would
    // let a plan step off the end of the lane.
    const inReach = new Set(reached);
    return {
      reached,
      edges: edges.filter((e) => inReach.has(e.from) && inReach.has(e.to)),
      expanded: out.expanded,
      exhausted: out.exhausted === 'nodes',
    };
  }

  /**
   * See {@link NavigationApi.costMatrix}.
   *
   * ⭐⭐ **The all-pairs matrix, and nothing more.** This is the input
   * a tour optimiser needs, and shipping the matrix WITHOUT an
   * optimiser is the decision, not an omission: deciding the order of
   * the stops is the activity. The engine computes what the roads
   * cost; the player decides where to go first.
   */
  @CallSecurity(NavigationApiCallers)
  public async costMatrix(
    places: readonly string[],
    profile: TravelProfileSpec,
    knowledge: { extent?: string },
    budget: number,
  ): Promise<{
    pairs: Array<{ from: string; to: string; minutes: number | null; legs: number | null }>;
    expanded: number;
  }> {
    const reg = registry();
    if (!reg) return { pairs: [], expanded: 0 };
    const graph = await reg.graphView(knowledge.extent);
    const pairs: Array<{
      from: string;
      to: string;
      minutes: number | null;
      legs: number | null;
    }> = [];
    let expanded = 0;
    // Sorted, so the matrix is the same on every run.
    const sorted = [...places].sort();
    for (const from of sorted) {
      for (const to of sorted) {
        if (from === to) continue;
        const out = this.planOver(graph, from, to, profile, 'world', budget);
        expanded += out.expanded;
        const best = out.ok ? out.plans[0] : null;
        pairs.push({
          from,
          to,
          minutes: best ? best.cost.minutes : null,
          legs: best ? best.cost.legs : null,
        });
      }
    }
    return { pairs, expanded };
  }

  /* ── the engine ───────────────────────────────────────────────────── */

  /**
   * The legs out of one place that this traveller may take.
   *
   * ⚠ Three refusals, and they are three DIFFERENT kinds of fact:
   * `admits` is physics (a wagon on water), `published` is knowledge
   * (a draft zone the realm does not have yet), and an edge whose far
   * side is not in this graph at all is the limit of what the knower
   * knows. None of them is `blocked` — a blocked way is not in the
   * index at all (W5).
   */
  private legsOf(
    graph: KnowledgeGraph,
    identity: string,
    traveller: TravelProfile,
  ): Array<Leg<string>> {
    const place = graph.at(identity);
    if (!place) return [];
    const out: Array<Leg<string>> = [];
    for (const way of place.edges) {
      if (way.to === null) continue;
      const far = graph.at(way.to);
      if (!far || !far.published) continue;
      if (!traveller.admits(way)) continue;
      out.push({
        node: way.to,
        dir: way.dir,
        minutes: way.minutes ?? null,
        edge: way,
      });
    }
    return out;
  }

  /**
   * Plan from `from` to `to` over one knowledge graph.
   *
   * ⭐⭐ **One cheapest-first walk per AXIS, and the non-dominated
   * plans come back.** Three axes — minutes, legs, and `conditional`
   * (⭐ a RISK axis: the short way over the ford against the long sure
   * one). Where they agree there is one plan; where they disagree the
   * caller gets both and ⛔ the engine does NOT pick, because that
   * choice is the activity.
   *
   * ⚠ This is a SUBSET of the Pareto front, stated plainly rather than
   * dressed up: one optimum per axis, de-duplicated. A full
   * multi-objective search is not bought for a realm with three
   * corridors, and the shape is here if a later one needs it.
   */
  private planOver(
    graph: KnowledgeGraph,
    from: string,
    to: string,
    profile: TravelProfileSpec,
    source: RouteSource,
    budget: number,
    omnivorous = false,
  ): RouteOutcome {
    if (!graph.has(from)) {
      return { ok: false, reason: 'unknown-origin', expanded: 0 };
    }
    if (!graph.has(to)) {
      return { ok: false, reason: 'unknown-destination', expanded: 0 };
    }
    // ⚠ `admits` is re-derived from the SPEC here, so an omnivorous
    // caller must be re-made as one rather than round-tripped through
    // `toSpec()` — a spec has no way to say *everything*.
    const traveller = omnivorous
      ? new OmnivorousTravelProfile()
      : new TravelProfile(profile);

    if (from === to) {
      return {
        ok: true,
        expanded: 0,
        plans: [
          {
            source,
            profile,
            nodes: [from],
            legs: [],
            cost: { minutes: 0, legs: 0, conditional: 0, unmeasured: 0 },
            assumptions: [],
          },
        ],
      };
    }

    const AXES: Array<(way: KnownWay) => number> = [
      // minutes — ⚠ an unmeasured leg costs ZERO on this axis, which is
      // why `cost.unmeasured` is reported beside `cost.minutes`: a
      // route of eleven unmeasured legs is not a route of zero minutes,
      // and the renderer must be able to say so.
      (way) => way.minutes ?? 0,
      // legs — the walker's currency (D4a).
      () => 1,
      // risk — count the ways that close.
      (way) => (way.conditional === true ? 1 : 0),
    ];

    let expanded = 0;
    let exhausted = false;
    const plans: RoutePlan[] = [];
    const seen = new Set<string>();

    for (const cost of AXES) {
      const prev = new Map<string, { from: string; way: KnownWay }>();
      // ⚠⚠ **The predecessor is recorded ON DEQUEUE, carried down the
      // leg — not on first sight.** A queued walk has no tree, so the
      // skeleton cannot hand back a path, and the obvious shortcut
      // (note the predecessor in `neighbours`, where the legs are) is
      // WRONG for a cheapest-first walk: `neighbours(start)` sees
      // every leg out of the start at once, so the destination's
      // predecessor would be whichever edge was authored first rather
      // than the cheapest arrival. The diamond fixture caught it —
      // all three axes answered the same path.
      //
      // So the carry holds *where I came from and by what*, and `fold`
      // — which the skeleton calls exactly once per node, at the
      // moment it is dequeued as cheapest — writes it down.
      const walk = new Traversal<string, void, StepCarry>({
        order: 'cheapest-first',
        keyOf: (id) => id,
        neighbours: (id) => this.legsOf(graph, id, traveller),
        bound: { nodes: budget },
        cost: (leg) => cost(leg.edge as KnownWay),
        descend: (carry, leg) => ({
          at: leg.node,
          from: carry.at,
          way: leg.edge as KnownWay,
        }),
        fold: (id, _d, carry) => {
          if (carry.from !== null && carry.way !== null && id !== from) {
            prev.set(id, { from: carry.from, way: carry.way });
          }
        },
      });
      const out = walk.walk(from, {
        carry: { at: from, from: null, way: null },
      });
      expanded += out.expanded;
      if (out.exhausted === 'nodes') exhausted = true;
      const plan = this.rebuildPlan(from, to, prev, profile, source, graph);
      if (!plan) continue;
      const key = plan.nodes.join('>');
      if (seen.has(key)) continue;
      seen.add(key);
      plans.push(plan);
    }

    if (plans.length > 0) return { ok: true, plans, expanded };
    if (exhausted) return { ok: false, reason: 'budget', expanded };
    return this.modeBreak(graph, from, to, traveller, budget, expanded);
  }

  /**
   * ⭐⭐ **The mode break.** When the mode-admitted search finds no
   * way, run it again admitting every medium. If THAT finds a way, the
   * first leg this traveller does not admit is the answer — *the way
   * stops at the quay; north needs water* — and one of those two
   * sentences tells you to buy a boat. Otherwise there genuinely is no
   * way.
   *
   * ⚠ The second pass spends from the same budget's worth of nodes,
   * and the plan it builds is thrown away: only the refused leg
   * survives. A plan built with the omnivorous profile would send a
   * wagon into a river.
   */
  private modeBreak(
    graph: KnowledgeGraph,
    from: string,
    to: string,
    traveller: TravelProfile,
    budget: number,
    spent: number,
  ): RouteOutcome {
    const any = new OmnivorousTravelProfile();
    const prev = new Map<string, { from: string; way: KnownWay }>();
    const walk = new Traversal<string, void, StepCarry>({
      order: 'breadth-first',
      keyOf: (id) => id,
      neighbours: (id) => this.legsOf(graph, id, any),
      bound: { nodes: budget },
      descend: (carry, leg) => ({
        at: leg.node,
        from: carry.at,
        way: leg.edge as KnownWay,
      }),
      fold: (id, _d, carry) => {
        if (carry.from !== null && carry.way !== null && id !== from) {
          prev.set(id, { from: carry.from, way: carry.way });
        }
      },
    });
    const out = walk.walk(from, { carry: { at: from, from: null, way: null } });
    const expanded = spent + out.expanded;
    if (!prev.has(to)) {
      return out.exhausted === 'nodes'
        ? { ok: false, reason: 'budget', expanded }
        : { ok: false, reason: 'no-way', expanded };
    }
    // Walk the chain back and name the FIRST leg the traveller refuses.
    const chain: Array<{ from: string; way: KnownWay }> = [];
    let cursor = to;
    const guard = new Set<string>();
    while (cursor !== from) {
      const step = prev.get(cursor);
      if (!step || guard.has(cursor)) break;
      guard.add(cursor);
      chain.unshift(step);
      cursor = step.from;
    }
    for (const step of chain) {
      if (traveller.admits(step.way)) continue;
      return {
        ok: false,
        reason: 'no-way',
        expanded,
        breakAt: {
          node: step.from,
          dir: step.way.dir,
          needs: step.way.media ?? ['ground'],
        },
      };
    }
    return { ok: false, reason: 'no-way', expanded };
  }

  /**
   * Walk a predecessor chain back into a plan, deriving the cost on
   * every axis and the assumptions that believing it requires.
   *
   * ⛔⛔ For a MAP source every assumption is built from the planner's
   * OWN evidence — the channel they saw it on and when. Nothing here
   * reads the index, and the unit test asserts it with the registry
   * absent and its prototype spied.
   */
  private rebuildPlan(
    from: string,
    to: string,
    prev: ReadonlyMap<string, { from: string; way: KnownWay }>,
    profile: TravelProfileSpec,
    source: RouteSource,
    graph: KnowledgeGraph,
  ): RoutePlan | null {
    if (!prev.has(to)) return null;
    const legs: RouteLeg[] = [];
    const nodes: string[] = [to];
    let cursor = to;
    const guard = new Set<string>([to]);
    while (cursor !== from) {
      const step = prev.get(cursor);
      if (!step) return null;
      legs.unshift({
        from: step.from,
        to: cursor,
        dir: step.way.dir,
        minutes: step.way.minutes ?? null,
        conditional: step.way.conditional === true,
      });
      nodes.unshift(step.from);
      cursor = step.from;
      if (guard.has(cursor)) return null;
      guard.add(cursor);
    }

    const cost = {
      minutes: legs.reduce((n, l) => n + (l.minutes ?? 0), 0),
      legs: legs.length,
      conditional: legs.filter((l) => l.conditional).length,
      unmeasured: legs.filter((l) => l.minutes === null).length,
    };

    const assumptions: RouteAssumption[] = [];
    legs.forEach((leg, i) => {
      if (leg.conditional) {
        assumptions.push({
          kind: 'conditional',
          leg: i,
          // ⚠ One claim, not two. "is open — it is not always
          // passable" said the same thing twice; what the reader
          // needs is the uncertainty, named once.
          text: `the way ${leg.dir} out of ${leg.from} is not always passable`,
        });
      }
      const way = graph
        .at(leg.from)
        ?.edges.find((e) => e.dir === leg.dir && e.to === leg.to);
      const evidence = way?.evidence;
      if (source === 'map' && evidence) {
        assumptions.push({
          kind: 'stale',
          leg: i,
          text:
            `assumes the way ${leg.dir} out of ${leg.from} is still ` +
            `there — you ${evidence.channel} it`,
          claim: { channel: evidence.channel, lastSeen: evidence.lastSeen },
        });
      }
      // ⚠ Where two claims disagree about one (place, dir), BOTH edges
      // are in the graph and the plan NAMES the disagreement rather
      // than the engine picking a winner.
      const rivals = (graph.at(leg.from)?.edges ?? []).filter(
        (e) => e.dir === leg.dir,
      );
      if (rivals.length > 1) {
        assumptions.push({
          kind: 'disputed',
          leg: i,
          text:
            `you have recorded ${rivals.length} different places ` +
            `${leg.dir} of ${leg.from}; this plan takes one of them`,
        });
      }
    });
    if (cost.unmeasured > 0) {
      assumptions.push({
        kind: 'unmeasured',
        leg: -1,
        text:
          `${cost.unmeasured} of ${cost.legs} legs declare no duration, so ` +
          `any time given is a floor`,
      });
    }

    return { source, profile, nodes, legs, cost, assumptions };
  }

  /* ── a player's map ──────────────────────────────────────────────────
   *
   * ⭐⭐ **This half never touches `location_graph`**, and that is the
   * evidence firewall made structural rather than policed. A map is
   * written from what the player PERCEIVED — the live room they are
   * standing in, whose exits `obviousExitsFor(viewer)` has already
   * filtered through the perception gate — so there is no read here
   * that could hand somebody the shape of a place they have not
   * earned.
   *
   * ⚠ And the live room is the right source for a second reason: it
   * carries the ELASTIC nodes the graph deliberately does not store
   * (a holding's rooms, a corridor minted on approach). A map built
   * from the graph could not record a dorm room at all.
   */

  /** See {@link NavigationApi.recordPlace}. */
  @CallSecurity(NavigationApiCallers)
  public async recordPlace(
    viewerKey: string,
    locality: string,
    claims: readonly MapClaim[],
  ): Promise<void> {
    if (!viewerKey || !locality || claims.length === 0) return;
    const existing = await this.loadMap(viewerKey, locality);
    const grown = NavigationLogic.growMap(existing, claims);
    if (!grown) return; // nothing new and nothing to bump
    await DocumentApi.saveMap(viewerKey, locality, {
      locality,
      claims: grown,
    } as unknown as Record<string, unknown>);
  }

  /** See {@link NavigationApi.readMap}. */
  @CallSecurity(NavigationApiCallers)
  public async readMap(
    viewerKey: string,
    localityPrefix: string,
  ): Promise<MapDocument[]> {
    const rows = await DocumentApi.readMaps(viewerKey, localityPrefix);
    return rows.map((r) => {
      const data = r.data as unknown as MapDocument;
      return {
        locality: typeof data?.locality === 'string' ? data.locality : '',
        claims: Array.isArray(data?.claims) ? data.claims : [],
      };
    });
  }

  /** See {@link NavigationApi.mapNow}. */
  @CallSecurity(NavigationApiCallers)
  public mapNow(): number {
    try {
      return Math.floor(WorldClockApi.getNow().value);
    } catch {
      // No clock in a bare test harness; a claim with a 0 timestamp is
      // still a claim, and the alternative is refusing to record one.
      return 0;
    }
  }

  /** This player's map of one locality, or an empty one. */
  private async loadMap(
    viewerKey: string,
    locality: string,
  ): Promise<MapClaim[]> {
    const rows = await DocumentApi.readMaps(viewerKey, locality);
    const exact = rows.find((r) => r.path.endsWith(`/map/${locality}`));
    const data = exact?.data as unknown as MapDocument | undefined;
    return Array.isArray(data?.claims) ? [...data.claims] : [];
  }

  /**
   * ⭐⭐ **The growth rule, and it is the whole knowledge model.**
   *
   * A new observation identical in `(kind, place, dir, toLabel,
   * channel)` to the **latest** claim for that key bumps its
   * `lastSeen`. A differing one is **appended**. ⚠ **Nothing is ever removed, and nothing is
   * ever corrected.**
   *
   * That is what makes a map able to be WRONG. Wall up an exit somebody
   * has walked and their map still shows it; when they next look, the
   * new observation lands beside the old one and both render — *you
   * recorded an exit east on <date>; on <later> you saw none*. A merge
   * would pick a winner and hide that it did, which turns a knowledge
   * model back into a truth model.
   *
   * ⭐ `channel` is part of the key on purpose: *you saw an exit east*
   * and *somebody told you there is one* are two different claims about
   * the world, and collapsing them would lose exactly the provenance
   * the channel exists to carry.
   *
   * Returns `null` when nothing changed at all, so a repeated `look`
   * writes no document — `look` is cheap and frequent, and the dedupe
   * is what bounds a map's growth to the number of DISTINCT
   * observations.
   */
  private static growMap(
    existing: MapClaim[],
    incoming: readonly MapClaim[],
  ): MapClaim[] | null {
    // ⭐⭐ The far side is keyed by `toLabel` and NOT by `to`.
    //
    // `toLabel` is the destination's template path: always present,
    // authored, and the same string whether or not the far room is in
    // memory. `to` is its durable HANDLE *if it happened to be
    // resident when the observation was taken* — which is a fact about
    // residency, not a claim about the world.
    //
    // ⚠⚠ With `to` in the key, the same edge observed twice produced
    // TWO claims whenever the far room's residency flipped between
    // them: perceive the gate cold (`to: null`), then walk north
    // (`to: <handle>`), and the map rendered
    // `north → crossing` **twice**, both "recorded just now". Found by
    // a browser drive, which is the only instrument that walks a cold
    // world. It is unbounded, too — residency evicts the cold tail, so
    // a corridor walked across a long session appends a claim per flip.
    //
    // ⭐ Dropping `to` keeps the case that put `toLabel` here in the
    // first place: east→yard and east→cellar still differ by label, so
    // a far side that genuinely CHANGED still appends and still
    // renders its disagreement. What stops appending is the same claim
    // told twice.
    //
    // ⚠ Residual, accepted: two instances of ONE row as the far side
    // share a label and now bump rather than append. That is the
    // honest reading — *north leads to a dorm room* did not change —
    // and `to` could not have distinguished them reliably anyway,
    // since whether it is populated at all depends on residency.
    // ⭐ `where` and `toldBy` are in the key too: two charts drawing one
    // band in two places are two claims (a wrong chart APPENDS beside a
    // right one, it never overwrites it), and two pilots telling the same
    // thing are two sources.
    const keyOf = (c: MapClaim): string =>
      [c.kind, c.place, c.dir ?? '', c.toLabel ?? '', c.channel, c.where ?? '', c.toldBy ?? ''].join('|');
    // The LATEST claim per key — a later differing observation appends,
    // so a key can hold several and only the newest is bumpable.
    const latest = new Map<string, MapClaim>();
    for (const claim of existing) {
      const key = keyOf(claim);
      const held = latest.get(key);
      if (!held || claim.lastSeen >= held.lastSeen) latest.set(key, claim);
    }
    let changed = false;
    const out = [...existing];
    for (const claim of incoming) {
      const held = latest.get(keyOf(claim));
      if (held) {
        if (claim.lastSeen > held.lastSeen) {
          held.lastSeen = claim.lastSeen;
          changed = true;
        }
        continue;
      }
      out.push({ ...claim });
      latest.set(keyOf(claim), claim);
      changed = true;
    }
    return changed ? out : null;
  }
}

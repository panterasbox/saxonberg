/**
 * LaneCatalogue — the realm's ways, **compiled once and read as a
 * lookup**.
 *
 * A singleton `Idea` over the authored `Lane` and `Route` rows, on the
 * `WatercourseCatalogue` shape and for its reasons. It parses the rows,
 * induces each lane's edge set from the exits that admit its mode, and
 * answers the two questions anything downstream has: *what nodes are on
 * this lane* and *how do I get from here to there on it*.
 *
 * ## Lazy, not warmed
 *
 * ⚠ Every public read is **async and self-loading**. This codebase has
 * been bitten three times by a reference roster that nothing warms
 * reading empty forever while hand-constructed tests stayed green, so
 * there is deliberately no "warmed vs cold" state to get wrong: the
 * first caller loads, everyone after that hits the cache, and HMR drops
 * it. A `boot:` entry in the pack manifest would be an optimisation,
 * never a correctness requirement.
 *
 * ## The induced walk needs a seed, and that is honest
 *
 * Rooms load lazily, so *"every reachable room's exits"* has to start
 * somewhere. A lane declares one or more `seeds` — a room it certainly
 * runs through — and the compile walks outward from them through every
 * exit that admits the lane's mode. That is one authored path per lane
 * and no map: **you still do not draw a road.** Set one bit on the
 * pass's exit and the wagon's reachable world shrinks by itself.
 *
 * ## ⚠ Why the verbs live here and not on an Api
 *
 * A capability pack ships no Api and no logic singleton. `planRoute`
 * and `nodesOn` are verbs on the object that owns the compiled graph,
 * which is where the standing rule puts them anyway — an Api
 * orchestrates; a read belonging to one object lives on that object.
 *
 * See [docs/subsystems/logistics.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import { LANE_PATH_PREFIX, type LaneDescriptor, type LaneEdge } from './Lane';
import { SERVICE_ROUTE_PATH_PREFIX } from './ServiceRoute';
import { Route } from '../lib/journey/Route';

/** The catalogue singleton's own template path. */
export const LANE_CATALOGUE_PATH = '/system/transport/idea/LaneCatalogue';


/** ⚠ A walk bound, so a mis-authored graph cannot hang a boot. */
const MAX_LANE_NODES = 2_000;

/**
 * The code-side floor under `transport.defaultEdgeMinutes` — used only
 * when the setting is absent or unreadable (a platform-only boot, a test
 * with no seeded settings). The AUTHORED value is the dial.
 */
const DEFAULT_EDGE_MINUTES = 5;

/** One lane after the compile. */
export interface CompiledLane {
  key: string;
  name: string;
  mode: string;
  operator: string | null;
  /** Every node on the lane, in discovery order. */
  nodes: string[];
  /** `from` → the nodes reachable from it in one leg, on this lane. */
  adjacency: Map<string, string[]>;
  /** Where a traveller may board or alight; empty ⇒ every node. */
  stops: string[];
  /** True for a lane whose edges were authored rather than induced. */
  authored: boolean;
}

/** One authored route row, before it becomes a {@link Route}. */
interface RouteDescriptor {
  key: string;
  laneKey: string;
  nodes: string[];
  stops: string[];
}

interface CompiledIndex {
  lanes: Map<string, CompiledLane>;
  routes: Map<string, RouteDescriptor>;
  /**
   * ⭐ `place → the lanes running through it`, filled in the compile.
   * *What ways touch here* is the read a depot makes, and it used to be
   * a filter over every lane in the realm, recomputed per depot per
   * question.
   */
  byNode: Map<string, CompiledLane[]>;
  problems: string[];
}

export default class LaneCatalogue extends Idea {
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<CompiledIndex> | null = null;

  /**
   * Residency veto — a load-bearing process-lifetime singleton is never
   * culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Singleton refusal — the `WatercourseCatalogue` shape. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'LaneCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }

  /** Drop the compiled graph; the next read rebuilds. Fired by HMR. */
  public invalidateCache(): void {
    this.loading = null;
  }

  /* ─────────────────────────── reads ─────────────────────────── */

  /**
   * Every compiled lane in the realm — **private**. The realm's ways
   * grow with what gets authored, and a caller narrowing the whole list
   * at the call site is what makes that everybody's cost. `lanesAt` is
   * the read consumers actually want.
   */
  private async allLanes(): Promise<CompiledLane[]> {
    return [...(await this.index()).lanes.values()];
  }

  /** One lane by its durable key, or `null`. */
  public async laneOf(key: string): Promise<CompiledLane | null> {
    return (await this.index()).lanes.get(key) ?? null;
  }

  /** Every node on a lane, or `[]` when it names none. */
  public async nodesOn(laneKey: string): Promise<string[]> {
    return (await this.laneOf(laneKey))?.nodes ?? [];
  }

  /** Whatever the compile could not make sense of — the author's report. */
  public async problems(): Promise<string[]> {
    return [...(await this.index()).problems];
  }

  /**
   * The lanes a place is on. ⭐ The read a depot makes: *what ways
   * touch here* is how a lane meets the local economy.
   */
  public async lanesAt(path: string): Promise<CompiledLane[]> {
    return [...((await this.index()).byNode.get(path) ?? [])];
  }

  /**
   * An **authored** route by its key — a scheduled service's fixed run.
   * `null` when no row names it, or when its lane does not exist.
   */
  public async routeByKey(key: string): Promise<Route | null> {
    const index = await this.index();
    const d = index.routes.get(key);
    if (!d) return null;
    return Route.authored(d.laneKey, d.nodes, d.stops);
  }

  /**
   * ⛔ `planRoute` is RETIRED (routing W7). It was a plain
   * breadth-first walk over one compiled lane's edge set — shortest in
   * LEGS, blind to `edgeMinutes` (which sat immediately below it with
   * a doc comment explaining why cost belongs to the exit, and which
   * the search never called), and unable to plan across lanes at all.
   *
   * Routing is `NavigationApi.routeBetween` / `routeOnMap` now: one
   * search, over the world index or over a person's own map, costing
   * on every axis and stating what believing the plan assumes. There
   * is deliberately **no deprecated forward** here — a second way to
   * plan a route is the thing this build existed to remove, and
   * leaving a shim would have left two.
   */

  /**
   * ⭐ The lanes that cover a plan's legs, sorted by key — the LABEL a
   * journey wears now that it is not a search scope.
   *
   * A lane of mode M is M's induced subgraph from its seeds, so
   * *"across more than one lane of the same mode"* is structurally
   * *"over M's whole graph rather than one compiled lane's node
   * list"*. The lane stops being where the search happens and becomes
   * what the way is CALLED: *along the spine, then the city streets*.
   *
   * ⚠ Sorted by key, so the same trip reads the same way on every run.
   * A label that varied with compile order would be a different answer
   * to the same question.
   */
  public async laneNamesFor(nodes: readonly string[]): Promise<string[]> {
    const index = await this.index();
    const keys = await this.laneLabelFor(nodes);
    return keys.map((k) => index.lanes.get(k)?.name ?? k);
  }

  public async laneLabelFor(nodes: readonly string[]): Promise<string[]> {
    const index = await this.index();
    const covering: string[] = [];
    for (const [key, lane] of [...index.lanes.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (nodes.some((n) => lane.adjacency.has(n))) covering.push(key);
    }
    return covering;
  }

  /**
   * Game minutes for one baseline (unloaded, walk-mode) traverse of the
   * edge between two adjacent nodes: the exit's own `edgeMinutes`, else
   * the `transport.defaultEdgeMinutes` corridor default.
   *
   * ⭐ Read from the EXIT rather than from the lane, because two lanes
   * share edges — the towpath is walked and barged — and the number
   * belongs to the ground.
   */
  public async edgeMinutesBetween(
    fromPath: string,
    toPath: string,
  ): Promise<number> {
    const exit = await LaneCatalogue.exitBetween(fromPath, toPath);
    const authored = exit?.getEdgeMinutes() ?? null;
    if (authored !== null) return authored;
    return dial(
      AppSettingKeys.transportDefaultEdgeMinutes,
      DEFAULT_EDGE_MINUTES,
    );
  }

  /**
   * The exit out of `fromPath` that lands in `toPath`, or `null`.
   *
   * ⚠ Resolved LIVE at every call rather than compiled into the index:
   * the Journey re-validates before each leg (D4's transaction boundary
   * per leg), and a cached exit would let a journey walk through a door
   * that has since been blocked.
   * @internal one caller outside this file, plus this module — not author surface.
   *
   */
  static async exitBetween(
    fromPath: string,
    toPath: string,
  ): Promise<Exit | null> {
    const room = await StuffApi.singleton<Stuff & Container>(fromPath).catch(
      () => null,
    );
    if (!room || !MixinApi.isExitable(room)) return null;
    for (const exit of room.getExits().values()) {
      if (exit.getDestinationTemplatePath() === toPath) return exit;
    }
    return null;
  }

  /* ─────────────────────────── the load ─────────────────────────── */

  private index(): Promise<CompiledIndex> {
    const inFlight = this.loading;
    if (inFlight) return inFlight;
    const started = loadIndex();
    this.loading = started;
    // A failed load must not stick: drop the promise so the next caller
    // retries rather than inheriting the failure forever.
    started.catch(() => {
      if (this.loading === started) this.loading = null;
    });
    return started;
  }
}

/* ─────────────────────────── the compile ─────────────────────────── */

/**
 * A numeric AppSetting, or the code-side floor.
 *
 * ⚠ The read is guarded because `AppApi.setting` THROWS on an unwarmed
 * cache, and a road that cannot be travelled because the settings
 * document has not loaded yet would be a boot-order bug that surfaces as
 * a mysteriously dead journey. The floor equals the shipped value, so a
 * *wrong* authored value still reads through — this cannot mask a
 * misconfiguration, only an absent one.
 */
function dial(key: string, floor: number): number {
  let raw: string;
  try {
    raw = AppApi.setting(key);
  } catch {
    return floor;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : floor;
}

function stringList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
}

function edgeList(raw: unknown): LaneEdge[] {
  if (!Array.isArray(raw)) return [];
  const out: LaneEdge[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    if (typeof r.from !== 'string' || typeof r.to !== 'string') continue;
    out.push({
      from: r.from,
      to: r.to,
      bidirectional: r.bidirectional !== false,
    });
  }
  return out;
}

/** A lane row's `data`, or `null` when it is not a lane at all. */
function descriptorOf(
  data: Record<string, unknown>,
): LaneDescriptor | null {
  if (typeof data.key !== 'string' || data.key.length === 0) return null;
  return {
    key: data.key,
    name: typeof data.name === 'string' ? data.name : data.key,
    mode: typeof data.mode === 'string' ? data.mode : '',
    edges: edgeList(data.edges),
    stops: stringList(data.stops),
    seeds: stringList(data.seeds),
    operator: typeof data.operator === 'string' && data.operator.length > 0
      ? data.operator
      : null,
  };
}

function routeDescriptorOf(
  data: Record<string, unknown>,
): RouteDescriptor | null {
  if (typeof data.key !== 'string' || data.key.length === 0) return null;
  if (typeof data.laneKey !== 'string' || data.laneKey.length === 0) return null;
  const nodes = stringList(data.nodes);
  if (nodes.length === 0) return null;
  return {
    key: data.key,
    laneKey: data.laneKey,
    nodes,
    // An authored route with no stop list stops everywhere it passes.
    stops: stringList(data.stops).length > 0 ? stringList(data.stops) : nodes,
  };
}

/** Read every authored row and compile the realm's ways. */
async function loadIndex(): Promise<CompiledIndex> {
  const problems: string[] = [];
  const lanes = new Map<string, CompiledLane>();
  const routes = new Map<string, RouteDescriptor>();

  for (const tpl of await Template.findDescendants(LANE_PATH_PREFIX)) {
    const d = descriptorOf((tpl.data ?? {}) as Record<string, unknown>);
    if (d === null) continue;
    if (lanes.has(d.key)) {
      problems.push(
        `two lanes claim the key '${d.key}' — a key is an identity, and ` +
          `every route citing it would be ambiguous`,
      );
      continue;
    }
    lanes.set(d.key, await compileLane(d, problems));
  }

  for (const tpl of await Template.findDescendants(SERVICE_ROUTE_PATH_PREFIX)) {
    const d = routeDescriptorOf((tpl.data ?? {}) as Record<string, unknown>);
    if (d === null) continue;
    if (!lanes.has(d.laneKey)) {
      problems.push(
        `route '${d.key}' names lane '${d.laneKey}', which does not exist`,
      );
      continue;
    }
    routes.set(d.key, d);
  }

  // The node index, built once with the lanes rather than derived per
  // question. A lane's `nodes` list is already deduplicated by the
  // compile, so one pass is enough.
  const byNode = new Map<string, CompiledLane[]>();
  for (const lane of lanes.values()) {
    for (const node of lane.nodes) {
      const list = byNode.get(node);
      if (list) list.push(lane);
      else byNode.set(node, [lane]);
    }
  }

  return { lanes, routes, byNode, problems };
}

/** Compile one lane — authored edges, or the induced walk. */
async function compileLane(
  d: LaneDescriptor,
  problems: string[],
): Promise<CompiledLane> {
  const adjacency = new Map<string, string[]>();
  const link = (from: string, to: string): void => {
    const list = adjacency.get(from);
    if (list) {
      if (!list.includes(to)) list.push(to);
    } else {
      adjacency.set(from, [to]);
    }
    if (!adjacency.has(to)) adjacency.set(to, []);
  };

  if (d.edges.length > 0) {
    // ⭐ The rail / TPA case: no exits to induce from, so the edges ARE
    // the authoring. This is what makes "rail is a data addition" true.
    for (const e of d.edges) {
      link(e.from, e.to);
      if (e.bidirectional !== false) link(e.to, e.from);
    }
  } else if (d.seeds.length === 0) {
    problems.push(
      `lane '${d.key}' induces its edges but names no seed — the walk ` +
        `has nowhere to start, so the lane would compile empty`,
    );
  } else {
    await induce(
      d,
      link,
      (path) => {
        if (!adjacency.has(path)) adjacency.set(path, []);
      },
      problems,
    );
  }

  return {
    key: d.key,
    name: d.name,
    mode: d.mode,
    operator: d.operator,
    nodes: [...adjacency.keys()],
    adjacency,
    stops: [...d.stops],
    authored: d.edges.length > 0,
  };
}

/**
 * The induced lane: every place this lane's mode reaches from its
 * seeds, read off the WORLD INDEX.
 *
 * ⭐⭐ **This used to walk live exits, one `StuffApi.singleton` at a
 * time, and the reason it had to is gone.** The projection could cost
 * a wagon's route but not say whether a wagon may TAKE it — it carried
 * `edgeMinutes` and not `media` — so the only way to know which ways
 * a wheeled lane admits was to stand each room up and ask its exits.
 * W5 put `media`, `wheelPassable` and `conditional` on the stored
 * edge, so the admission rule is now answerable from the index, and
 * this is one `reachFrom` call.
 *
 * ⚠ A `wheeled` lane asks `wheelPassable` as well as the medium. The
 * medium gate already refuses a cart on a ladder or a ford; the bit
 * covers the residue the medium cannot express — a stair, a stile, a
 * turnstile, all of which admit walking and must refuse wheels. **The
 * pass is one of these**, which is why bulk breaks at the crossroads.
 * That rule is `TravelProfile.admits` now, in one place, rather than
 * three lines here.
 *
 * ⚠⚠ **The stated behaviour swap: a FLOODED FORD is now in the lane.**
 * This walk used to call `refreshCrossing()` by shape and skip a
 * crossing the river had closed, so a lane recompiled in spring simply
 * did not contain the ford. The index is a projection of authored
 * rows and cannot know the water level, so the ford is in the lane,
 * every plan over it carries *this way is not always passable* as a
 * stated assumption, and the closure is discovered **at the leg** by
 * `FordExit.applyTraversal` — which is where a river belongs. A
 * Journey halts at the previous place and says so. The requirements
 * put the verdict at the traverse deliberately: a cached compile is a
 * worse place to learn about a river than the bank of it.
 */
async function induce(
  d: LaneDescriptor,
  link: (from: string, to: string) => void,
  note: (path: string) => void,
  problems: string[],
): Promise<void> {
  // ⚠⚠ Load the MODE before the walk — not for `allowsMode` any more,
  // but because the traveller profile needs the mode's MEDIUM and
  // `LocomotionApi.modeOf` answers only for a singleton that is
  // already live. Compiled at boot before anyone had walked, every
  // lane used to come out as its seed alone with "names mode 'walk',
  // which no LocomotionMode row declares", and the index cached that
  // forever: no hand ever walked to the cash-and-carry, and `journey`
  // said "no road runs from here" at the seed itself. Found by the
  // economic bootstrap's drive, and the refusal below is its memorial.
  const mode = await LocomotionApi.loadMode(d.mode).catch(() => null);
  if (mode === null) {
    problems.push(
      `lane '${d.key}' names mode '${d.mode}', which no LocomotionMode ` +
        `row declares — no exit can admit it, so the lane is empty`,
    );
    return;
  }

  const reach = await NavigationApi.reachFrom(
    d.seeds,
    {
      mode: d.mode,
      medium: mode.getMedium(),
      wheeled: d.mode === 'wheeled',
    },
    {},
    MAX_LANE_NODES,
  );

  if (reach.exhausted) {
    problems.push(
      `lane '${d.key}' walked past ${MAX_LANE_NODES} nodes and was cut ` +
        `short — a lane that large is almost certainly a mis-authored seed`,
    );
  }

  // ⚠ A node is ON the lane even when nothing leads onward from it: a
  // wharf whose river is frozen is still a wharf on the river, and a
  // lane that forgot its own seed could not be planned FROM.
  for (const path of reach.reached) note(path);
  for (const edge of reach.edges) link(edge.from, edge.to);

  // ⚠ A seed the index does not know is an authoring error and must be
  // said out loud. The old walk reported it per path as it failed to
  // resolve a room; the index knows it up front.
  for (const seed of d.seeds) {
    if (!reach.reached.includes(seed)) {
      problems.push(
        `lane '${d.key}' names seed '${seed}', which the location graph ` +
          `does not know — either the row is not a place (one row, one ` +
          `place: it must compose SingletonMixin) or the path is wrong`,
      );
    }
  }
}

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

  /** Every compiled lane in the realm. */
  public async allLanes(): Promise<CompiledLane[]> {
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
    return (await this.allLanes()).filter((l) => l.nodes.includes(path));
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
   * A route worked out **for this request** — a haulage gig's, a
   * hail's, a hauler's own errand. Breadth-first over the compiled edge
   * set, so it is the shortest path in LEGS, which is the thing a
   * traveller experiences.
   *
   * ⚠⚠ Returns the same shape `routeByKey` does, and nothing downstream
   * may tell them apart (AC15n). Mints nothing.
   */
  public async planRoute(
    fromPath: string,
    toPath: string,
    laneKey: string,
  ): Promise<Route | null> {
    const lane = await this.laneOf(laneKey);
    if (!lane) return null;
    if (fromPath === toPath) return Route.computed(laneKey, [fromPath], [fromPath]);
    if (!lane.adjacency.has(fromPath)) return null;

    const prev = new Map<string, string>();
    const seen = new Set<string>([fromPath]);
    const queue: string[] = [fromPath];
    let found = false;
    while (queue.length > 0 && !found) {
      const here = queue.shift()!;
      for (const next of lane.adjacency.get(here) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        prev.set(next, here);
        if (next === toPath) {
          found = true;
          break;
        }
        queue.push(next);
      }
    }
    if (!found) return null;

    const nodes: string[] = [toPath];
    let cursor = toPath;
    while (cursor !== fromPath) {
      cursor = prev.get(cursor)!;
      nodes.unshift(cursor);
    }
    // The lane's own stop set, narrowed to the nodes this trip passes.
    const stops = nodes.filter((n) => lane.stops.length === 0 || lane.stops.includes(n));
    return Route.computed(laneKey, nodes, stops);
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
   */
  public static async exitBetween(
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

  return { lanes, routes, problems };
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
 * The induced walk: outward from each seed, through every exit that
 * admits this lane's mode.
 *
 * ⚠ A `wheeled` lane asks `isWheelPassable()` as well as the medium.
 * The medium gate already refuses a cart on a ladder or a ford; the bit
 * covers the residue the medium cannot express — a stair, a stile, a
 * turnstile, all of which admit walking and must refuse wheels. **The
 * pass is one of these**, which is why bulk breaks at the crossroads.
 */
async function induce(
  d: LaneDescriptor,
  link: (from: string, to: string) => void,
  note: (path: string) => void,
  problems: string[],
): Promise<void> {
  const wheeled = d.mode === 'wheeled';
  const seen = new Set<string>();
  const queue = [...d.seeds];
  while (queue.length > 0) {
    if (seen.size > MAX_LANE_NODES) {
      problems.push(
        `lane '${d.key}' walked past ${MAX_LANE_NODES} nodes and was cut ` +
          `short — a lane that large is almost certainly a mis-authored seed`,
      );
      return;
    }
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    // ⚠ A node is ON the lane even when nothing leads onward from it: a
    // wharf whose river is frozen is still a wharf on the river, and a
    // lane that forgot its own seed could not be planned FROM.
    note(path);

    const room = await StuffApi.singleton<Stuff & Container>(path).catch(
      () => null,
    );
    if (!room) {
      problems.push(`lane '${d.key}' names '${path}', which resolves to nothing`);
      continue;
    }
    if (!MixinApi.isExitable(room)) continue;

    for (const exit of room.getExits().values()) {
      // ⭐ Some crossings answer differently at different times of year —
      // a ford is up in the spring flood. Asked BY SHAPE, so a seasonal
      // exit participates without this walk knowing what kind it is, and
      // an ordinary exit costs one `typeof`.
      const seasonal = exit as unknown as {
        refreshCrossing?: () => Promise<void>;
      };
      if (typeof seasonal.refreshCrossing === 'function') {
        await seasonal.refreshCrossing();
      }
      if (exit.isBlocked()) continue;
      if (!exit.allowsMode(d.mode)) continue;
      if (wheeled && !exit.isWheelPassable()) continue;
      const to = exit.getDestinationTemplatePath();
      if (!to) continue;
      link(path, to);
      if (!seen.has(to)) queue.push(to);
    }
  }
  if (LocomotionApi.modeOf(d.mode) === null) {
    problems.push(
      `lane '${d.key}' names mode '${d.mode}', which no LocomotionMode ` +
        `row declares — no exit can admit it, so the lane is empty`,
    );
  }
}

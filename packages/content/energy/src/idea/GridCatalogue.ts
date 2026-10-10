/**
 * GridCatalogue — ⭐⭐ **the feeders compiled to a reachability set, and the
 * one piece of state the grid holds: the cuts.**
 *
 * The electric twin of `WatercourseCatalogue`. It loads every `Feeder` row
 * once, compiles the directed line graph (source → nodes → spurs), and answers
 * the two questions the grid is asked on hot paths in integer time: *is this
 * node energized right now?* and *what does a cut here darken?*. A cut at a node
 * darkens it and its whole compiled downstream set; everything else — energized,
 * supply state, the trace — derives on read.
 *
 * ## The one law
 *
 * A node is energized iff **its source is generating** and **no cut lies on the
 * path from that source to it**. Cuts propagate downstream; the source's
 * `isGenerating()` is a live flag read. That is the whole model.
 *
 * ## A line may not leave the road
 *
 * Each consecutive node pair is verified against the exit graph at compile: if
 * no exit joins their streets, the edge is dropped (the downstream subtree goes
 * unreachable) and the pair is recorded as a compile problem — never a throw, so
 * one bad feeder degrades to a dark stretch rather than a dead boot.
 *
 * ## ⚠ The cuts are IN-MEMORY (transient), by build decision
 *
 * A reboot re-energizes the whole grid — which is honest: a server restart is a
 * grid operator re-energizing after a blackout. Durable cuts matter only to the
 * lineman work-order economy, which is Tier-deferred (`power-utility-slate`). So
 * `cuts` lives for the process lifetime; `sever`/`splice` mutate it; HMR keeps
 * it (only the compiled graph is dropped). Persisting it is a clean refinement
 * when the outage market lands.
 *
 * See [docs/subsystems/energy.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Piecewise, type Stretch } from '@saxonberg/server/mud/lib/Trajectory';
import { Traversal } from '@saxonberg/server/mud/lib/location/Traversal';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type {
  StreetLightingSupply,
  SupplyReport,
  SupplyReporting,
  SupplyState,
} from '@saxonberg/server/mud/lib/supply/SupplyState';
import { FEEDER_PATH_PREFIX, type FeederDescriptor, type FeederNode } from './Feeder';

/** The catalogue singleton's own template path — its row ships with the pack. */
export const GRID_CATALOGUE_PATH = '/system/energy/idea/GridCatalogue';

/** How many resolved outages to keep per catalogue (a bounded ring). */
const OUTAGE_HISTORY_CAP = 64;

/** Game-seconds now, or 0 before the clock is up. */
function gridNowSeconds(): number {
  try {
    return WorldClockApi.getNow().rawValue();
  } catch {
    return 0;
  }
}

/** A node ref — `<feederKey>:<nodeName>`. */
export type NodeRef = string;

/** A source generator, duck-typed (a `ControlStructure`). */
interface Generator {
  isGenerating(): boolean;
}

interface CompiledNode {
  ref: NodeRef;
  feederKey: string;
  feederName: string;
  nodeName: string;
  streetPath: string;
  buried: boolean;
  /** The trunk generator's path this node draws from, or `null` if unreachable. */
  rootSource: string | null;
  index: number;
}

interface CompiledGrid {
  nodes: Map<NodeRef, CompiledNode>;
  /** For each node, every node downstream of it (the cut's blast radius). */
  downstream: Map<NodeRef, Set<NodeRef>>;
  /** For each node, the ancestor chain to the source, source-first (the trace). */
  traceUp: Map<NodeRef, NodeRef[]>;
  /** Which node stands on a street (last-declared wins). */
  nodeAt: Map<string, NodeRef>;
  /** Resolved source instances, per rootSource path (`null` = unresolved). */
  sources: Map<string, Generator | null>;
  /** Compile problems — recorded, never thrown. */
  problems: string[];
  /** A street room was unresolvable during the compile (the boot-settle race). */
  premature: boolean;
}

export default class GridCatalogue
  extends Idea
  implements StreetLightingSupply, SupplyReporting
{
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<CompiledGrid> | null = null;

  /** ⚠ In-memory, transient — see the class docstring. Node refs cut open. */
  private cuts = new Set<NodeRef>();
  /** Game-second each CURRENT cut began — for `poweredTrajectory`. */
  private cutSince = new Map<NodeRef, number>();
  /** Resolved (spliced) outages: a node was cut over `[fromS, toS]`. Bounded. */
  private outages: Array<{ node: NodeRef; fromS: number; toS: number }> = [];

  /** A system singleton is never culled by the self-eviction sweep. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Singleton refusal — the `WatercourseCatalogue` shape. */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'GridCatalogue is a system singleton and cannot be destructed; use ' +
        'forceDestruct (admin-gated) if you really mean it',
    };
  }

  /** Drop the compiled grid; the next read rebuilds. Fired by HMR. Cuts survive. */
  public invalidateCache(): void {
    this.loading = null;
    LOADED.delete(this);
  }

  private index(): Promise<CompiledGrid> {
    const inFlight = this.loading;
    if (inFlight !== null) return inFlight;
    const started = loadGrid().then((grid) => {
      LOADED.set(this, grid);
      return grid;
    });
    this.loading = started;
    void started.catch(() => {
      if (this.loading === started) this.loading = null;
    });
    return started;
  }

  /** Real-ms before which a reachability recompile is throttled. */
  private recompileThrottledUntil = 0;
  /** How many reachability recompiles have been spent (a safety bound). */
  private recompiles = 0;

  /** The compiled grid if it is already loaded, else `null` (kicks a load). */
  private loadedGrid(): CompiledGrid | null {
    if (this.loading === null) {
      void this.index(); // kick it; this read answers false until it lands
      return null;
    }
    const grid = LOADED.get(this) ?? null;
    if (grid !== null) this.maybeRecompileUnreachable(grid);
    return grid;
  }

  /**
   * ⭐ **Recover from a premature boot-settle compile.** The grid compiles
   * lazily on first read — but the street-lighting settle fires that first
   * read DURING boot, before the street rooms are instantiable, so
   * `exitJoins` (which needs `StuffApi.singleton(street)`) finds nothing and
   * drops every node below the first unreachable edge. That broken grid then
   * caches for the process, and everything metered below it reads dark
   * forever (the blood fridge, the walk-in cold room). This is the exact
   * "boot settle races the install" wall the energy drive documented for
   * streetlights, surfaced here by the first appliance on the main feeder.
   *
   * The fix: if the cached grid still has a reachability problem, recompile
   * — throttled (so the boot-settle reads do not thrash) and bounded (so a
   * genuinely mis-authored feeder gives up rather than looping). The first
   * read after boot, with the rooms now present, rebuilds it clean and the
   * problems clear, which stops the retries.
   */
  private maybeRecompileUnreachable(grid: CompiledGrid): void {
    // Only a PREMATURE compile (a street room was unresolvable — the boot
    // race) is worth retrying. A grid whose streets resolved but genuinely
    // do not join is correctly unreachable, and retrying it would loop.
    if (!grid.premature) return;
    const now = Date.now();
    if (now < this.recompileThrottledUntil || this.recompiles >= 20) return;
    this.recompileThrottledUntil = now + 2_000;
    this.recompiles += 1;
    // ⚠ Recompile IN PLACE — swap the cache only when a clean grid lands,
    // and keep serving the current (premature/dark) one meanwhile. Clearing
    // the cache first (as `invalidateCache` would) leaves a window where a
    // SYNC read — the appliance's own `energizedAtSync` — finds no grid and
    // reads dark, so the fridge would flicker back to "silent" right after
    // the feeder read live. This way, once a clean grid caches, sync reads
    // are stably live and this never fires again (a clean grid is not
    // premature).
    const started = loadGrid().then((next) => {
      if (!next.premature) LOADED.set(this, next);
      return next;
    });
    this.loading = started;
    void started.catch(() => {
      if (this.loading === started) this.loading = null;
    });
  }

  // ---------- reads ----------

  /**
   * ⭐ Is `nodeRef` energized RIGHT NOW? Sync — the vision walk and
   * `isServingNow` ask. Answers `false` before the grid has compiled (and
   * kicks the compile); a node whose source is down, or that no line reaches,
   * or that sits at or below a cut, is dark.
   */
  public energizedAtSync(nodeRef: NodeRef): boolean {
    const grid = this.loadedGrid();
    if (grid === null) return false;
    const node = grid.nodes.get(nodeRef);
    if (!node || node.rootSource === null) return false;
    const source = grid.sources.get(node.rootSource);
    if (!source || !source.isGenerating()) return false;
    for (const cut of this.cuts) {
      if (cut === nodeRef) return false;
      if (grid.downstream.get(cut)?.has(nodeRef) === true) return false;
    }
    return true;
  }

  /** Is the street at `streetPath` served by a live feeder node? Sync. */
  public isStreetEnergizedSync(streetPath: string): boolean {
    const grid = this.loadedGrid();
    const ref = grid?.nodeAt.get(streetPath);
    return ref !== undefined && this.energizedAtSync(ref);
  }

  /** Force the compile (so later sync reads answer live). Idempotent. */
  public async ensureCompiled(): Promise<void> {
    await this.index();
  }

  /** Async: energization of the node standing on `streetPath` (compiles first). */
  public async energizedAt(streetPath: string): Promise<boolean> {
    const grid = await this.index();
    const ref = grid.nodeAt.get(streetPath);
    return ref !== undefined && this.energizedAtSync(ref);
  }

  /** The node standing on `streetPath`, or `null`. */
  public async nodeForStreet(streetPath: string): Promise<NodeRef | null> {
    const grid = await this.index();
    return grid.nodeAt.get(streetPath) ?? null;
  }

  /**
   * Why `nodeRef` is not delivering, in the kernel's six-word vocabulary, or
   * `null` when it is live. `cut` when a cut lies on its path; `dry` when the
   * source is down; `null` otherwise. (`overdrawn` is a Tier-deferred seam —
   * nothing browns out yet.)
   */
  public async supplyStateAt(nodeRef: NodeRef): Promise<SupplyState | null> {
    const grid = await this.index();
    const node = grid.nodes.get(nodeRef);
    if (!node || node.rootSource === null) return 'cut'; // no line reaches it
    for (const cut of this.cuts) {
      if (cut === nodeRef || grid.downstream.get(cut)?.has(nodeRef) === true) {
        return 'cut';
      }
    }
    const source = grid.sources.get(node.rootSource);
    if (!source || !source.isGenerating()) return 'dry';
    return null;
  }

  /**
   * ⭐ The trace from `nodeRef` back up to the source, naming the first cut on
   * the way. A dark stretch traced to its break — what `analyze grid` reports
   * on a pole. Source-first; the returned `firstCut` is the node whose severing
   * darkened this one, or `null` (live, or dark for want of a source).
   */
  public async traceFrom(
    nodeRef: NodeRef,
  ): Promise<{ chain: NodeRef[]; firstCut: NodeRef | null; source: string | null }> {
    const grid = await this.index();
    const node = grid.nodes.get(nodeRef);
    if (!node) return { chain: [], firstCut: null, source: null };
    const chain = [...(grid.traceUp.get(nodeRef) ?? []), nodeRef];
    // The first cut walking DOWN from the source — the break nearest the top.
    const firstCut = chain.find((r) => this.cuts.has(r)) ?? null;
    return { chain, firstCut, source: node.rootSource };
  }

  // ---------- writes ----------

  /**
   * ⭐ Cut the line at `nodeRef` — the storm's fault and the lineman's
   * `sever`. Idempotent. The node and its downstream set go dark the same
   * second (`isServingNow` is live). Ungated on the catalogue (the water
   * `Conduit.setCut` posture); the legitimate caller is `LineAccess`.
   */
  public sever(nodeRef: NodeRef): void {
    if (!this.cuts.has(nodeRef)) {
      this.cuts.add(nodeRef);
      this.cutSince.set(nodeRef, gridNowSeconds());
    }
  }

  /** Splice the line at `nodeRef` back together — the lineman's `splice`. */
  public splice(nodeRef: NodeRef): void {
    if (this.cuts.delete(nodeRef)) {
      const from = this.cutSince.get(nodeRef);
      this.cutSince.delete(nodeRef);
      if (from !== undefined) {
        this.outages.push({ node: nodeRef, fromS: from, toS: gridNowSeconds() });
        // Bound the history the way a TrajectoryLog ring is bounded.
        if (this.outages.length > OUTAGE_HISTORY_CAP) this.outages.shift();
      }
    }
  }

  /**
   * ⭐ The supply at `nodeRef` over `[fromS, toS]` as a 0/1 {@link Piecewise}
   * (1 = powered) — the complement of every cut that affected this node
   * (itself or any node upstream of it) during the window. The {@link Powered}
   * contract the parcel meter publishes so the envelope can integrate a cut
   * that happened mid-gap. ⚠ Source generation is read as-now (a hydro source
   * that stopped is not in this history — documented; the cut is the state
   * that matters to a fridge).
   */
  public poweredTrajectory(
    nodeRef: NodeRef,
    fromS: number,
    toS: number,
  ): Piecewise {
    const end = toS > fromS ? toS : fromS;
    const grid = this.loadedGrid();
    const affects = (cut: NodeRef): boolean =>
      cut === nodeRef || grid?.downstream.get(cut)?.has(nodeRef) === true;
    const now = gridNowSeconds();
    // Collect the unpowered intervals affecting this node, clamped to [from,end].
    const dark: Array<[number, number]> = [];
    const add = (a: number, b: number): void => {
      const lo = Math.max(a, fromS);
      const hi = Math.min(b, end);
      if (hi > lo) dark.push([lo, hi]);
    };
    for (const o of this.outages) if (affects(o.node)) add(o.fromS, o.toS);
    for (const cut of this.cuts) {
      if (affects(cut)) add(this.cutSince.get(cut) ?? fromS, now);
    }
    if (dark.length === 0) {
      return new Piecewise([
        { fromS, toS: end, startValue: 1, target: 1, tau: 0 },
      ]);
    }
    // Merge overlapping dark intervals, then stitch 1/0 stretches across the
    // window.
    dark.sort((p, q) => p[0] - q[0]);
    const merged: Array<[number, number]> = [];
    for (const iv of dark) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }
    const stretches: Stretch[] = [];
    let cursor = fromS;
    const flat = (a: number, b: number, v: number): void => {
      if (b > a) stretches.push({ fromS: a, toS: b, startValue: v, target: v, tau: 0 });
    };
    for (const [a, b] of merged) {
      flat(cursor, a, 1); // powered up to the cut
      flat(a, b, 0); // dark through the outage
      cursor = b;
    }
    flat(cursor, end, 1); // powered after the last splice
    return new Piecewise(stretches);
  }

  /** Whether `nodeRef` is currently cut. */
  public isCut(nodeRef: NodeRef): boolean {
    return this.cuts.has(nodeRef);
  }

  // ---------- StreetLightingSupply (Terminus's streetlights, migrated) ----------

  /**
   * Light the streets the grid can reach right now — the energized subset, in
   * the order handed in. Seniority is irrelevant to a wire: a cut, not a
   * budget, is what darkens an electric street, so nothing is consumed here.
   */
  public async lightStreets(
    paths: readonly string[],
    _nowS: number,
  ): Promise<readonly string[]> {
    await this.index();
    return paths.filter((p) => this.isStreetEnergizedSync(p));
  }

  /** Live: is this street's feeder node still energized? Sync — a cut is felt at once. */
  public isServingNow(path: string): boolean {
    return this.isStreetEnergizedSync(path);
  }

  public lightingSourceLabel(): string {
    return 'drawn from the grid';
  }

  // ---------- SupplyReporting ----------

  public async supplyReport(_nowS: number): Promise<SupplyReport> {
    const grid = await this.index();
    const total = grid.nodes.size;
    let live = 0;
    for (const ref of grid.nodes.keys()) if (this.energizedAtSync(ref)) live++;
    const state: SupplyState | null = live === 0 && total > 0 ? 'dry' : null;
    return {
      label: 'the grid',
      state,
      lines: [
        `${live} of ${total} feeder node(s) energized`,
        this.cuts.size > 0
          ? `${this.cuts.size} line(s) cut`
          : 'no lines cut',
      ],
    };
  }
}

/* ───────────────────────── module-private ───────────────────────── */

/**
 * The compiled grid, keyed by the catalogue instance. A module `WeakMap` rather
 * than an instance field so the sync `loadedGrid()` read can hand back the
 * settled value the moment the async load resolves, without an extra field the
 * hydrator would touch.
 */
const LOADED = new WeakMap<GridCatalogue, CompiledGrid>();

/** Parse a feeder row's `data` into a descriptor, or `null` if malformed. */
function descriptorOf(data: Record<string, unknown> | undefined): FeederDescriptor | null {
  if (!data) return null;
  const key = data.key;
  const nodes = data.nodes;
  if (typeof key !== 'string' || key === '' || !Array.isArray(nodes)) return null;
  return {
    key,
    name: typeof data.name === 'string' ? data.name : key,
    source: typeof data.source === 'string' && data.source !== '' ? data.source : null,
    nodes: nodes as FeederNode[],
    branchesFrom:
      typeof data.branchesFrom === 'string' && data.branchesFrom !== ''
        ? data.branchesFrom
        : null,
  };
}

async function loadGrid(): Promise<CompiledGrid> {
  const templates = await Template.findDescendants(FEEDER_PATH_PREFIX);
  const feeders = new Map<string, FeederDescriptor>();
  const problems: string[] = [];
  // ⭐ Set when an adjacency check failed because a street room was not yet
  // resolvable (the boot-settle race), as against resolving with no matching
  // exit — only the former warrants a recompile.
  let premature = false;
  for (const tpl of templates) {
    const d = descriptorOf(tpl.data as Record<string, unknown>);
    if (d === null) continue;
    if (feeders.has(d.key)) {
      problems.push(`two feeders claim the key '${d.key}'`);
      continue;
    }
    feeders.set(d.key, d);
  }

  const nodes = new Map<NodeRef, CompiledNode>();
  const nodeAt = new Map<string, NodeRef>();
  const succ = new Map<NodeRef, NodeRef[]>();
  const pred = new Map<NodeRef, NodeRef[]>();

  // Nodes + intra-feeder edges (exit-verified).
  for (const feeder of feeders.values()) {
    let prev: NodeRef | null = null;
    let prevStreet: string | null = null;
    for (let i = 0; i < feeder.nodes.length; i++) {
      const n = feeder.nodes[i]!;
      const ref = `${feeder.key}:${n.name}`;
      if (nodes.has(ref)) {
        problems.push(`feeder '${feeder.key}' has two nodes named '${n.name}'`);
        continue;
      }
      nodes.set(ref, {
        ref,
        feederKey: feeder.key,
        feederName: feeder.name,
        nodeName: n.name,
        streetPath: n.at,
        buried: n.buried === true,
        rootSource: null, // filled below
        index: i,
      });
      nodeAt.set(n.at, ref);
      if (prev !== null && prevStreet !== null) {
        const { joined, readable } = await exitJoins(prevStreet, n.at);
        if (joined) {
          addEdge(succ, pred, prev, ref);
        } else {
          if (!readable) premature = true;
          problems.push(
            `feeder '${feeder.key}': no exit joins '${prevStreet}' and ` +
              `'${n.at}' — a line may not leave the road; '${n.name}' and all ` +
              `below it are unreachable`,
          );
        }
      }
      prev = ref;
      prevStreet = n.at;
    }
  }

  // Cross-feeder edges: a spur branches from a node of another feeder.
  for (const feeder of feeders.values()) {
    if (feeder.branchesFrom === null || feeder.nodes.length === 0) continue;
    const parent = feeder.branchesFrom;
    const child = `${feeder.key}:${feeder.nodes[0]!.name}`;
    if (!nodes.has(parent)) {
      problems.push(
        `feeder '${feeder.key}' branches from '${parent}', which no feeder declares`,
      );
      continue;
    }
    addEdge(succ, pred, parent, child);
  }

  // downstream (BFS through successors) + traceUp (ancestor chain via preds).
  const downstream = new Map<NodeRef, Set<NodeRef>>();
  for (const ref of nodes.keys()) downstream.set(ref, bfs(ref, succ));
  const traceUp = new Map<NodeRef, NodeRef[]>();
  for (const ref of nodes.keys()) traceUp.set(ref, ancestorChain(ref, pred));

  // rootSource: propagate each trunk's source down its verified subtree.
  const sources = new Map<string, Generator | null>();
  for (const feeder of feeders.values()) {
    if (feeder.source === null || feeder.nodes.length === 0) continue;
    const root = `${feeder.key}:${feeder.nodes[0]!.name}`;
    const reached = new Set<NodeRef>([root, ...(downstream.get(root) ?? [])]);
    for (const ref of reached) {
      const node = nodes.get(ref);
      if (node) node.rootSource = feeder.source;
    }
    if (!sources.has(feeder.source)) {
      sources.set(feeder.source, await resolveSource(feeder.source));
    }
  }

  if (problems.length > 0) {
    // eslint-disable-next-line no-console -- the compile's own record (never a throw)
    console.warn(`GridCatalogue: ${problems.length} feeder problem(s):\n  - ${problems.join('\n  - ')}`);
  }
  return { nodes, downstream, traceUp, nodeAt, sources, problems, premature };
}

/** Add a directed edge `from → to` to the successor/predecessor maps. */
function addEdge(
  succ: Map<NodeRef, NodeRef[]>,
  pred: Map<NodeRef, NodeRef[]>,
  from: NodeRef,
  to: NodeRef,
): void {
  (succ.get(from) ?? succ.set(from, []).get(from)!).push(to);
  (pred.get(to) ?? pred.set(to, []).get(to)!).push(from);
}

/**
 * Every node reachable downstream of `ref` (exclusive of `ref`).
 *
 * ⭐ One traversal, or none (`docs/lint-family.md`
 * § `lint:graph-walks`): the frontier, the visited set and the order
 * are the kernel skeleton's, and what is left here is the only part
 * that was ever grid-specific — the successor map, and the fact that
 * `ref` itself is not downstream of itself.
 */
function bfs(ref: NodeRef, succ: Map<NodeRef, NodeRef[]>): Set<NodeRef> {
  const out = new Set<NodeRef>();
  const starts = succ.get(ref) ?? [];
  if (starts.length === 0) return out;
  const walk = new Traversal<NodeRef, Set<NodeRef>, void>({
    order: 'breadth-first',
    keyOf: (n) => n,
    neighbours: (n) => (succ.get(n) ?? []).map((node) => ({ node })),
    // The whole compiled graph is the bound: a feeder tree cannot be
    // larger than the node roster it was compiled from.
    bound: { nodes: succ.size + 1 },
    fold: (n) => {
      out.add(n);
      return out;
    },
  });
  walk.walkFrom(starts, { carry: undefined });
  return out;
}

/** The ancestor chain from the source down to (but not including) `ref`. */
function ancestorChain(ref: NodeRef, pred: Map<NodeRef, NodeRef[]>): NodeRef[] {
  const chain: NodeRef[] = [];
  const seen = new Set<NodeRef>();
  let cur: NodeRef | undefined = pred.get(ref)?.[0];
  while (cur !== undefined && !seen.has(cur)) {
    seen.add(cur);
    chain.unshift(cur);
    cur = pred.get(cur)?.[0];
  }
  return chain;
}

/** Stand up a source generator and narrow it to the `isGenerating` duck. */
async function resolveSource(path: string): Promise<Generator | null> {
  try {
    const inst = (await StuffApi.singleton(path)) as unknown as
      | (Stuff & Partial<Generator>)
      | null;
    if (!inst || typeof inst.isGenerating !== 'function') return null;
    return inst as unknown as Generator;
  } catch {
    return null;
  }
}

/**
 * Whether an exit joins two streets in either direction — the exit-graph
 * verification. Uses `StuffApi.singleton(streetPath)` + `getExits()` directly
 * (no transport-pack dependency), the way the plan's D3 says.
 *
 * ⭐ Also reports whether both streets were **readable** — a street whose
 * room does not resolve (the boot-settle race, before the rooms are
 * instantiable) is a different failure from one that resolves with no
 * matching exit, and only the first warrants a recompile. See
 * `GridCatalogue.maybeRecompileUnreachable`.
 */
async function exitJoins(
  fromStreet: string,
  toStreet: string,
): Promise<{ joined: boolean; readable: boolean }> {
  const from = await exitsOf(fromStreet);
  const to = await exitsOf(toStreet);
  // ⚠ "Readable" means the exit graph is HYDRATED, not merely that the room
  // resolved: at the boot-settle every street room exists but NONE of their
  // exits have resolved destinations yet, so `exitsOf` returns empty for ALL
  // of them. The signal that distinguishes that race from a genuine miss is
  // whether EITHER endpoint has any hydrated exits — at the settle neither
  // does; a genuine dead-end (an island with no exits) still has a reachable
  // upstream street that does. So premature iff BOTH are empty.
  const ready = (d: string[] | null): boolean => d !== null && d.length > 0;
  const readable = ready(from) || ready(to);
  const joined =
    (from?.includes(toStreet) ?? false) || (to?.includes(fromStreet) ?? false);
  return { joined, readable };
}

/** The destination paths a street's exits lead to, or `null` if unresolvable. */
async function exitsOf(street: string): Promise<string[] | null> {
  try {
    const room = (await StuffApi.singleton(street)) as unknown as
      | (Stuff & {
          getExits?: () => ReadonlyMap<
            string,
            { getDestinationTemplatePath?: () => string | null }
          >;
        })
      | null;
    if (!room || typeof room.getExits !== 'function') return null;
    const dests: string[] = [];
    for (const exit of room.getExits().values()) {
      const d = exit.getDestinationTemplatePath?.();
      if (typeof d === 'string') dests.push(d);
    }
    return dests;
  } catch {
    return null;
  }
}

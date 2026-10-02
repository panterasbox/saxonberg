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
}

export default class GridCatalogue
  extends Idea
  implements StreetLightingSupply, SupplyReporting
{
  /** `null` until the first read; the load promise once one is running. */
  private loading: Promise<CompiledGrid> | null = null;

  /** ⚠ In-memory, transient — see the class docstring. Node refs cut open. */
  private cuts = new Set<NodeRef>();

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

  /** The compiled grid if it is already loaded, else `null` (kicks a load). */
  private loadedGrid(): CompiledGrid | null {
    if (this.loading === null) {
      void this.index(); // kick it; this read answers false until it lands
      return null;
    }
    return LOADED.get(this) ?? null;
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
    this.cuts.add(nodeRef);
  }

  /** Splice the line at `nodeRef` back together — the lineman's `splice`. */
  public splice(nodeRef: NodeRef): void {
    this.cuts.delete(nodeRef);
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
        if (await exitJoins(prevStreet, n.at)) {
          addEdge(succ, pred, prev, ref);
        } else {
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
  return { nodes, downstream, traceUp, nodeAt, sources, problems };
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

/** Every node reachable downstream of `ref` (exclusive of `ref`). */
function bfs(ref: NodeRef, succ: Map<NodeRef, NodeRef[]>): Set<NodeRef> {
  const out = new Set<NodeRef>();
  const queue = [...(succ.get(ref) ?? [])];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (out.has(cur)) continue;
    out.add(cur);
    queue.push(...(succ.get(cur) ?? []));
  }
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
 */
async function exitJoins(fromStreet: string, toStreet: string): Promise<boolean> {
  return (
    (await hasExitTo(fromStreet, toStreet)) ||
    (await hasExitTo(toStreet, fromStreet))
  );
}

async function hasExitTo(fromStreet: string, toStreet: string): Promise<boolean> {
  try {
    const room = (await StuffApi.singleton(fromStreet)) as unknown as
      | (Stuff & {
          getExits?: () => ReadonlyMap<
            string,
            { getDestinationTemplatePath?: () => string | null }
          >;
        })
      | null;
    if (!room || typeof room.getExits !== 'function') return false;
    for (const exit of room.getExits().values()) {
      if (exit.getDestinationTemplatePath?.() === toStreet) return true;
    }
    return false;
  } catch {
    return false;
  }
}

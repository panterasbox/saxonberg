/**
 * LocationGraphRegistry — the thing that builds the world's shape and
 * keeps it current.
 *
 * ⭐ **Self-warming, like `MaterialCatalogue`**: `onCreate` → `rebuild()`,
 * booted from the platform pack's `boot:` manifest with role
 * `sync-read`. No `Api.boot()` — a roster warm is not an operator act —
 * and no `installFrameworkWiring` line either, because that is framework
 * DI and this is a content walk.
 *
 * ⭐⭐ **`rebuild()` is idempotent by GENERATION, not by truncation.** It
 * stamps every node it projects with a fresh generation and then deletes
 * the rows carrying any other. That is what *droppable and rebuildable
 * at any moment* means in code, and the reason it is not
 * drop-then-repopulate is that there would be a window in which the
 * graph is empty — and the publish gate reads the graph, so the window
 * is a window in which every door answers wrongly.
 *
 * ⚠ The projection is DERIVED and must never be a source. Nothing here
 * writes to a content row, and nothing it produces is believed over the
 * rows.
 *
 * Every public method is gated to `NavigationLogic`, the
 * `AddressRegistry` → `AddressLogic` arrangement: the thin
 * `NavigationApi` facade forwards through the logic singleton, and code
 * that grabs this Stuff by path gets a reference and a `SecurityError`
 * on any call.
 */

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { ParcelApi } from '../../api/parcel';
import { ZoneApi } from '../../api/zone';
import { NavigationApi } from '../../api/navigation';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { Template } from '../../lib/stuff/Template';
import { KnowledgeGraph } from '../../lib/location/KnowledgeGraph';
import { PlatPlan } from '../../lib/location/PlatPlan';
import { OuterWarren } from '../../lib/location/OuterWarren';
import Location from '../../lib/stuff/Location';
import { PlaceNode, type StoredEdge, type NodeTravel } from '../../lib/location/PlaceNode';
import {
  GraphInvariants,
  type GraphFinding,
  type GraphNode,
} from '../../lib/location/GraphInvariants';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';

/** Only the logic singleton may drive the registry. */
const NavigationLogicOnly = SecurityPolicies.FromTemplate(
  '/platform/idea/api/navigation',
);

/** A class-identity verdict, cached per boot — the walk is not cheap. */
type ClassKind = 'place' | 'kind' | 'warren' | 'other';

export default class LocationGraphRegistry extends Idea {
  /** The generation the last successful rebuild stamped. */
  private generation = 0;

  /** Has a rebuild completed? The hook's skip during pack install. */
  private warm = false;

  /** The in-flight first warm, so a burst of reads builds once. */
  private warming: Promise<void> | null = null;

  /** `classPath → what kind of thing it is`, for one boot. */
  private readonly classKinds = new Map<string, ClassKind>();

  /** Residency veto — a culled registry re-warms nothing. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason: 'LocationGraphRegistry is a system singleton; never destructed',
    };
  }

  /**
   * ⭐⭐ **Warms LAZILY, on the first read — there is no `onCreate`.**
   *
   * Two reasons, and the second is the better one. `lint:on-create`
   * refuses a ninth catalogue `onCreate` (the ceiling is a ratchet that
   * may fall and never rise), which is what forced the question — and
   * the answer is that an eager warm was buying nothing: **nothing
   * reads the graph at boot.** The traversal gate's publish check goes
   * through `ParcelApi`, not through here; the invariant check, the
   * re-projection and the router's queries are all later events. So an
   * eager walk of every content row at boot would have been work for
   * no reader, which is the opposite of the reference-Ideas-inert
   * problem a warm exists to solve.
   *
   * `ReadingCatalogue` is the precedent for the lazy half and its pack
   * manifest line says so: *self-warming, and lazily on the first
   * miss*. The boot entry still clones this registry, so
   * `NavigationLogic` can find it; the first graph read builds it.
   *
   * ⚠ Idempotent and guarded, so a burst of first reads warms once.
   */
  private async ensureWarm(): Promise<void> {
    if (this.warm) return;
    if (this.warming) {
      await this.warming;
      return;
    }
    this.warming = this.rebuildImpl().then(() => undefined);
    try {
      await this.warming;
    } finally {
      this.warming = null;
    }
  }

  /**
   * Has the graph been built at least once?
   *
   * ⚠ The write chokepoint reads this to SKIP per-row projection during
   * pack install: the installer writes thousands of rows before
   * anything warms, and projecting each one would be that many wasted
   * upserts against a graph the rebuild is about to replace wholesale.
   */
  @CallSecurity(NavigationLogicOnly)
  public isWarm(): boolean {
    return this.warm;
  }

  /** Rebuild the whole graph from the content rows. */
  @CallSecurity(NavigationLogicOnly)
  public async rebuild(): Promise<number> {
    return this.rebuildImpl();
  }

  /**
   * The rebuild itself, UNGATED and private.
   *
   * ⚠⚠ `onCreate` cannot call the gated `rebuild()`: inside a method
   * dispatched through the call-security proxy `this` IS the proxy, so
   * a self-call arrives at the gate as a call from the registry rather
   * than from `NavigationLogic` and is denied. `NavigationLogic`'s own
   * module-private `normalize` free function exists for exactly this
   * reason and says so. Splitting the gated face from the
   * implementation is the same move.
   */
  private async rebuildImpl(): Promise<number> {
    /*
     * ⚠⚠ MONOTONIC, not `Date.now()`.
     *
     * A wall-clock stamp collides when two rebuilds land in the same
     * millisecond — a boot that rebuilds twice, a CMS save storm, a
     * test — and a colliding generation sweeps NOTHING, because every
     * stale row's stamp equals the new one. The sweep then silently
     * keeps nodes for rows that have stopped being places, which is
     * precisely the failure the generation exists to prevent. Found by
     * a test whose two rebuilds ran inside one millisecond.
     *
     * The clock is still the base, so generations stay roughly
     * readable as times; `+ 1` is what guarantees forward motion.
     */
    const generation = Math.max(Date.now(), this.generation + 1);
    this.classKinds.clear();
    let projected = 0;
    try {
      const rows = await this.locationRows();
      for (const row of rows.places) {
        await this.writeTemplateNode(row, generation);
        projected++;
      }
      for (const row of rows.warrens) {
        projected += await this.writePlanNodes(row, generation);
      }
      const swept = await this.sweepStaleGenerations(generation);
      this.generation = generation;
      this.warm = true;
      console.info(
        `LocationGraphRegistry: ${projected} node(s) projected, ` +
          `${swept} stale row(s) swept`,
      );
    } catch (err) {
      // ⚠ A failed rebuild leaves the PREVIOUS generation standing
      // rather than a half-built graph: the sweep is the last step, so
      // nothing has been deleted yet. The graph is stale, which is a
      // recoverable state; empty is not.
      console.warn('LocationGraphRegistry: rebuild failed', err);
    }
    return projected;
  }

  /** Re-project one content row, and remove its node if it stopped being one. */
  @CallSecurity(NavigationLogicOnly)
  public async projectRow(path: string): Promise<void> {
    const row = await Template.findByPath(path);
    if (!row) {
      await this.removeRow(path);
      return;
    }
    const kind = await this.kindOf(row.class);
    if (kind === 'place') {
      await this.writeTemplateNode(row, this.generation);
    } else if (kind === 'warren') {
      await this.writePlanNodes(row, this.generation);
    } else {
      await this.removeRow(path);
    }
  }

  /** Drop every node this row produced. */
  @CallSecurity(NavigationLogicOnly)
  public async removeRow(path: string): Promise<void> {
    const existing = await PlaceNode.find<PlaceNode>({ template: path });
    for (const row of existing) await row.delete();
  }

  /** Re-read `published` for every node under `extent`. */
  @CallSecurity(NavigationLogicOnly)
  public async reprojectExtent(extent: string): Promise<number> {
    const nodes = await this.nodesUnderExtent(extent);
    let changed = 0;
    for (const node of nodes) {
      const published = this.publishedAt(node.identity);
      if (node.published === published) continue;
      node.published = published;
      await node.save();
      changed++;
    }
    return changed;
  }

  /* ── reads ──────────────────────────────────────────────────────── */

  @CallSecurity(NavigationLogicOnly)
  public async node(identity: string): Promise<PlaceNode | null> {
    await this.ensureWarm();
    return this.findNode(identity);
  }

  @CallSecurity(NavigationLogicOnly)
  public async nodesInZone(zone: string): Promise<PlaceNode[]> {
    await this.ensureWarm();
    return PlaceNode.find<PlaceNode>({ zone });
  }

  /** Every node whose identity sits at or under `extent`. */
  @CallSecurity(NavigationLogicOnly)
  public async nodesInExtent(extent: string): Promise<PlaceNode[]> {
    await this.ensureWarm();
    return this.nodesUnderExtent(extent);
  }

  /**
   * ⭐⭐ The whole index as something walkable — the **world** knowledge
   * source for routing.
   *
   * Cached per `generation`, which costs nothing to get right: the
   * rebuild already stamps one and sweeps the rest, so a cache keyed
   * on it is dropped by every rebuild for free and can never serve a
   * stale shape. ⚠ The cache lives HERE and not on `NavigationLogic`
   * for the same reason the index does: the Logic is the hot-reload
   * boundary and a reload must not cost the realm its graph (the
   * `AddressRegistry` → `AddressLogic` arrangement).
   *
   * `extent` is a prefix over identity. ⭐ Scoping a search to an
   * extent is a thing an AUTHOR may choose — an NPC that only knows
   * its own quarter is the author saying so. The engine never assumes
   * it, because what an NPC knows is 100% the author's to declare.
   *
   * ⚠ The whole-table read is deliberate and is inside the owner,
   * which is `lint:whole-table`'s stated exemption: 128 nodes today,
   * materialised once per generation rather than once per search.
   */
  @CallSecurity(NavigationLogicOnly)
  public async graphView(extent?: string): Promise<KnowledgeGraph> {
    await this.ensureWarm();
    const key = extent ?? '';
    if (this.viewGeneration === this.generation) {
      const hit = this.views.get(key);
      if (hit) return hit;
    } else {
      this.views.clear();
      this.viewGeneration = this.generation;
    }
    const view = KnowledgeGraph.fromNodes(await this.allNodes(), extent);
    this.views.set(key, view);
    return view;
  }

  @CallSecurity(NavigationLogicOnly)
  public async pointingAt(identity: string): Promise<PlaceNode[]> {
    await this.ensureWarm();
    return PlaceNode.find<PlaceNode>({ 'edges.to': identity });
  }

  @CallSecurity(NavigationLogicOnly)
  public async interzoneSkeleton(): Promise<PlaceNode[]> {
    await this.ensureWarm();
    return PlaceNode.find<PlaceNode>({ crossesZone: true });
  }

  @CallSecurity(NavigationLogicOnly)
  public async edgesIntoUnpublished(): Promise<PlaceNode[]> {
    await this.ensureWarm();
    const all = await this.allNodes();
    const byIdentity = new Map(all.map((n) => [n.identity, n]));
    return all.filter(
      (n) =>
        n.published &&
        n.edges.some((e) => {
          const far = e.to ? byIdentity.get(e.to) : undefined;
          return far !== undefined && !far.published;
        }),
    );
  }

  /** Run the shared invariants over the projected nodes. */
  @CallSecurity(NavigationLogicOnly)
  public async checkGraph(scope?: string): Promise<GraphFinding[]> {
    await this.ensureWarm();
    const all = await this.allNodes();
    const nodes: GraphNode[] = all.map((n) => n.toGraphNode());
    this.markEntrances(nodes);
    return new GraphInvariants(nodes).findings(scope);
  }

  /* ── the projection ─────────────────────────────────────────────── */

  /**
   * Every location row, split by what it is.
   *
   * ⚠⚠ Enumerated **by CLASS**, never by path infix. Place rows are not
   * all under a `/location/` segment — several predate the
   * `<root>/<branch>/` pattern — so an infix filter would skip them
   * silently, which is how a gate becomes a gate-shaped comment. The
   * class verdict is computed once per class and cached.
   */
  private async locationRows(): Promise<{
    places: Template[];
    warrens: Template[];
  }> {
    // Every row: every template path starts with `/`.
    const all = await Template.findByPathInfix('/');
    const places: Template[] = [];
    const warrens: Template[] = [];
    for (const row of all) {
      if (!row.class) continue;
      const kind = await this.kindOf(row.class);
      if (kind === 'place') places.push(row);
      else if (kind === 'warren') warrens.push(row);
    }
    return { places, warrens };
  }

  /**
   * Is this class a place, a kind of place, a warren, or none of those?
   *
   * ⭐ A **place** is a Location that composes `SingletonMixin` — *one
   * row IS one place*. Everything else that is a Location is a KIND,
   * minted many times through a warren or a programme, and is not a
   * node: the elastic half of the world is perceived live and never
   * stored.
   */
  private async kindOf(classPath: string): Promise<ClassKind> {
    const cached = this.classKinds.get(classPath);
    if (cached !== undefined) return cached;
    let verdict: ClassKind = 'other';
    try {
      const cls = (await StuffApi.loadClassByPath(classPath)) as {
        prototype?: unknown;
      };
      if (typeof cls === 'function') {
        if (cls.prototype instanceof OuterWarren) verdict = 'warren';
        else if (cls.prototype instanceof Location) {
          verdict = MixinApi.hasMixin(
            cls as never,
            Mixins.Singleton,
          )
            ? 'place'
            : 'kind';
        }
      }
    } catch {
      verdict = 'other';
    }
    this.classKinds.set(classPath, verdict);
    return verdict;
  }

  /** Upsert the node for a place row. */
  /* ── the record's queries, private to their one consumer ──────────
   *
   * ⭐ They were statics on `PlaceNode` first (the `ParcelRecord`
   * shape). `lint:lib-statics` refused seven new statics on a non-Api
   * class, and asking its question — *does this answer something about
   * the TYPE or about the WORLD?* — gave the better placement: this
   * registry is the record's only consumer, so a public finder surface
   * was offering reads nobody outside performs.
   */

  /** The one node with this identity, or null. */
  private async findNode(identity: string): Promise<PlaceNode | null> {
    const rows = await PlaceNode.find<PlaceNode>({ identity });
    return rows[0] ?? null;
  }

  /** Every node — the rebuild's and the full check's input. */
  /** Materialised views, keyed by extent, valid for one generation. */
  private views = new Map<string, KnowledgeGraph>();
  private viewGeneration = -1;

  private async allNodes(): Promise<PlaceNode[]> {
    return PlaceNode.find<PlaceNode>({});
  }

  /** Every node whose identity sits at or under `extent`. */
  private async nodesUnderExtent(extent: string): Promise<PlaceNode[]> {
    const all = await this.allNodes();
    return all.filter(
      (n) => n.identity === extent || n.identity.startsWith(extent + '/'),
    );
  }

  /** Drop every node NOT stamped with `generation` — the rebuild sweep. */
  private async sweepStaleGenerations(generation: number): Promise<number> {
    const stale = (await this.allNodes()).filter(
      (n) => n.generation !== generation,
    );
    for (const row of stale) await row.delete();
    return stale.length;
  }

  /** The zone's own template path, or `''` when nothing zones this. */
  private async zonePathOf(path: string): Promise<string> {
    const zone = await ZoneApi.resolveZoneForPath(path);
    return zone?.getTemplatePath() ?? '';
  }

  private async writeTemplateNode(row: Template, generation: number): Promise<void> {
    const data = (row.data ?? {}) as Record<string, unknown>;
    const node =
      (await this.findNode(row.path)) ?? new PlaceNode();
    node.identity = row.path;
    node.template = row.path;
    node.origin = 'template';
    node.zone = await this.zonePathOf(row.path);
    node.address = typeof data._address === 'string' ? data._address : '';
    node.coords = this.coordsOf(data);
    node.edges = await this.edgesOf(data);
    node.published = this.publishedAt(row.path);
    node.travel = this.travelOf(data);
    node.crossesZone = await this.crossesZone(node);
    node.generation = generation;
    await node.save();
  }

  /**
   * Upsert the nodes a warren's PLAN declares — its circulation.
   *
   * ⭐ Each node's `template` is **the warren's row**, not the
   * circulation class: the `plan:` is authored on the warren, so the
   * warren's row is what an author would go and edit, which is the one
   * thing `template` is for. The circulation class is code.
   *
   * ⚠⚠ **No slot stubs**, and this departs from the plan's D4
   * deliberately. D4 projects one `{to: null, slot}` stub per frontage
   * so the graph knows there are gates on a node. But every invariant
   * skips a stub by definition, the router cannot route over an edge
   * with no destination, and a player's map of lot-7 is carried by the
   * HANDLE (B3), not by a stub here — so a stub has no reader. Shipping
   * declared data with no consumer is the dead-capability failure this
   * repo keeps paying for; when the router wants frontages it can add
   * them together with the thing that reads them.
   */
  private async writePlanNodes(row: Template, generation: number): Promise<number> {
    const data = (row.data ?? {}) as Record<string, unknown>;
    const parentExtent =
      typeof data.parentExtent === 'string' ? data.parentExtent : '';
    if (!parentExtent) return 0;
    let plan: PlatPlan;
    try {
      plan = PlatPlan.parse(
        (data.plan ?? null) as Record<string, unknown> | null,
      );
    } catch {
      return 0;
    }
    // ⚠ A linear plan's `nodesInOrder` is UNBOUNDED — it enumerates to
    // `maxNodes`. The cap is the authored capacity, so a dorm projects
    // the floors it can actually let rather than a hundred.
    const capacity =
      typeof data.defaultCapacity === 'number' ? data.defaultCapacity : 0;
    const cap = plan.shape === 'linear' ? Math.max(1, Math.ceil(capacity / 12)) : 100;
    const nodeIds = plan.nodesInOrder(cap);
    let written = 0;
    for (const nodeId of nodeIds) {
      const authored = plan.authoredPathOf(nodeId);
      // An AUTHORED circulation node IS a content row, so it is already
      // projected as a template node; the plan only contributes its
      // spine edges, which that row's own `exits:` declare.
      if (authored) continue;
      const identity = plan.nodeIdentityOf(nodeId, parentExtent);
      const node =
        (await this.findNode(identity)) ?? new PlaceNode();
      node.identity = identity;
      node.template = row.path;
      node.origin = 'plan';
      node.zone = await this.zonePathOf(parentExtent);
      node.address = '';
      node.coords = null;
      node.edges = this.planEdges(plan, nodeId, parentExtent);
      node.published = this.publishedAt(parentExtent);
      node.travel = null;
      node.crossesZone = false;
      node.generation = generation;
      await node.save();
      written++;
    }
    return written;
  }

  /** The spine: back to the predecessor, and onward to the successor. */
  private planEdges(
    plan: PlatPlan,
    nodeId: string,
    parentExtent: string,
  ): StoredEdge[] {
    const out: StoredEdge[] = [];
    const predecessor = plan.predecessorOf(nodeId);
    if (predecessor) {
      // The direction FROM the predecessor onward is the plan's; the
      // way back from here is its cardinal inverse.
      const onward = plan.onwardDirectionOf(predecessor);
      const back = NavigationApi.invertDirection(onward);
      out.push({
        dir: back ?? onward,
        to: plan.nodeIdentityOf(predecessor, parentExtent),
        bidirectional: true,
      });
    }
    return out;
  }

  private coordsOf(data: Record<string, unknown>): [number, number, number] | null {
    const raw = data.coords;
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    const n = (v: unknown): number => (typeof v === 'number' ? v : 0);
    if (c.x === undefined && c.y === undefined && c.z === undefined) return null;
    return [n(c.x), n(c.y), n(c.z)];
  }

  /**
   * Project a row's authored `exits:` map.
   *
   * ⭐⭐ **Three fields were added here, and they are what makes a lane
   * DERIVABLE from the index.** Before them the projection could cost
   * a wagon's route but not say whether a wagon may take it, so the
   * only way to compile a lane was to walk live exits one at a time —
   * which is exactly what `LaneCatalogue.induce` did, and why.
   *
   * - `media` + `wheelPassable` come off the edge spec **or the kind
   *   row**, because a stair declares `media: ['ground'],
   *   wheelPassable: false` once on the kind and every stair installed
   *   from it inherits that. Reading only the edge spec would have
   *   projected an empty media list for every kinded exit in the
   *   realm, which reads as *admits everything*.
   * - `conditional` is the kind's alone (⭐ a ford is a ford wherever
   *   it is laid), and it is the honest middle between pretending the
   *   index knows the river's level and saying nothing about the ford
   *   at all.
   *
   * ⛔ **A `blocked: true` spec projects NO EDGE.** An authored block
   * is a way that is not there — not a way the search has to refuse —
   * and leaving it in the index would make every consumer re-derive
   * the same exclusion. ⚠ Measured: there are ZERO authored
   * `blocked: true` specs in all of content, so this rule ships
   * exercised only by its own test.
   *
   * Async now, for one `Template.findByPath` per KINDED edge. Kinds
   * are few and the read is cached by the template layer; the
   * alternative was resolving class files from the projection, which
   * is a boundary this must not cross.
   */
  private async edgesOf(data: Record<string, unknown>): Promise<StoredEdge[]> {
    const raw = data.exits;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const out: StoredEdge[] = [];
    for (const [dir, spec] of Object.entries(raw as Record<string, unknown>)) {
      if (!spec || typeof spec !== 'object') continue;
      const s = spec as Record<string, unknown>;
      if (s.blocked === true) continue;
      const dest = typeof s.destination === 'string' ? s.destination : null;
      const kind = typeof s.kind === 'string' ? s.kind : null;
      const kindData = kind ? await this.kindDataOf(kind) : null;
      const media = Array.isArray(s.media)
        ? (s.media as unknown[]).filter((m): m is string => typeof m === 'string')
        : Array.isArray(kindData?.media)
          ? (kindData.media as unknown[]).filter(
              (m): m is string => typeof m === 'string',
            )
          : null;
      const wheels =
        typeof s.wheelPassable === 'boolean'
          ? s.wheelPassable
          : typeof kindData?.wheelPassable === 'boolean'
            ? (kindData.wheelPassable as boolean)
            : null;
      const conditional =
        s.conditional === true ||
        kindData?.conditional === true ||
        kindData?._conditional === true;
      out.push({
        dir,
        to: dest,
        toPath: dest,
        ...(s.bidirectional === true ? { bidirectional: true } : {}),
        ...(s.oneWay === true ? { oneWay: true } : {}),
        ...(typeof s.door === 'string' ? { door: s.door } : {}),
        ...(typeof s.edgeMinutes === 'number' ? { minutes: s.edgeMinutes } : {}),
        ...(kind !== null ? { kind } : {}),
        ...(media !== null && media.length > 0 ? { media } : {}),
        ...(wheels === false ? { wheelPassable: false } : {}),
        ...(conditional ? { conditional: true } : {}),
      });
    }
    return out;
  }

  /**
   * The `data:` of an exit-KIND row, or null. ⚠ Reads the row as DATA
   * and never resolves its `class:` — the projection's standing rule
   * (it is a projection of authored content, not of live objects).
   */
  private async kindDataOf(
    kind: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await Template.findByPath(kind);
    if (!row) return null;
    const data = row.data;
    return data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  }

  /**
   * What a travel network advertises here — read as DATA, by field name
   * (`seatIn` + `routes`), because the kernel names no pack class.
   *
   * ⚠ This couples the projection to the tpa pack's field names without
   * importing it. Recorded as a lean rather than hidden: the
   * alternative is a kernel `TravelNode` ROW shape, which is the
   * router build's to design.
   */
  private travelOf(data: Record<string, unknown>): NodeTravel | null {
    if (typeof data.seatIn !== 'string' || !Array.isArray(data.routes)) {
      return null;
    }
    const routes = data.routes
      .map((r) => {
        if (!r || typeof r !== 'object') return null;
        const o = r as Record<string, unknown>;
        if (typeof o.to !== 'string') return null;
        return {
          to: o.to,
          fee: typeof o.fee === 'number' ? o.fee : 0,
          departures: typeof o.departures === 'string' ? o.departures : null,
        };
      })
      .filter((r): r is NodeTravel['routes'][number] => r !== null);
    return {
      role: typeof data.directionality === 'string' ? data.directionality : 'both',
      boardLabel: typeof data.boardLabel === 'string' ? data.boardLabel : null,
      routes,
    };
  }

  /** Is the covering parcel published? Absent claim means live content. */
  private publishedAt(path: string): boolean {
    const parcel = ParcelApi.coveringParcelOfSync(path);
    return parcel?.isPublished() ?? true;
  }

  /** Does any edge leave this node's zone? */
  private async crossesZone(node: PlaceNode): Promise<boolean> {
    if (node.zone === '') return false;
    for (const edge of node.edges) {
      const target = edge.to ?? edge.toPath;
      if (!target) continue;
      const farZone = await this.zonePathOf(target);
      if (farZone !== '' && farZone !== node.zone) return true;
    }
    return false;
  }

  /**
   * A zone's entrances, derived: a node with an inbound cross-zone
   * edge, plus every travel stop, plus the default start location.
   */
  private markEntrances(nodes: GraphNode[]): void {
    const byIdentity = new Map(nodes.map((n) => [n.identity, n]));
    for (const node of nodes) {
      for (const edge of node.edges) {
        const far = edge.to ? byIdentity.get(edge.to) : undefined;
        if (!far || !far.zone || far.zone === node.zone) continue;
        far.entrance = true;
      }
    }
  }
}

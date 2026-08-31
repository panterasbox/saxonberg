/**
 * HoldingWarren — the shared **two-tier holdings + circulation** base
 * every residential institution consumes (residences D12/D16): the
 * dorm, the lot holder, the apartment building are the same machine
 * wearing different clothes.
 *
 * Lifted from `DormWarren` (whose suite pins the behavior): the base
 * owns the keyed-holdings map, the circulation-node map, the entry
 * edges (doors/gates), the provisioned + keyway caches (rebuilt from
 * the durable parcel rows — `ParcelApi.childParcelsOf(parentExtent)`),
 * `admit`, `dropHolding`, sync node reachability, the **reap
 * invariant** (holdings dorm-when-empty; circulation reaps
 * outside-in — a node never reaps while a live holding hangs off it or
 * a live node sits beyond it on its route, so the graph stays
 * contiguous back to the authored entrance), `teardown`, and the
 * **capacity read** (D10: `capacityKey` names the operator's
 * runtime AppSettings dial, `defaultCapacity` the shipped default;
 * `assertBelowCap` refuses with the reason named).
 *
 * Layout is a {@link PlatPlan} (D13) parsed from the authored `plan:`
 * field — slots map to circulation nodes, roads grow (and branch) the
 * way floors already stack. Circulation is **never its own warren**:
 * its whole lifecycle derives from the holdings it serves.
 *
 * Policy hooks a consumer supplies: `standUpHolding(key)` (clone /
 * programme-admit + restore — the whole stand-up, so its internal
 * order is the consumer's), `circulationTemplateFor(node)`,
 * `wireCirculationNode(node, room)` (stairs down/up; road exits), and
 * `entryEdgeFor(key, circulation)` (the door / gate). The Warren base
 * hooks (`createMember`, `wireHubExit`, …) remain available beneath.
 */

import { Warren } from './Warren';
import { PlatPlan } from './PlatPlan';
import { MqlApi } from '../../api/mql';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { ParcelApi } from '../../api/parcel';
import { PersistableApi } from '../../api/persistable';
import { MixinApi } from '../../api/mixin';
import type Exit from '../boundary/Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Exitable } from '../boundary/Exitable';
import type { Persistable } from '../persistence/Persistable';
import type { FieldMeta } from '../mixin';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

/** The capacity gate's answer — refusal carries the legible reason. */
export interface CapacityCheck {
  ok: boolean;
  reason?: string;
}

export abstract class HoldingWarren extends Warren {
  static fieldMeta: FieldMeta = {
    plan: { persistent: true, authorable: true },
    capacityKey: { persistent: true, authorable: true },
    defaultCapacity: { persistent: true, authorable: true },
    parentExtent: { persistent: true, authorable: true },
  };

  /** The authored plat plan data (D13) — parsed on read. Null = a
   *  default linear plan. */
  public plan: Record<string, unknown> | null = null;

  /** The AppSettings key the operator's capacity dial lives under
   *  (D10 — e.g. `hinkley-hills.lotCap`). Empty = no dial, use the
   *  authored default. */
  public capacityKey: string = '';

  /** The shipped capacity default the dial falls back to. */
  public defaultCapacity: number = 40;

  /** The parcel extent holdings subdivide under (the durable slot
   *  set's parent). Subclasses may override the getter instead of
   *  authoring the field. */
  public parentExtent: string = '';

  /** Live holdings by parcel-extent key (the true Warren members). */
  private _holdingsByKey: Map<string, MemberStuff> = new Map();
  /** Live circulation rooms by plan node id (outside `_members`). */
  private _circulationByNode: Map<string, MemberStuff> = new Map();
  /** Live entry edges (doors / gates) by holding key. */
  private _entriesByKey: Map<string, Exit> = new Map();
  /** Provisioned holding keys (durable slot set, cached sync). */
  private _provisionedKeys: Set<string> = new Set();
  /** Plan nodes with (or on the way to) a provisioned holding. */
  private _provisionedNodes: Set<string> = new Set();
  /** key → the holding's lock keyway (sync lock identity cache). */
  private _keywayByHolding: Map<string, string> = new Map();

  // ── authored-field surface ──────────────────────────────────────

  public getParentExtent(): string {
    return this.parentExtent;
  }

  public setParentExtent(value: string): void {
    this.parentExtent = value;
  }

  public getCapacityKey(): string {
    return this.capacityKey;
  }

  public setCapacityKey(value: string): void {
    this.capacityKey = value;
  }

  public getDefaultCapacity(): number {
    return this.defaultCapacity;
  }

  public setDefaultCapacity(value: number): void {
    this.defaultCapacity = Math.max(0, value);
  }

  public getPlan(): Record<string, unknown> | null {
    return this.plan;
  }

  public setPlan(value: Record<string, unknown> | null): void {
    this.plan = value;
  }

  /**
   * The parsed plat plan. Re-parsed per read (cheap, and the runtime
   * frontage dial may move between reads).
   */
  public getPlatPlan(): PlatPlan {
    return PlatPlan.parse(this.plan, {
      frontagesOverride: this.frontagesDial(),
    });
  }

  /**
   * The runtime override for the plan's per-node frontage count, or
   * null to use the authored value (the dorm reads its
   * `dorm.roomsPerFloor` dial here).
   */
  protected frontagesDial(): number | null {
    return null;
  }

  // ── capacity (D10) ──────────────────────────────────────────────

  /**
   * The operator's capacity: the runtime dial when set (a positive
   * number under `capacityKey` in AppSettings), else the authored
   * default. Reads never throw — a cold settings cache (unit tests)
   * falls back to the authored default.
   */
  public capacity(): number {
    if (this.capacityKey) {
      try {
        const raw = AppApi.setting(this.capacityKey);
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) return n;
      } catch {
        /* cache not warmed — authored default below */
      }
    }
    return this.defaultCapacity;
  }

  /** How many holdings the durable slot set already carries. */
  public provisionedCount(): number {
    return this._provisionedKeys.size;
  }

  /**
   * The provision-time gate: refuse at the operator's cap, with the
   * reason named (the acceptance's refuse-then-raise-then-admit path).
   */
  public assertBelowCap(): CapacityCheck {
    const cap = this.capacity();
    if (this._provisionedKeys.size >= cap) {
      return {
        ok: false,
        reason:
          `at capacity: ${this._provisionedKeys.size} of ${cap} holdings ` +
          `are taken` +
          (this.capacityKey
            ? ` (the operator's \`${this.capacityKey}\` dial)`
            : ''),
      };
    }
    return { ok: true };
  }

  // ── the durable-slot caches ─────────────────────────────────────

  /**
   * Rebuild the sync reachability + keyway caches from the durable
   * slot set (warm, and whenever provisioning changes).
   */
  public async refreshProvisioned(): Promise<void> {
    const parent = this.getParentExtent();
    const keys = new Set<string>();
    const nodes = new Set<string>();
    const keyways = new Map<string, string>();
    if (parent) {
      const plan = this.getPlatPlan();
      for (const child of await ParcelApi.childParcelsOf(parent)) {
        const extent = child.getExtent();
        keys.add(extent);
        const node = plan.nodeOfSlot(leafOf(extent));
        if (node) for (const r of plan.routeOf(node)) nodes.add(r);
        const keyway = child.getKeyway();
        if (keyway) keyways.set(extent, keyway);
      }
    }
    this._provisionedKeys = keys;
    this._provisionedNodes = nodes;
    this._keywayByHolding = keyways;
  }

  /**
   * The holding's lock keyway, or null — the entry edge's synchronous
   * lock identity. An empty/absent keyway is an unprovisioned /
   * re-keyed holding no key opens.
   */
  public keywayOf(key: string): string | null {
    return this._keywayByHolding.get(key) ?? null;
  }

  /**
   * Whether a circulation node is passable — true when a provisioned
   * holding sits on it or beyond it on its route (the dorm's
   * floor-reachability, generalized; an unbuilt road reach reads
   * honestly as impassable).
   */
  public nodeReachable(nodeId: string): boolean {
    return this._provisionedNodes.has(nodeId);
  }

  // ── tier 1: holdings ────────────────────────────────────────────

  /**
   * The live holding for `key`, stood up if needed: cache → the
   * consumer's whole stand-up (`standUpHolding` — clone/programme +
   * restore, in the consumer's own order) → wire (the Warren
   * `wireHubExit` hook, which holding consumers override) → cache.
   * Returns the holding's ENTRY room — for a plain-room holding that
   * is the holding itself; a programme-shaped holding (a warren one
   * level down, D16) answers its own entry.
   */
  public async admit(key: string): Promise<MemberStuff> {
    const cached = this._holdingsByKey.get(key);
    if (cached && !cached.isDestroyed()) return this.entryRoomOf(cached);
    const holding = await this.standUpHolding(key);
    await this.wireHubExit(holding);
    this._holdingsByKey.set(key, holding);
    return this.entryRoomOf(holding);
  }

  /**
   * The room a mover LANDS in for a holding: a programme-shaped
   * holding's own entry (duck-typed — the programme class ships in the
   * residence pack and the kernel imports no pack code), else the
   * holding itself.
   */
  protected entryRoomOf(holding: MemberStuff): MemberStuff {
    const entry = (
      holding as unknown as { entryRoom?: () => MemberStuff | null }
    ).entryRoom;
    if (typeof entry === 'function') {
      const room = entry.call(holding) as MemberStuff | null;
      if (room && !room.isDestroyed()) return room;
    }
    return holding;
  }

  /**
   * A holding's population, holding-shaped: a warren-shaped holding (a
   * programme) aggregates over its member rooms — the D16
   * whole-holding sleep witness — while a plain room counts its own
   * interactive occupants.
   */
  protected override occupantsOf(m: MemberStuff): (Stuff & Container)[] {
    if (m instanceof Warren) {
      const out: (Stuff & Container)[] = [];
      for (const room of (m as unknown as Warren).getMembers()) {
        out.push(...super.occupantsOf(room as MemberStuff));
      }
      return out;
    }
    return super.occupantsOf(m);
  }

  /**
   * Re-enter a keyed room from a captured placement: find the resident
   * institution whose parent extent prefixes the key (the boot roster —
   * every institution boots as a producer), admit the holding, and
   * resolve the specific room. The log-out-in-your-yard seam
   * (residences D16); null when no institution covers the key.
   */
  public static async admitFor(
    key: string,
  ): Promise<MemberStuff | null> {
    const warrens = MqlApi.resolveMany('world:[class.HoldingWarren]', {
      commandGiver: null,
      scope: 'world',
    }).stuff;
    for (const w of warrens) {
      if (!(w instanceof HoldingWarren)) continue;
      const parent = w.getParentExtent();
      if (!parent || !key.startsWith(parent + '/')) continue;
      const rest = key.slice(parent.length + 1);
      const holdingKey = `${parent}/${rest.split('/')[0]!}`;
      await w.admit(holdingKey);
      const holding = w.holdingFor(holdingKey);
      if (!holding) continue;
      const byKey = (
        holding as unknown as {
          roomForKey?: (k: string) => MemberStuff | null;
        }
      ).roomForKey;
      if (typeof byKey === 'function') {
        const room = byKey.call(holding, key) as MemberStuff | null;
        if (room && !room.isDestroyed()) return room;
      }
      return w.entryRoomOf(holding);
    }
    return null;
  }

  /** The live holding for a key (if standing), or null. */
  public holdingFor(key: string): MemberStuff | null {
    const h = this._holdingsByKey.get(key);
    return h && !h.isDestroyed() ? h : null;
  }

  /**
   * Tear a holding down (end-lease / end-title). `revert` marks the
   * live holding so `shouldPersist()` goes false (no recapture races
   * the record delete). Pokes `reconcile` so now-empty circulation can
   * reap.
   */
  public async dropHolding(
    key: string,
    opts: { revert?: boolean } = {},
  ): Promise<void> {
    this.removeEntry(key);
    const holding = this._holdingsByKey.get(key);
    if (holding && !holding.isDestroyed()) {
      if (opts.revert && MixinApi.isPersistable(holding)) {
        (holding as unknown as Persistable).markForRevert();
      }
      this.teardownHolding(key, holding);
    } else {
      this._holdingsByKey.delete(key);
    }
    await this.reconcile();
  }

  // ── tier 2: circulation ─────────────────────────────────────────

  /**
   * The live circulation room for a plan node, built if needed.
   * Returns null when the node is unreachable (no provisioned holding
   * on it or beyond). An **authored** node resolves its singleton room;
   * a minted node clones `circulationTemplateFor(node)`. Either way the
   * consumer's `wireCirculationNode` wires it, and every provisioned
   * holding on the node gets its entry edge.
   */
  public async ensureNode(nodeId: string): Promise<MemberStuff | null> {
    const cached = this._circulationByNode.get(nodeId);
    if (cached && !cached.isDestroyed()) return cached;
    if (!this.nodeReachable(nodeId)) return null;

    const plan = this.getPlatPlan();
    let room: MemberStuff;
    const authoredPath = plan.authoredPathOf(nodeId);
    if (authoredPath) {
      room = await StuffApi.singleton<MemberStuff>(authoredPath);
    } else {
      const template = this.circulationTemplateFor(nodeId);
      if (!template) return null;
      room = await StuffApi.clone<MemberStuff>(template);
    }
    this._circulationByNode.set(nodeId, room);
    await this.wireCirculationNode(nodeId, room);

    // Entry edges for every provisioned holding on this node.
    for (const key of this._provisionedKeys) {
      if (plan.nodeOfSlot(leafOf(key)) === nodeId) {
        await this.ensureEntry(key);
      }
    }
    return room;
  }

  /** The live circulation room for a node (if standing), or null. */
  public circulationForNode(nodeId: string): MemberStuff | null {
    const c = this._circulationByNode.get(nodeId);
    return c && !c.isDestroyed() ? c : null;
  }

  /**
   * Ensure the entry edge (door / gate) for `key` hangs on its node's
   * LIVE circulation room. Called by `ensureNode` for every holding on
   * the node, and by provisioning so a holding added to an already-live
   * node gets its edge immediately. No-op when the node isn't live.
   */
  public async ensureEntry(key: string): Promise<void> {
    const existing = this._entriesByKey.get(key);
    if (existing && !existing.isDestroyed()) return;
    const node = this.getPlatPlan().nodeOfSlot(leafOf(key));
    if (!node) return;
    const circulation = this.circulationForNode(node);
    if (!circulation || !MixinApi.isExitable(circulation)) return;
    const edge = await this.entryEdgeFor(
      key,
      circulation as ExitableContainer,
    );
    if (edge) this._entriesByKey.set(key, edge);
  }

  /** The entry edge for a holding (if hanging), or null. */
  public entryFor(key: string): Exit | null {
    const e = this._entriesByKey.get(key);
    return e && !e.isDestroyed() ? e : null;
  }

  // ── the reap invariant ──────────────────────────────────────────

  /**
   * Population-reactive reconcile: holdings dorm-when-empty (capture
   * then reap; re-`admit` re-materializes), then circulation reaps
   * **outside-in** — a node reaps only when it holds no live holding
   * AND no live node sits beyond it on any route, keeping the graph
   * contiguous back to the authored entrance. Authored nodes are never
   * reaped (they are content, not clones).
   */
  protected async reconcile(): Promise<void> {
    // 1. Holding dormancy — an empty holding captures + reaps.
    for (const [key, holding] of [...this._holdingsByKey]) {
      if (holding.isDestroyed()) {
        this._holdingsByKey.delete(key);
        continue;
      }
      if (this.occupantsOf(holding).length === 0) {
        await this.captureHoldingForDormancy(key, holding);
        this.teardownHolding(key, holding);
      }
    }

    // 2. Circulation reap, outside-in (deepest routes first).
    const plan = this.getPlatPlan();
    const liveNodes = () =>
      [...this._circulationByNode.entries()].filter(
        ([, room]) => !room.isDestroyed(),
      );
    const nodes = liveNodes()
      .map(([id]) => id)
      .sort((a, b) => plan.routeOf(b).length - plan.routeOf(a).length);
    for (const nodeId of nodes) {
      const room = this._circulationByNode.get(nodeId);
      if (!room || room.isDestroyed()) {
        this._circulationByNode.delete(nodeId);
        continue;
      }
      if (plan.isAuthored(nodeId)) continue; // content is never reaped
      const holdingHere = this.hasLiveHoldingOnNode(nodeId, plan);
      const nodeBeyond = liveNodes().some(
        ([other]) =>
          other !== nodeId && plan.routeOf(other).includes(nodeId),
      );
      if (!holdingHere && !nodeBeyond) {
        StuffApi.destruct(room as unknown as Stuff);
        this._circulationByNode.delete(nodeId);
      }
    }
  }

  /**
   * Teardown (HMR / shutdown): every member (base), then the
   * out-of-`_members` circulation + entries, and clear the maps.
   */
  public override teardown(): void {
    super.teardown();
    for (const edge of this._entriesByKey.values()) {
      if (!edge.isDestroyed()) StuffApi.destruct(edge as unknown as Stuff);
    }
    for (const room of this._circulationByNode.values()) {
      if (!room.isDestroyed()) {
        // Authored circulation (a static plan's street, the bespoke
        // lane) is CONTENT — it stands outside the warren's lifecycle.
        const path = room.getTemplatePath();
        const plan = this.getPlatPlan();
        const authored = [...this._circulationByNode.entries()].some(
          ([id, r]) => r === room && plan.isAuthored(id),
        );
        if (!authored || !path) {
          StuffApi.destruct(room as unknown as Stuff);
        }
      }
    }
    this._holdingsByKey.clear();
    this._circulationByNode.clear();
    this._entriesByKey.clear();
    this._provisionedKeys.clear();
    this._provisionedNodes.clear();
    this._keywayByHolding.clear();
  }

  // ── shared internals ────────────────────────────────────────────

  /**
   * The dormancy capture, holding-shaped: a programme-shaped holding
   * captures WHOLE (every room's record + its own — D16's
   * sleeps-and-wakes-whole; duck-typed for the pack-shipped programme),
   * a plain persistable room captures itself.
   */
  protected async captureHoldingForDormancy(
    key: string,
    holding: MemberStuff,
  ): Promise<void> {
    const whole = (
      holding as unknown as { captureAll?: () => Promise<void> }
    ).captureAll;
    if (typeof whole === 'function') {
      await whole.call(holding);
      return;
    }
    if (MixinApi.isPersistable(holding)) {
      await PersistableApi.capture(holding, key); // no-op if markForRevert
    }
  }

  protected teardownHolding(key: string, holding: MemberStuff): void {
    this.removeMember(holding); // clears the WarrenMember back-ref
    // The caller has already persisted (reconcile captures first) or is
    // deleting the record (end-lease); mark-for-revert so the
    // destruct-time capture backstop doesn't redundantly re-capture a
    // holding whose contents are mid-evacuation. (A non-persistable
    // holding — a synthetic fixture — has no backstop to silence.)
    if (MixinApi.isPersistable(holding)) {
      (holding as unknown as Persistable).markForRevert();
    }
    // A warren-shaped holding (a programme) tears its ROOMS down with it
    // — destruct alone runs only mixin cleanups, never a base class's
    // teardown, and a leaked room would collide the unique-key guard on
    // the next admit. Marked first, so the rooms skip their backstop.
    if (holding instanceof Warren) {
      (holding as unknown as Warren).teardown();
    }
    StuffApi.destruct(holding as unknown as Stuff);
    this._holdingsByKey.delete(key);
  }

  protected removeEntry(key: string): void {
    const edge = this._entriesByKey.get(key);
    this._entriesByKey.delete(key);
    if (!edge || edge.isDestroyed()) return;
    const source = edge.getSource();
    if (MixinApi.isExitable(source)) source.removeExit(edge.getDirection());
    StuffApi.destruct(edge as unknown as Stuff);
  }

  protected hasLiveHoldingOnNode(nodeId: string, plan: PlatPlan): boolean {
    for (const [key, holding] of this._holdingsByKey) {
      if (holding.isDestroyed()) continue;
      if (plan.nodeOfSlot(leafOf(key)) === nodeId) return true;
    }
    return false;
  }

  /** The provisioned keys whose slot sits on `nodeId`. */
  protected provisionedKeysOnNode(nodeId: string): string[] {
    const plan = this.getPlatPlan();
    return [...this._provisionedKeys].filter(
      (k) => plan.nodeOfSlot(leafOf(k)) === nodeId,
    );
  }

  // ── policy hooks ────────────────────────────────────────────────

  /**
   * Stand one holding up, whole — clone + keyed restore (the dorm), or
   * a programme admit (an apartment unit, a house). The consumer owns
   * the internal order; the base caches and wires afterwards.
   */
  protected abstract standUpHolding(key: string): Promise<MemberStuff>;

  /** The template a MINTED circulation node clones from, or null when
   *  this institution's circulation is authored-only. */
  protected abstract circulationTemplateFor(nodeId: string): string | null;

  /** Wire a (fresh) circulation room into the graph — stairs down/up,
   *  the road exit toward the entrance, the onward stub. */
  protected abstract wireCirculationNode(
    nodeId: string,
    room: MemberStuff,
  ): Promise<void>;

  /**
   * Create + hang the entry edge (door / gate) for a holding on its
   * circulation room, returning it — or null when the consumer decides
   * no edge applies. Idempotence by direction is the consumer's (it
   * sees the live room).
   */
  protected abstract entryEdgeFor(
    key: string,
    circulation: ExitableContainer,
  ): Promise<Exit | null>;
}

/** The last path segment — the slot leaf of a parcel-extent key. */
function leafOf(extent: string): string {
  return extent.slice(extent.lastIndexOf('/') + 1);
}

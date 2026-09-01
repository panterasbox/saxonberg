/**
 * PlatPlan — **how a holding institution's map grows**: authored data
 * mapping slot → circulation node (residences D13). Layout is data on
 * the institution row (`plan:`), never code; the operator capacity dial
 * (D10) is the plan's *how much*, the plan is the *how*.
 *
 * Three shapes ship:
 *
 * - **static** — circulation fully authored, holdings minted. `nodes:`
 *   enumerates authored rooms (each `{ key, path, slots }`); nothing is
 *   ever cloned for circulation. A bespoke hand-made neighborhood keeps
 *   its streets and only mints homes.
 * - **linear** — nodes extend on demand: node = index (the dorm's floor
 *   math — slot `f<floor>-r<pos>`, `frontagesPerNode` rooms per floor).
 *   A road is the same math rotated.
 * - **branched** — node = (road, segment): multiple roads, courts,
 *   culs-de-sac. Slots are `lot-<n>`, numbered road-by-road in declared
 *   order, `frontagesPerSegment` per segment; a road may branch off
 *   another (`branchesFrom`), and a segment may be **authored** (the
 *   bespoke lane a subdivision grew out of — an authored node inside a
 *   generative plan).
 *
 * A node id is `"<road>:<segment>"` (`main` for the linear/static
 * spine). `routeOf(node)` is the node's path back to the authored
 * entrance — the contiguity spine the reap invariant walks (a node
 * never reaps while a live node sits beyond it).
 *
 * A named value-object (`Light`/`Quantity` family), parsed once from the
 * row's `plan:` field; immutable; throws on malformed data at parse so
 * a typo fails at install, not mid-provision.
 */

export type PlanShape = 'static' | 'linear' | 'branched';

/** One road of a branched plan (parsed). */
interface PlanRoad {
  key: string;
  segments: number;
  frontagesPerSegment: number;
  /** The planar cardinal the road RUNS in, away from the entrance. */
  heading: string;
  branchesFrom: { road: string; segment: number; direction: string } | null;
  /** Authored circulation rooms by segment number (template paths). */
  authored: Map<number, string>;
}

/** One authored node of a static plan (parsed). */
interface StaticNode {
  key: string;
  path: string;
  slots: string[];
}

const LINEAR_ROAD = 'main';

/** The four a road may run along. A lane on a diagonal is not a thing. */
const PLANAR = ['north', 'south', 'east', 'west'] as const;

/**
 * ⭐ **The gate ring** — which way a lot's gate faces, per road heading.
 *
 * This is the answer to *why is a gate not just `north`?* A reach of
 * lane carries several frontages, so one compass point cannot serve them
 * all; the gate used to be directioned by the lot LEAF (`lot-7`, what is
 * stencilled on the stake), which a grid refuses inside its own zone —
 * which is why the lots zone had to exist.
 *
 * But a road runs along ONE axis, which leaves the other six planar
 * points free, and that is how a street actually works: your house is on
 * the north side of the lane. So the ring is, in order, **right, left,
 * ahead-right, ahead-left, behind-right, behind-left** of somebody
 * walking the road in its heading. Frontage 1 and 2 face each other
 * across the road; 3 and 4 sit further up; 5 and 6 further back.
 *
 * Consequences worth knowing:
 *   - a gate is CARDINAL, so it is legal inside one zone and has a known
 *     inverse — `go north`, and `south` brings you back out;
 *   - the axis itself is excluded, so a gate can never collide with the
 *     road's own onward/back exits;
 *   - **six frontages per reach is the ceiling**, and a reach that a road
 *     branches off has one fewer. Both are checked at parse.
 */
const GATE_RING: Readonly<Record<string, readonly string[]>> = {
  west: ['north', 'south', 'northwest', 'southwest', 'northeast', 'southeast'],
  east: ['south', 'north', 'southeast', 'northeast', 'southwest', 'northwest'],
  north: ['east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'],
  south: ['west', 'east', 'southwest', 'southeast', 'northwest', 'northeast'],
};

export class PlatPlan {
  private constructor(
    public readonly shape: PlanShape,
    private readonly frontagesPerNode: number,
    private readonly roads: PlanRoad[],
    private readonly staticNodes: StaticNode[],
    /** The linear slot grammar's middle letter — `r` (the dorm's
     *  `f<n>-r<p>`) or `u` (a unit building's `f<n>-u<p>`; a distinct
     *  leaf so dorm tooling never misreads a unit extent). */
    private readonly frontageLeaf: string = 'r',
  ) {}

  // ── parsing ─────────────────────────────────────────────────────

  /**
   * Parse a row's `plan:` data. `frontagesOverride` lets the consumer
   * substitute a runtime dial for the authored per-node frontage count
   * (the dorm's `dorm.roomsPerFloor` — D10's graduated knob).
   */
  static parse(
    data: Record<string, unknown> | null | undefined,
    opts: { frontagesOverride?: number | null } = {},
  ): PlatPlan {
    const shape = (data?.shape ?? 'linear') as PlanShape;
    if (shape === 'linear') {
      const authored = num(data?.frontagesPerNode, 12);
      const frontages = opts.frontagesOverride ?? authored;
      const leaf = data?.frontageLeaf === 'u' ? 'u' : 'r';
      return new PlatPlan(
        'linear',
        mustPositive(frontages, 'frontagesPerNode'),
        [],
        [],
        leaf,
      );
    }
    if (shape === 'static') {
      const raw = data?.nodes;
      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('PlatPlan: a static plan requires nodes[]');
      }
      const nodes: StaticNode[] = raw.map((n, i) => {
        const o = n as Record<string, unknown>;
        if (typeof o.key !== 'string' || typeof o.path !== 'string') {
          throw new Error(`PlatPlan: static node ${i} needs key + path`);
        }
        const slots = Array.isArray(o.slots) ? (o.slots as string[]) : [];
        return { key: o.key, path: o.path, slots };
      });
      return new PlatPlan('static', 0, [], nodes);
    }
    if (shape === 'branched') {
      const raw = data?.roads;
      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('PlatPlan: a branched plan requires roads[]');
      }
      const roads: PlanRoad[] = raw.map((r, i) => {
        const o = r as Record<string, unknown>;
        if (typeof o.key !== 'string') {
          throw new Error(`PlatPlan: road ${i} needs a key`);
        }
        const branches = o.branchesFrom as Record<string, unknown> | undefined;
        const authored = new Map<number, string>();
        if (o.authored && typeof o.authored === 'object') {
          for (const [seg, path] of Object.entries(o.authored as Record<string, unknown>)) {
            if (typeof path === 'string') authored.set(Number(seg), path);
          }
        }
        const branchDir = branches
          ? mustPlanar(
              branches.direction === undefined
                ? 'north'
                : String(branches.direction),
              `road ${String(o.key)} branchesFrom.direction`,
            )
          : null;
        return {
          key: o.key,
          // A road runs the way it leaves its parent unless it says
          // otherwise; the first road runs `west` (up the slope, the
          // Hinkley convention) unless it says otherwise.
          heading: mustPlanar(
            o.heading === undefined
              ? (branchDir ?? 'west')
              : String(o.heading),
            `road ${String(o.key)} heading`,
          ),
          segments: mustPositive(num(o.segments, 1), `road ${o.key} segments`),
          frontagesPerSegment: mustPositive(
            num(o.frontagesPerSegment, 4),
            `road ${o.key} frontagesPerSegment`,
          ),
          branchesFrom: branches
            ? {
                road: String(branches.road),
                segment: num(branches.segment, 1),
                // ⭐ CARDINAL, and authored. A court hangs off a lane to
                // the north or the south — that is a fact about the plat,
                // so the plat says it. It used to be derived from the road
                // KEY (`hinkley-court`), which is not a direction at all:
                // a grid refuses a non-cardinal exit to its own zone, so
                // the first lot on a branch road threw as it was wired.
                // Cardinal also means the edge has a known inverse, which
                // is the whole point of the rule.
                direction: branchDir!,
              }
            : null,
          authored,
        };
      });
      // Validate branch references (a branch must name an earlier road).
      const seen = new Set<string>();
      for (const r of roads) {
        if (r.branchesFrom && !seen.has(r.branchesFrom.road)) {
          throw new Error(
            `PlatPlan: road '${r.key}' branches from '${r.branchesFrom.road}', which is not declared before it`,
          );
        }
        seen.add(r.key);
      }
      // ⭐ The gate ring must actually FIT. A reach has six free points
      // (the road's own axis is spoken for), one fewer for every road
      // that branches off it — so a plat asking for more frontages than
      // that is unbuildable, and says so at install rather than running
      // out of compass on a sale.
      const plan = new PlatPlan('branched', 0, roads, []);
      for (const r of roads) {
        for (let seg = 1; seg <= r.segments; seg++) {
          const room = plan.ringFor(r, seg).length;
          if (r.frontagesPerSegment > room) {
            throw new Error(
              `PlatPlan: road '${r.key}' segment ${seg} has ` +
                `${r.frontagesPerSegment} frontages but only ${room} gate ` +
                `direction(s) free (heading '${r.heading}'` +
                (room < 6 ? ', less the road branching off it' : '') +
                `); a reach holds at most 6`,
            );
          }
        }
      }
      return plan;
    }
    throw new Error(`PlatPlan: unknown shape '${String(shape)}'`);
  }

  // ── the slot ↔ node mapping ─────────────────────────────────────

  /**
   * The circulation node a slot leaf sits on, or null for a leaf the
   * plan does not recognize. Linear reads the dorm grammar
   * (`f<floor>-r<pos>` → floor); static/branched read `lot-<n>` (static
   * additionally accepts any leaf listed on an authored node).
   */
  nodeOfSlot(slotLeaf: string): string | null {
    if (this.shape === 'linear') {
      const m = new RegExp(`^f(\\d+)-${this.frontageLeaf}(\\d+)$`).exec(
        slotLeaf,
      );
      if (!m) return null;
      const pos = Number(m[2]);
      if (pos < 1 || pos > this.frontagesPerNode) return null;
      return `${LINEAR_ROAD}:${m[1]}`;
    }
    if (this.shape === 'static') {
      for (const n of this.staticNodes) {
        if (n.slots.includes(slotLeaf)) return `${n.key}:1`;
      }
      return null;
    }
    const m = /^lot-(\d+)$/.exec(slotLeaf);
    if (!m) return null;
    let n = Number(m[1]);
    for (const road of this.roads) {
      const cap = road.segments * road.frontagesPerSegment;
      if (n <= cap) {
        const segment = Math.ceil(n / road.frontagesPerSegment);
        return `${road.key}:${segment}`;
      }
      n -= cap;
    }
    return null;
  }

  /**
   * The next unclaimed slot leaf, in plan order, or null at `cap` (the
   * operator capacity — D10's dial; the plan's own frontage count also
   * bounds a branched/static plan).
   */
  nextFreeSlot(taken: ReadonlySet<string>, cap: number): string | null {
    let count = 0;
    if (this.shape === 'linear') {
      for (let floor = 1; ; floor++) {
        for (let pos = 1; pos <= this.frontagesPerNode; pos++) {
          if (count >= cap) return null;
          count += 1;
          const leaf = `f${floor}-${this.frontageLeaf}${pos}`;
          if (!taken.has(leaf)) return leaf;
        }
      }
    }
    if (this.shape === 'static') {
      for (const node of this.staticNodes) {
        for (const leaf of node.slots) {
          if (count >= cap) return null;
          count += 1;
          if (!taken.has(leaf)) return leaf;
        }
      }
      return null;
    }
    let n = 0;
    for (const road of this.roads) {
      for (let i = 0; i < road.segments * road.frontagesPerSegment; i++) {
        n += 1;
        if (count >= cap) return null;
        count += 1;
        const leaf = `lot-${n}`;
        if (!taken.has(leaf)) return leaf;
      }
    }
    return null;
  }

  /** Every node id, entrance-out (road-by-road, segment ascending).
   *  A linear plan is unbounded; it enumerates up to `maxNodes`. */
  nodesInOrder(maxNodes = 100): string[] {
    if (this.shape === 'linear') {
      const out: string[] = [];
      for (let i = 1; i <= maxNodes; i++) out.push(`${LINEAR_ROAD}:${i}`);
      return out;
    }
    if (this.shape === 'static') {
      return this.staticNodes.map((n) => `${n.key}:1`);
    }
    const out: string[] = [];
    for (const road of this.roads) {
      for (let s = 1; s <= road.segments; s++) out.push(`${road.key}:${s}`);
    }
    return out;
  }

  /** Whether the node's circulation room is AUTHORED content (never
   *  minted, never reaped by the warren). Static plans are all-authored. */
  isAuthored(nodeId: string): boolean {
    return this.authoredPathOf(nodeId) !== null;
  }

  /** The authored circulation room's template path for a node, or null
   *  (a minted node). */
  authoredPathOf(nodeId: string): string | null {
    if (this.shape === 'static') {
      const node = this.staticNodes.find((n) => `${n.key}:1` === nodeId);
      return node?.path ?? null;
    }
    if (this.shape === 'branched') {
      const { road, segment } = this.parseNode(nodeId);
      const r = this.roads.find((x) => x.key === road);
      return r?.authored.get(segment) ?? null;
    }
    return null;
  }

  /**
   * The node's path back to the authored entrance, INCLUSIVE of the
   * node itself — `[entrance, …, node]`. The contiguity spine: a
   * circulation node is passable/unreapable while any provisioned
   * holding's route passes through it.
   */
  routeOf(nodeId: string): string[] {
    if (this.shape === 'linear') {
      const { segment } = this.parseNode(nodeId);
      const out: string[] = [];
      for (let i = 1; i <= segment; i++) out.push(`${LINEAR_ROAD}:${i}`);
      return out;
    }
    if (this.shape === 'static') {
      // Authored circulation carries its own connectivity; each node is
      // its own route (nothing is ever minted or reaped).
      return [nodeId];
    }
    const { road, segment } = this.parseNode(nodeId);
    const r = this.roads.find((x) => x.key === road);
    if (!r) return [nodeId];
    const prefix = r.branchesFrom
      ? this.routeOf(`${r.branchesFrom.road}:${r.branchesFrom.segment}`)
      : [];
    const out = [...prefix];
    for (let s = 1; s <= segment; s++) out.push(`${road}:${s}`);
    return out;
  }

  /** Whether `nodeId` is passable given the provisioned node set: a
   *  node is live iff some provisioned node's route passes through it. */
  reachableGiven(provisioned: ReadonlySet<string>, nodeId: string): boolean {
    if (this.shape === 'static') return true; // authored streets always stand
    for (const p of provisioned) {
      if (this.routeOf(p).includes(nodeId)) return true;
    }
    return false;
  }

  /** The node id a minted node hangs off (its predecessor on the route),
   *  or null for a route head. */
  predecessorOf(nodeId: string): string | null {
    const route = this.routeOf(nodeId);
    const i = route.indexOf(nodeId);
    return i > 0 ? route[i - 1]! : null;
  }

  /**
   * The CARDINAL direction a node hangs off its predecessor in, for
   * wiring the edge between them.
   *
   * Along a road the reaches run in line — `west` onward, `east` back
   * toward the entrance. At a FORK the direction is the plat's, authored
   * on `branchesFrom.direction`: a court leaves its lane to the north or
   * the south, and saying which is what makes the edge cardinal (and so
   * legal inside one zone, and so reversible).
   */
  onwardDirectionOf(nodeId: string): string {
    const { road, segment } = this.parseNode(nodeId);
    const r = this.roads.find((x) => x.key === road);
    if (segment === 1 && r?.branchesFrom) return r.branchesFrom.direction;
    return r?.heading ?? 'west';
  }

  /**
   * ⭐ The CARDINAL a lot's gate faces — *which side of the road your
   * house is on*.
   *
   * Derived, never stored: the slot's road gives the heading, the
   * heading gives the ring, the slot's position within its reach indexes
   * it, and any road branching off that reach has its direction removed
   * first (so a gate can never land on the mouth of the court). Pure
   * function of the plan, so it is the same answer on every boot — which
   * it has to be, because a sold lot's gate is re-hung from it at
   * standup.
   *
   * `null` where the plan has no gate ring to speak of (linear + static
   * name their own edges) or the leaf is not one of this plan's.
   */
  gateDirectionOfSlot(slotLeaf: string): string | null {
    if (this.shape !== 'branched') return null;
    const m = /^lot-(\d+)$/.exec(slotLeaf);
    if (!m) return null;
    let n = Number(m[1]);
    for (const road of this.roads) {
      const cap = road.segments * road.frontagesPerSegment;
      if (n <= cap) {
        const segment = Math.ceil(n / road.frontagesPerSegment);
        const index = (n - 1) % road.frontagesPerSegment;
        return this.ringFor(road, segment)[index] ?? null;
      }
      n -= cap;
    }
    return null;
  }

  /** The ring for one reach: the heading's ring, less any branch mouth
   *  that already leaves this node. */
  private ringFor(road: PlanRoad, segment: number): readonly string[] {
    const ring = GATE_RING[road.heading] ?? [];
    const taken = new Set(
      this.roads
        .filter(
          (r) =>
            r.branchesFrom &&
            r.branchesFrom.road === road.key &&
            r.branchesFrom.segment === segment,
        )
        .map((r) => r.branchesFrom!.direction),
    );
    return taken.size === 0 ? ring : ring.filter((d) => !taken.has(d));
  }

  private parseNode(nodeId: string): { road: string; segment: number } {
    const i = nodeId.lastIndexOf(':');
    return { road: nodeId.slice(0, i), segment: Number(nodeId.slice(i + 1)) };
  }
}

function num(v: unknown, dflt: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : dflt;
}

/**
 * A road heading and a branch direction must be one of the four PLANAR
 * cardinals. Cardinal because the grid refuses anything else into its
 * own zone; planar because a road that runs `up`, or on a diagonal, has
 * no coherent left and right and so no gate ring. Checked at PARSE, so a
 * typo fails at install rather than on the sale of the ninth lot.
 */
function mustPlanar(d: string, what: string): string {
  if (!(PLANAR as readonly string[]).includes(d)) {
    throw new Error(
      `PlatPlan: ${what} must be one of ${PLANAR.join('/')} (got '${d}')`,
    );
  }
  return d;
}

function mustPositive(n: number, what: string): number {
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`PlatPlan: ${what} must be a positive number`);
  }
  return Math.floor(n);
}

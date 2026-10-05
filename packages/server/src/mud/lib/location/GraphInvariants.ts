/**
 * GraphInvariants — the seven things that must be true of the world's
 * shape, as a pure function of plain node and edge data.
 *
 * ⭐⭐ **One implementation, two callers.** `check-location-graph` runs
 * it over the ROWS on disk (so an author is told before any restart, and
 * before the graph exists at all), and `NavigationLogic.checkGraph`
 * runs it over the projected nodes at runtime (so a CMS save answers in
 * the same request). Two copies of these rules would drift, and the
 * drift would be invisible: a gate and a runtime check disagreeing about
 * what a dangling exit is reads as neither of them being wrong.
 *
 * An **instance value class** (`new GraphInvariants(nodes).findings()`)
 * in the `Light` / `Quantity` category — no statics, so `lint:lib-statics`
 * does not move, and nothing here reads the world. It takes data and
 * returns findings; `DiagnosticApi` and the lint decide what to do with
 * them.
 *
 * ⚠ Severities are not uniform, and the split is the design:
 *
 *   - **error** — the world is broken or will break. A destination that
 *     does not exist (today a boot crash), the SAME pair declared
 *     `bidirectional` from both sides (a double install), an edge from
 *     published content into unpublished content (a dangling edge
 *     waiting to happen).
 *   - **warning / info** — a question for the author, censused and
 *     ratcheted rather than refused. Plain asymmetry is the big one:
 *     one-way passages are legitimate content (a chute, a cliff), so the
 *     check reports the shape and the author says whether they meant it.
 *
 * ⭐ The publish check runs ONE WAY, deliberately:
 * `published → unpublished` is a dangling edge waiting to happen, while
 * `unpublished → published` is how a draft zone attaches to the live
 * world when it lands. Checking both directions would refuse the normal
 * way of building something.
 */

/** One edge out of a node, as either caller supplies it. */
export interface GraphEdge {
  /** The direction word the exit is installed under. */
  dir: string;
  /** The destination node's identity, or null for an unresolved path. */
  to: string | null;
  /** The authored destination path, when `to` does not resolve. */
  toPath?: string | null;
  /** Did the author declare this edge reciprocal? */
  bidirectional?: boolean;
  /** Did the author declare it deliberately one-way? */
  oneWay?: boolean;
  /** A frontage stub: the gate of a holding that is not a node. */
  slot?: string | null;
}

/** One node, as either caller supplies it. */
export interface GraphNode {
  /** The durable identity this node answers to. */
  identity: string;
  /** The row it came from — what an author is told to go and edit. */
  template: string;
  /** The zone it resolves into, or null when none does. */
  zone: string | null;
  /** The grouping address, when the content declares one. */
  address?: string | null;
  /** Is the parcel covering it published? Default true. */
  published?: boolean;
  /** Is this node an entrance to its zone (a crossing, a travel stop)? */
  entrance?: boolean;
  edges: GraphEdge[];
}

export type FindingSeverity = 'error' | 'warning' | 'info';

/** The rule names, closed — the lint's ratchet keys on them. */
export const GRAPH_RULES = [
  'dangling-destination',
  'bidirectional-both-sides',
  'published-into-unpublished',
  'cross-zone-one-sided',
  'unreachable-from-entrance',
  'asymmetric-edge',
  'destination-is-a-kind',
] as const;

export type GraphRule = (typeof GRAPH_RULES)[number];

export interface GraphFinding {
  rule: GraphRule;
  severity: FindingSeverity;
  /** The ROW an author would edit — never the identity. */
  path: string;
  dir?: string;
  detail: string;
}

/** Which rules are errors; everything else is a question for the author. */
const ERRORS: ReadonlySet<GraphRule> = new Set<GraphRule>([
  'dangling-destination',
  'bidirectional-both-sides',
  'published-into-unpublished',
]);

const SEVERITY: Partial<Record<GraphRule, FindingSeverity>> = {
  'cross-zone-one-sided': 'warning',
  'unreachable-from-entrance': 'warning',
  'destination-is-a-kind': 'warning',
  'asymmetric-edge': 'info',
};

export class GraphInvariants {
  readonly #nodes: readonly GraphNode[];
  readonly #byIdentity: Map<string, GraphNode>;
  /**
   * Identities that are KIND rows — a destination naming one would have
   * `StuffApi.singleton` mint a stray instance of a template that
   * describes a class of place rather than a place.
   */
  readonly #kinds: ReadonlySet<string>;

  constructor(
    nodes: readonly GraphNode[],
    kinds: ReadonlySet<string> = new Set<string>(),
  ) {
    this.#nodes = nodes;
    this.#byIdentity = new Map(nodes.map((n) => [n.identity, n]));
    this.#kinds = kinds;
  }

  /** Every finding, in rule order then path order. */
  findings(scope?: string): GraphFinding[] {
    const subject = scope
      ? this.#nodes.filter((n) => n.identity === scope || n.template === scope)
      : this.#nodes;
    const out: GraphFinding[] = [
      ...this.#dangling(subject),
      ...this.#reciprocity(subject),
      ...this.#publishWall(subject),
      ...this.#crossZone(subject),
      ...this.#kindDestinations(subject),
    ];
    // Reachability is a property of the WHOLE graph, so it is only
    // computed for a full pass — asking "is this room reachable" of one
    // row would have to walk everything anyway, and a scoped answer
    // would be a different (and misleading) question.
    if (!scope) out.push(...this.#reachability());
    return out.sort(
      (a, b) =>
        GRAPH_RULES.indexOf(a.rule) - GRAPH_RULES.indexOf(b.rule) ||
        a.path.localeCompare(b.path) ||
        (a.dir ?? '').localeCompare(b.dir ?? ''),
    );
  }

  #finding(
    rule: GraphRule,
    node: GraphNode,
    detail: string,
    dir?: string,
  ): GraphFinding {
    return {
      rule,
      severity: ERRORS.has(rule) ? 'error' : (SEVERITY[rule] ?? 'warning'),
      path: node.template,
      ...(dir === undefined ? {} : { dir }),
      detail,
    };
  }

  /** A destination that names nothing. Today this is a BOOT CRASH. */
  #dangling(subject: readonly GraphNode[]): GraphFinding[] {
    const out: GraphFinding[] = [];
    for (const node of subject) {
      for (const edge of node.edges) {
        if (edge.slot) continue; // a frontage stub points at a holding
        if (edge.to !== null) continue;
        if (!edge.toPath) continue; // no destination authored at all
        if (this.#byIdentity.has(edge.toPath)) continue;
        out.push(
          this.#finding(
            'dangling-destination',
            node,
            `exit ${edge.dir} names ${edge.toPath}, which does not exist`,
            edge.dir,
          ),
        );
      }
    }
    return out;
  }

  /**
   * ⚠⚠ **`bidirectional: true` means INSTALL BOTH SIDES**, so such an
   * edge is reciprocal by construction and the far side must NOT
   * declare it again.
   *
   * This rule was written the other way round first — *a declared
   * bidirectional edge the far side does not answer* — and its first run
   * over shipped content flagged Duncan Hall's front doors, whose row
   * says in a comment exactly why it is right: *"authored once with
   * `bidirectional: true` … the steps' back-exit is installed from here
   * rather than duplicated on the steps template."* The requirements'
   * AC7 phrase *"a non-reciprocal bidirectional edge"* has no referent
   * in the real content format; `Exitable._applyExitSpec` calls
   * `addBidirectionalExit`, which installs the reverse.
   *
   * So the error this rule catches is the conflict that genuinely
   * exists: **both sides declaring the same pair bidirectional**, which
   * asks the engine to install the pair twice. The one-sided edge AC7
   * was reaching for is `asymmetric-edge` below, which is where it
   * belongs — a census, because a one-way passage is legitimate content
   * and the runtime default for a singly-authored exit is in fact
   * `oneWay: true`.
   */
  #reciprocity(subject: readonly GraphNode[]): GraphFinding[] {
    const out: GraphFinding[] = [];
    for (const node of subject) {
      for (const edge of node.edges) {
        if (edge.slot) continue;
        const far = this.#far(edge);
        if (!far) continue;
        const backEdges = far.edges.filter((e) => this.#far(e) === node);
        if (edge.bidirectional) {
          const alsoDeclared = backEdges.find((e) => e.bidirectional);
          if (alsoDeclared) {
            out.push(
              this.#finding(
                'bidirectional-both-sides',
                node,
                `exit ${edge.dir} → ${far.template} is declared ` +
                  `bidirectional here AND as ${alsoDeclared.dir} on ` +
                  `${far.template}. One declaration installs both sides; ` +
                  `two install the pair twice.`,
                edge.dir,
              ),
            );
          }
          continue; // reciprocal by construction
        }
        if (backEdges.length > 0 || edge.oneWay) continue;
        out.push(
          this.#finding(
            'asymmetric-edge',
            node,
            `exit ${edge.dir} → ${far.template} has no way back. Mark it ` +
              `\`oneWay\` if that is deliberate, or declare the return ` +
              `trip on ${far.template}.`,
            edge.dir,
          ),
        );
      }
    }
    return out;
  }

  /**
   * An edge from published content into unpublished content. ⭐ One way
   * only: the reverse is how a draft attaches to the live world.
   */
  #publishWall(subject: readonly GraphNode[]): GraphFinding[] {
    const out: GraphFinding[] = [];
    for (const node of subject) {
      if (node.published === false) continue;
      for (const edge of node.edges) {
        if (edge.slot) continue;
        const far = this.#far(edge);
        if (!far || far.published !== false) continue;
        out.push(
          this.#finding(
            'published-into-unpublished',
            node,
            `exit ${edge.dir} → ${far.template}, which is not published. A ` +
              `player would be refused at a wall with no fiction for it.`,
            edge.dir,
          ),
        );
      }
    }
    return out;
  }

  /**
   * A cross-zone edge declared on one side only. `boundary.md` requires
   * both sides and nothing verified it; the University Avenue crossing
   * is the exemplar of two zones that touch.
   */
  #crossZone(subject: readonly GraphNode[]): GraphFinding[] {
    const out: GraphFinding[] = [];
    for (const node of subject) {
      if (!node.zone) continue;
      for (const edge of node.edges) {
        if (edge.slot) continue;
        const far = this.#far(edge);
        if (!far || !far.zone || far.zone === node.zone) continue;
        // `bidirectional` installs the reverse, so it satisfies the
        // both-sides rule `boundary.md` states.
        if (edge.bidirectional) continue;
        if (far.edges.some((e) => this.#far(e) === node)) continue;
        out.push(
          this.#finding(
            'cross-zone-one-sided',
            node,
            `exit ${edge.dir} crosses from ${node.zone} into ${far.zone}, ` +
              `and the far side declares no edge back`,
            edge.dir,
          ),
        );
      }
    }
    return out;
  }

  /**
   * A destination that resolves to a KIND row — a template describing a
   * class of place rather than a place. `StuffApi.singleton` would mint
   * a stray instance of it, which is how a lounge satellite ends up
   * standing in somebody's street.
   */
  #kindDestinations(subject: readonly GraphNode[]): GraphFinding[] {
    const out: GraphFinding[] = [];
    for (const node of subject) {
      for (const edge of node.edges) {
        if (edge.slot) continue;
        const target = edge.to ?? edge.toPath;
        if (!target || !this.#kinds.has(target)) continue;
        out.push(
          this.#finding(
            'destination-is-a-kind',
            node,
            `exit ${edge.dir} names ${target}, which is a KIND of place, ` +
              `not a place. Resolving it would mint a stray instance.`,
            edge.dir,
          ),
        );
      }
    }
    return out;
  }

  /**
   * A place no entrance of its zone reaches. ⭐ A zone with no entrance
   * at ALL is one finding against the zone rather than one per room —
   * "nothing leads here" is a single fact, and reporting it forty times
   * is how a census becomes noise nobody reads.
   */
  #reachability(): GraphFinding[] {
    const out: GraphFinding[] = [];
    const byZone = new Map<string, GraphNode[]>();
    for (const node of this.#nodes) {
      if (!node.zone) continue;
      const list = byZone.get(node.zone) ?? [];
      list.push(node);
      byZone.set(node.zone, list);
    }
    for (const [zone, nodes] of byZone) {
      const entrances = nodes.filter((n) => n.entrance);
      if (entrances.length === 0) {
        const first = nodes[0];
        if (first) {
          out.push(
            this.#finding(
              'unreachable-from-entrance',
              first,
              `zone ${zone} has no entrance: no cross-zone edge leads into ` +
                `it, no travel stop sits in it, and it holds no start ` +
                `location. Nothing leads here.`,
            ),
          );
        }
        continue;
      }
      const seen = new Set<string>(entrances.map((n) => n.identity));
      const queue = [...entrances];
      while (queue.length > 0) {
        const node = queue.shift()!;
        for (const edge of node.edges) {
          const far = this.#far(edge);
          if (!far || far.zone !== zone || seen.has(far.identity)) continue;
          seen.add(far.identity);
          queue.push(far);
        }
      }
      for (const node of nodes) {
        if (seen.has(node.identity)) continue;
        out.push(
          this.#finding(
            'unreachable-from-entrance',
            node,
            `nothing in ${zone} leads here from any of its entrances ` +
              `(${entrances.map((e) => e.template).join(', ')})`,
          ),
        );
      }
    }
    return out;
  }

  /** The node an edge points at, by identity then by authored path. */
  #far(edge: GraphEdge): GraphNode | null {
    if (edge.slot) return null;
    if (edge.to) return this.#byIdentity.get(edge.to) ?? null;
    if (edge.toPath) return this.#byIdentity.get(edge.toPath) ?? null;
    return null;
  }
}

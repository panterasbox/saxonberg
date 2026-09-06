/**
 * Route — an ordered node sequence plus a **stop set**.
 *
 * A plain value object in the pack's `lib/`, the `Light` / `Quantity`
 * category: never template-backed, never a Stuff. ⚠ That is a decision,
 * not a shortcut. A per-request trip would otherwise mint a Stuff with
 * no template path — unaddressable, un-editable, and exactly the
 * anti-pattern `lint:census` exists to catch.
 *
 * ## ⚠⚠ The Journey cannot tell which factory made it
 *
 * A scheduled service's route is **authored**; a haulage gig's route,
 * and any on-demand trip's, is **computed per request** — and they are
 * the same shape. Today the realm has two corridors and the path is
 * unique, so this does not bite; if `Route` baked in *authored*,
 * on-demand service would become unrepresentable later and expensive to
 * retrofit. `provenance` is carried so a reader can SAY which it was; no
 * behaviour anywhere may branch on it.
 *
 * See [docs/subsystems/logistics.md].
 */

/** Which factory built a route. Reportable; never a branch. */
export type RouteProvenance = 'authored' | 'computed';

export class Route {
  private constructor(
    /** The lane this route runs over. */
    public readonly laneKey: string,
    /** Every node passed through, in order — including the ones not stopped at. */
    public readonly nodes: readonly string[],
    /** Where a traveller may board or alight. A subset of `nodes`. */
    public readonly stops: readonly string[],
    /** See the class note: reportable, never a branch. */
    public readonly provenance: RouteProvenance,
  ) {}

  /** A route read off an authored `Route` row. */
  static authored(
    laneKey: string,
    nodes: readonly string[],
    stops: readonly string[],
  ): Route {
    return new Route(laneKey, [...nodes], [...stops], 'authored');
  }

  /**
   * A route worked out for one request — a haulage gig, a hail, a
   * hauler's own errand. Mints nothing, so it runs per request without a
   * template row.
   */
  static computed(
    laneKey: string,
    nodes: readonly string[],
    stops: readonly string[],
  ): Route {
    return new Route(laneKey, [...nodes], [...stops], 'computed');
  }

  /** Where the journey begins, or `null` for an empty route. */
  public origin(): string | null {
    return this.nodes[0] ?? null;
  }

  /** Where it ends, or `null` for an empty route. */
  public destination(): string | null {
    return this.nodes[this.nodes.length - 1] ?? null;
  }

  /** How many legs remain to be travelled from `index`. */
  public legsFrom(index: number): number {
    return Math.max(0, this.nodes.length - 1 - index);
  }

  /** The consecutive node pairs, in order — one per beat of the Journey. */
  public legs(): readonly (readonly [string, string])[] {
    const out: (readonly [string, string])[] = [];
    for (let i = 0; i + 1 < this.nodes.length; i += 1) {
      out.push([this.nodes[i]!, this.nodes[i + 1]!] as const);
    }
    return out;
  }

  public isStop(path: string): boolean {
    return this.stops.includes(path);
  }
}

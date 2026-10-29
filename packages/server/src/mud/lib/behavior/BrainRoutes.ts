/**
 * BrainRoutes — ⭐ the routes a worker brain walks, read off its `ways:`
 * config (review R2-D8: five worker brains in two packs each carried their
 * own copy of this parse and of the walk).
 *
 * A row is `{ to, go, back }`: the place it reaches, the exit directions
 * from the worker's post, and the directions back. A row without a place
 * or with either leg empty is no route. The worker walks a leg with
 * `MobileMixin.walkRoute`.
 *
 * ⚠ `to(path)` is a plain lookup with no "already there" case: a worker
 * standing AWAY asks for the route that ends where it stands, to walk its
 * `back` leg home.
 */

/** One authored route. */
export interface BrainRoute {
  to: string;
  go: readonly string[];
  back: readonly string[];
}

export class BrainRoutes {
  private readonly routes: readonly BrainRoute[];

  constructor(config: Record<string, unknown>) {
    const rows = Array.isArray(config.ways) ? config.ways : [];
    const dirs = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((d): d is string => typeof d === 'string') : [];
    const out: BrainRoute[] = [];
    for (const row of rows) {
      if (typeof row !== 'object' || row === null) continue;
      const r = row as { to?: unknown; go?: unknown; back?: unknown };
      if (typeof r.to !== 'string' || r.to === '') continue;
      const route = { to: r.to, go: dirs(r.go), back: dirs(r.back) };
      if (route.go.length === 0 || route.back.length === 0) continue;
      out.push(route);
    }
    this.routes = out;
  }

  /** The route to the place at `path`, or `null` when none is authored. */
  public to(path: string): BrainRoute | null {
    return this.routes.find((w) => w.to === path) ?? null;
  }

  /** Every authored route, in order. */
  public all(): readonly BrainRoute[] {
    return this.routes;
  }
}

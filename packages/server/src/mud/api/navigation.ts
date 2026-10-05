/**
 * NavigationApi — canonical direction table, aliases, and cartesian offsets.
 *
 * Cartesian zones use a 10-way direction set: the 8 compass cardinals plus
 * `up` and `down`. Each direction has a `[dx, dy, dz]` offset (used by
 * `CartesianZone.getNeighbor()` and coordinate geometry) and a canonical
 * inverse used by arrival-message formatting + authoring reciprocal exits.
 *
 * Spherical zones and vessels use arbitrary semantic labels (`'office'`,
 * `'kitchen'`, `'out'`) that live outside this table — callers treat an
 * `undefined` result from `normalizeDirection()` / `invertDirection()` as
 * "not cardinal".
 *
 * Thin, security-gated forwarding shell: the direction table and lookups
 * live in the hot-reloadable {@link NavigationLogic} singleton at
 * `/platform/idea/api/navigation`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/navigation` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { NavigationLogic } from '../platform/idea/api/NavigationLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import type { PlaceNode } from '../lib/location/PlaceNode';
import type { GraphFinding } from '../lib/location/GraphInvariants';

/** Canonical direction names (long form). */
export type CardinalDirection =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest'
  | 'up'
  | 'down';

const LOGIC_PATH = '/platform/idea/api/navigation';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/NavigationLogic', import.meta.url)
);

/** Resolve the HMR-able NavigationLogic singleton (sync). */
function logic(): NavigationLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'NavigationLogic'
      ) as typeof NavigationLogic | null) ?? NavigationLogic)()
  );
}

export type { PlaceNode, StoredEdge, NodeTravel } from '../lib/location/PlaceNode';
export type {
  GraphEdge,
  GraphFinding,
  GraphNode,
  GraphRule,
} from '../lib/location/GraphInvariants';

export class NavigationApi {
  /**
   * Normalize a direction string (or alias) to its canonical long-form name.
   *
   * Returns `undefined` when the input doesn't name a cardinal direction —
   * callers should treat that as "not a direction, try it as a vessel keyword
   * / semantic label" (see GoController).
   */
  public static normalizeDirection(
    input: string
  ): CardinalDirection | undefined {
    return logic().normalizeDirection(input);
  }

  /**
   * Return the cardinal inverse of a direction.
   *
   * Returns `undefined` for non-cardinals (semantic labels like `'office'` or
   * vessel-synthesized `'out'` have no structural inverse; arrival messages
   * degrade to "Alice arrives." for those cases).
   */
  public static invertDirection(
    direction: string
  ): CardinalDirection | undefined {
    return logic().invertDirection(direction);
  }

  /**
   * Grid offset triple for a direction (canonical or alias).
   *
   * Returns `undefined` for non-cardinals.
   */
  public static directionOffset(
    direction: string
  ): [number, number, number] | undefined {
    return logic().directionOffset(direction);
  }

  /** Is `direction` (or its alias) one of the 10 canonical cardinals? */
  public static isCardinalDirection(direction: string): boolean {
    return logic().isCardinalDirection(direction);
  }

  /** List of canonical cardinal directions (useful for tests / iteration). */
  public static cardinalDirections(): readonly CardinalDirection[] {
    return logic().cardinalDirections();
  }

  /* ── the location graph ──────────────────────────────────────────────
   *
   * The world's shape: every place and every exit out of it, derived
   * from the content rows, rebuilt at boot and kept current at the
   * template write chokepoint. See
   * [docs/subsystems/location-graph.md].
   *
   * ⭐⭐ **None of this may reach a client.** A player's knowledge of the
   * world is their own map document and the two never join — a read
   * that merged them would hand somebody the shape of places they have
   * not earned. Every method here is server-side.
   *
   * ⭐ Every one is string-keyed. The graph is addressed by node
   * IDENTITY, which is a string (`Stuff.getDurableHandle()`), so no
   * method takes a live place.
   */

  /**
   * Has the graph been built at least once?
   *
   * The write chokepoint reads this to skip per-row projection during
   * pack install, when thousands of rows land before anything warms.
   */
  public static isGraphWarm(): boolean {
    return logic().isGraphWarm();
  }

  /**
   * Rebuild the whole graph from the content rows; returns the node
   * count. Idempotent by generation rather than by truncation, so there
   * is no window in which the graph is empty.
   */
  public static rebuildGraph(): Promise<number> {
    return logic().rebuildGraph();
  }

  /** Re-project one content row (and drop its nodes if it stopped being a place). */
  public static projectRow(path: string): Promise<void> {
    return logic().projectRow(path);
  }

  /** Drop every node a content row produced. */
  public static removeRow(path: string): Promise<void> {
    return logic().removeRow(path);
  }

  /**
   * Re-read `published` for every node under `extent`; returns how many
   * changed. The parcel is the source of truth, so a flip calls this.
   */
  public static reprojectExtent(extent: string): Promise<number> {
    return logic().reprojectExtent(extent);
  }

  /** The one node with this identity, or null. */
  public static node(identity: string): Promise<PlaceNode | null> {
    return logic().node(identity);
  }

  /** Every node in one zone. */
  public static nodesInZone(zonePath: string): Promise<PlaceNode[]> {
    return logic().nodesInZone(zonePath);
  }

  /**
   * Every node with an edge INTO `identity` — the reverse query.
   *
   * ⭐ This is what lets taking content down be honest: it names every
   * room that just lost a destination, so their authors can be told,
   * and it is how the tombstone picks the way `out`.
   */
  public static pointingAt(identity: string): Promise<PlaceNode[]> {
    return logic().pointingAt(identity);
  }

  /** Every node carrying a cross-zone edge — the router's coarse graph. */
  public static interzoneSkeleton(): Promise<PlaceNode[]> {
    return logic().interzoneSkeleton();
  }

  /** Every published node with an edge into unpublished content. */
  public static edgesIntoUnpublished(): Promise<PlaceNode[]> {
    return logic().edgesIntoUnpublished();
  }

  /**
   * Run the graph invariants over the projected nodes — the same
   * instance value class `lint:location-graph` runs over the rows on
   * disk, so a gate and a runtime check cannot disagree about what a
   * dangling exit is. With `scope`, one row's findings (and no
   * reachability pass, which is a whole-graph property).
   */
  public static checkGraph(scope?: string): Promise<GraphFinding[]> {
    return logic().checkGraph(scope);
  }
}

SecurityApi.decorateApiClass(NavigationApi);

// NavigationLogic — the hot-reloadable logic singleton behind
// NavigationApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import type LocationGraphRegistry from '../LocationGraphRegistry';
import type { PlaceNode } from '../../../lib/location/PlaceNode';
import type { GraphFinding } from '../../../lib/location/GraphInvariants';
import type { CardinalDirection } from '../../../api/navigation';

/** Where the graph registry stands. */
const GRAPH_REGISTRY_PATH = '/platform/idea/LocationGraphRegistry';

/**
 * The registry, or null before it has warmed.
 *
 * ⚠ `null` is a real answer and every caller treats it as one: the
 * registry is booted from the platform pack's manifest, and plenty runs
 * before that — the installer's own 2,500 row writes, every unit test
 * that never boots a world. A graph read before the warm answers
 * *nothing yet*, not *no such place*, which is why the projection hook
 * checks `isGraphWarm()` first rather than relying on these to no-op.
 */
function registry(): LocationGraphRegistry | null {
  return (
    StuffApi.findByTemplatePath<LocationGraphRegistry>(GRAPH_REGISTRY_PATH) ??
    null
  );
}

/**
 * Offsets keyed by long-form direction name.
 *
 * y grows north (matches "map up"); z grows up (standard).
 */
const DIRECTION_OFFSETS: Record<CardinalDirection, [number, number, number]> = {
  north: [0, 1, 0],
  south: [0, -1, 0],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  northeast: [1, 1, 0],
  northwest: [-1, 1, 0],
  southeast: [1, -1, 0],
  southwest: [-1, -1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

/**
 * Alias → canonical long form. Keys are lower-cased tokens the parser will
 * see (`n`, `ne`, `u`, `d`, ...).
 */
const DIRECTION_ALIASES: Record<string, CardinalDirection> = {
  n: 'north',
  north: 'north',
  s: 'south',
  south: 'south',
  e: 'east',
  east: 'east',
  w: 'west',
  west: 'west',
  ne: 'northeast',
  northeast: 'northeast',
  nw: 'northwest',
  northwest: 'northwest',
  se: 'southeast',
  southeast: 'southeast',
  sw: 'southwest',
  southwest: 'southwest',
  u: 'up',
  up: 'up',
  d: 'down',
  down: 'down',
};

/** Inverses for the 10 cardinals (used for arrival messages). */
const DIRECTION_INVERSES: Record<CardinalDirection, CardinalDirection> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  northwest: 'southeast',
  southeast: 'northwest',
  southwest: 'northeast',
  up: 'down',
  down: 'up',
};

const CARDINALS: readonly CardinalDirection[] = [
  'north',
  'south',
  'east',
  'west',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
  'up',
  'down',
];

/** Module-private canonical lookup — shared by every method below. */
function normalize(input: string): CardinalDirection | undefined {
  return DIRECTION_ALIASES[input.trim().toLowerCase()];
}

const NavigationApiCallers = SecurityPolicies.FromModule('/api/navigation#NavigationApi'
);

/**
 * NavigationLogic — the hot-reloadable logic singleton behind
 * {@link NavigationApi}.
 *
 * Holds the canonical direction table (offsets, aliases, inverses) and
 * the lookup methods. Lives at `/platform/idea/api/navigation`; `NavigationApi`'s
 * statics forward here via `StuffApi.singletonSync`. Each public method
 * is gated `FromModule('/api/navigation#NavigationApi')` (per-method,
 * not class-level — see {@link MaterialLogic} for why).
 *
 * The direction constants and the `CardinalDirection` vocabulary are
 * *placed* here (constants are placed, not re-exported); the type is
 * re-exported type-only from the Api face. Internal lookups go through
 * the module-private `normalize` free function rather than
 * `this.normalizeDirection`, so there are no intra-singleton self-calls
 * to trip the gate.
 *
 * @internal
 */
@Unshadowable
export class NavigationLogic extends ApiLogic {
  /** See {@link NavigationApi.normalizeDirection}. */
  @CallSecurity(NavigationApiCallers)
  public normalizeDirection(input: string): CardinalDirection | undefined {
    return normalize(input);
  }

  /** See {@link NavigationApi.invertDirection}. */
  @CallSecurity(NavigationApiCallers)
  public invertDirection(direction: string): CardinalDirection | undefined {
    const canonical = normalize(direction);
    if (!canonical) return undefined;
    return DIRECTION_INVERSES[canonical];
  }

  /** See {@link NavigationApi.directionOffset}. */
  @CallSecurity(NavigationApiCallers)
  public directionOffset(
    direction: string
  ): [number, number, number] | undefined {
    const canonical = normalize(direction);
    if (!canonical) return undefined;
    return DIRECTION_OFFSETS[canonical];
  }

  /** See {@link NavigationApi.isCardinalDirection}. */
  @CallSecurity(NavigationApiCallers)
  public isCardinalDirection(direction: string): boolean {
    return normalize(direction) !== undefined;
  }

  /** See {@link NavigationApi.cardinalDirections}. */
  @CallSecurity(NavigationApiCallers)
  public cardinalDirections(): readonly CardinalDirection[] {
    return CARDINALS;
  }

  /* ── the location graph ─────────────────────────────────────────────
   *
   * ⭐ Every method here is STRING-KEYED and takes plain data. Nothing
   * takes a `Stuff`: `NavigationApi` is not on `lint:object-verbs`'s
   * exempt list, and it should not be — the graph is addressed by
   * identity, which is a string, and a method that took a live place
   * would be asking its caller to have stood one up.
   *
   * ⚠ The state and the projection live on `LocationGraphRegistry`
   * (the `AddressRegistry` → `AddressLogic` arrangement): the index
   * must survive a reload of this file, and a reload of the registry
   * re-clones it and rebuilds idempotently.
   */

  /** See {@link NavigationApi.isGraphWarm}. */
  @CallSecurity(NavigationApiCallers)
  public isGraphWarm(): boolean {
    return registry()?.isWarm() ?? false;
  }

  /** See {@link NavigationApi.rebuildGraph}. */
  @CallSecurity(NavigationApiCallers)
  public async rebuildGraph(): Promise<number> {
    return (await registry()?.rebuild()) ?? 0;
  }

  /** See {@link NavigationApi.projectRow}. */
  @CallSecurity(NavigationApiCallers)
  public async projectRow(path: string): Promise<void> {
    await registry()?.projectRow(path);
  }

  /** See {@link NavigationApi.removeRow}. */
  @CallSecurity(NavigationApiCallers)
  public async removeRow(path: string): Promise<void> {
    await registry()?.removeRow(path);
  }

  /** See {@link NavigationApi.reprojectExtent}. */
  @CallSecurity(NavigationApiCallers)
  public async reprojectExtent(extent: string): Promise<number> {
    return (await registry()?.reprojectExtent(extent)) ?? 0;
  }

  /** See {@link NavigationApi.node}. */
  @CallSecurity(NavigationApiCallers)
  public async node(identity: string): Promise<PlaceNode | null> {
    return (await registry()?.node(identity)) ?? null;
  }

  /** See {@link NavigationApi.nodesInZone}. */
  @CallSecurity(NavigationApiCallers)
  public async nodesInZone(zonePath: string): Promise<PlaceNode[]> {
    return (await registry()?.nodesInZone(zonePath)) ?? [];
  }

  /** See {@link NavigationApi.nodesInExtent}. */
  @CallSecurity(NavigationApiCallers)
  public async nodesInExtent(extent: string): Promise<PlaceNode[]> {
    return (await registry()?.nodesInExtent(extent)) ?? [];
  }

  /** See {@link NavigationApi.pointingAt}. */
  @CallSecurity(NavigationApiCallers)
  public async pointingAt(identity: string): Promise<PlaceNode[]> {
    return (await registry()?.pointingAt(identity)) ?? [];
  }

  /** See {@link NavigationApi.interzoneSkeleton}. */
  @CallSecurity(NavigationApiCallers)
  public async interzoneSkeleton(): Promise<PlaceNode[]> {
    return (await registry()?.interzoneSkeleton()) ?? [];
  }

  /** See {@link NavigationApi.edgesIntoUnpublished}. */
  @CallSecurity(NavigationApiCallers)
  public async edgesIntoUnpublished(): Promise<PlaceNode[]> {
    return (await registry()?.edgesIntoUnpublished()) ?? [];
  }

  /** See {@link NavigationApi.checkGraph}. */
  @CallSecurity(NavigationApiCallers)
  public async checkGraph(scope?: string): Promise<GraphFinding[]> {
    return (await registry()?.checkGraph(scope)) ?? [];
  }
}

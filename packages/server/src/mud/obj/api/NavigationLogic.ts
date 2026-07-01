// NavigationLogic — the hot-reloadable logic singleton behind
// NavigationApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { CardinalDirection } from '../../api/navigation';

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

const NavigationApiCallers = SecurityPolicies.FromModule(
  'api/navigation#NavigationApi'
);

/**
 * NavigationLogic — the hot-reloadable logic singleton behind
 * {@link NavigationApi}.
 *
 * Holds the canonical direction table (offsets, aliases, inverses) and
 * the lookup methods. Lives at `/obj/api/navigation`; `NavigationApi`'s
 * statics forward here via `StuffApi.singletonSync`. Each public method
 * is gated `FromModule('api/navigation#NavigationApi')` (per-method,
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
export class NavigationLogic extends Idea {
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
}

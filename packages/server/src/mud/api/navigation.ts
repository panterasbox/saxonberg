import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
/**
 * NavigationApi — canonical direction table, aliases, and cartesian offsets.
 *
 * Cartesian zones use a 10-way direction set: the 8 compass cardinals plus
 * `up` and `down`. Each direction has a `[dx, dy, dz]` offset used by
 * `CartesianZone.deriveExit()` to locate the neighbor cell, and a canonical
 * inverse used by arrival-message formatting.
 *
 * Spherical zones and vessels use arbitrary semantic labels (`'office'`,
 * `'kitchen'`, `'out'`) that live outside this table — callers treat an
 * `undefined` result from `normalizeDirection()` / `invertDirection()` as
 * "not cardinal".
 */

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

@CallSecurity(SecurityPolicies.Public)
export class NavigationApi {
  /**
   * Normalize a direction string (or alias) to its canonical long-form name.
   *
   * Returns `undefined` when the input doesn't name a cardinal direction —
   * callers should treat that as "not a direction, try it as a vessel keyword
   * / semantic label" (see GoController).
   */
  public static normalizeDirection(input: string): CardinalDirection | undefined {
    return DIRECTION_ALIASES[input.trim().toLowerCase()];
  }

  /**
   * Return the cardinal inverse of a direction.
   *
   * Returns `undefined` for non-cardinals (semantic labels like `'office'` or
   * vessel-synthesized `'out'` have no structural inverse; arrival messages
   * degrade to "Alice arrives." for those cases).
   */
  public static invertDirection(direction: string): CardinalDirection | undefined {
    const canonical = this.normalizeDirection(direction);
    if (!canonical) return undefined;
    return DIRECTION_INVERSES[canonical];
  }

  /**
   * Grid offset triple for a direction (canonical or alias).
   *
   * Returns `undefined` for non-cardinals.
   */
  public static directionOffset(direction: string): [number, number, number] | undefined {
    const canonical = this.normalizeDirection(direction);
    if (!canonical) return undefined;
    return DIRECTION_OFFSETS[canonical];
  }

  /** Is `direction` (or its alias) one of the 10 canonical cardinals? */
  public static isCardinalDirection(direction: string): boolean {
    return this.normalizeDirection(direction) !== undefined;
  }

  /** List of canonical cardinal directions (useful for tests / iteration). */
  public static cardinalDirections(): readonly CardinalDirection[] {
    return CARDINALS;
  }
}


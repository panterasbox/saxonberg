/**
 * Shared contract for the three per-mode enablement mixins
 * (`Climbable` / `Swimmable` / `Flyable`). Each composes on `Stuff`,
 * declares axes the mode can be engaged in, optionally carries a
 * difficulty score, and gates engagement by comparing an actor's
 * per-mode capability `Property` against the difficulty.
 *
 * The mixin's own `Property` constant
 * (`CLIMBING_CAPABILITY_PROP`, `SWIMMING_CAPABILITY_PROP`,
 * `FLIGHT_CAPABILITY_PROP`) stays per-mode for content-authoring
 * clarity — an actor's `climbing` / `swimming` / `flight` Properties
 * are distinct, meaningful identifiers. The method shape unifies so
 * generic Api code (LocomotionApi.checkEnablement) dispatches via
 * `LocomotionMode.getEnablementMixin()` without naming a mode.
 */

import type { Stuff } from '../stuff/Stuff';

export interface Enablement {
  /** Direction tokens this host enables. `'*'` means any direction. */
  getAxes(): readonly string[];
  setAxes(value: string[]): void;
  /** True if this host enables the mode in the given direction. */
  canEngageAxis(direction: string): boolean;
  /** RPG-mechanical difficulty; `null` means "any capability passes". */
  getDifficulty(): number | null;
  setDifficulty(value: number | null): void;
  /** True if the actor has enough capability for this scope's difficulty. */
  canBeEngagedBy(actor: Stuff): boolean;
}

/**
 * Shared validator for Enablement axes lists. Throws on duplicate or
 * empty-string entries. Called by each per-mode mixin's `setAxes`.
 */
export function assertUniqueNonEmptyAxes(
  value: string[],
  where: string,
): void {
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string' || v.length === 0) {
      throw new TypeError(`${where}: entries must be non-empty strings`);
    }
    if (seen.has(v)) {
      throw new TypeError(`${where}: duplicate entry '${v}'`);
    }
    seen.add(v);
  }
}

/**
 * Shared validator for Enablement difficulty values. Throws on
 * non-null non-positive or non-finite values. Called by each
 * per-mode mixin's `setDifficulty`.
 */
export function assertEnablementDifficulty(
  value: number | null,
  where: string,
): void {
  if (value === null) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `${where}: must be null or a finite positive number; got ${value}`,
    );
  }
}

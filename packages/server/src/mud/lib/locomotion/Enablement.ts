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
import type Exit from '../boundary/Exit';

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
  /**
   * ⭐ The actor has just crossed `exit` on this host (cordage D11) — after
   * the move and its witnesses. A rope at a drop takes the climb's wear here
   * and may part; a ladder or a cliff does nothing.
   */
  afterEnabledTraverse(actor: Stuff, direction: string, exit: Exit): Promise<void>;
}

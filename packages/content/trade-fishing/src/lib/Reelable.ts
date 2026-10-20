/**
 * Reelable — ⭐ the shape of a thing you can `reel`.
 *
 * `reel` is fishing's verb, and with nothing bound it still takes line in
 * against a hooked fish exactly as it always did. Bound to a target that
 * answers THIS shape, the same verb winds something else onto a reel —
 * silk off a basin of cocoons, the first consumer — and the target says
 * whether it can, how long it takes, and what came of it. The controller
 * narrows, engages and narrates; it never decides.
 *
 * ⭐ It reuses the kernel's worked-act vocabulary (`WorkPrognosis`,
 * `WorkResult` from `lib/ground/Workable`) rather than a parallel one: a
 * reel is a worked act with a different instrument, and one plan/result
 * shape is what lets `land()` credit whatever Discipline the subject names.
 *
 * The collision ladder's first rung: unify behind an interface. A second
 * `reel` view would have shadowed the first silently.
 */

import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { WorkPrognosis, WorkResult } from '@saxonberg/server/mud/lib/ground/Workable';

export interface Reelable {
  /** Marker: this shape is reeled. Never read for truth. */
  readonly reelable: true;
  /**
   * What one reeling would be, or why not — no side effects. `count` is
   * the player's `--count` (how many filaments to a thread), or `null`.
   */
  planReel(by: Stuff, tool: (Stuff & Tooled) | null, count: number | null): Promise<WorkPrognosis>;
  /** Do it. Called once, when the engaged step completes. */
  completeReel(by: Stuff, tool: (Stuff & Tooled) | null, token: unknown): Promise<WorkResult>;
}

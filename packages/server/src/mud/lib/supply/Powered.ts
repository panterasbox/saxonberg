/**
 * Powered — the kernel-declared shape of *a thing that draws a supply
 * which can be on or off, and can say when it was*.
 *
 * ⭐⭐ **A kernel interface a pack implements structurally** — the
 * `TravelNode` ↔ `tpa` pattern. The kernel's `ClimateControlMixin` is typed
 * over `Powered` so a fridge can be driven while supplied and drift when
 * cut, but the kernel cannot read the grid: the energy pack's
 * `GridPoweredMixin` *implements* this shape (`implements Powered`), and a
 * second supply (a windmill, a mana tap) is a second implementer in its own
 * pack. No import crosses from the kernel to the pack.
 *
 * `poweredTrajectory` is why the cut is read correctly across an unobserved
 * gap: the supply publishes a 0/1 {@link Piecewise} over the window (1 =
 * supplied), so the envelope integrates the warm-up that began at the cut
 * and the pull-down that began at the splice as separate stretches, rather
 * than billing the whole gap at whatever the meter reads on the visit.
 */

import type { Piecewise } from '../Trajectory';

export interface Powered {
  /** Is the premises supplied right now? */
  isPowered(): boolean;
  /** Power available to draw right now (W); `0` when cut. */
  availablePowerW(): number;
  /**
   * The supply over `[fromS, toS]` as a 0/1 trajectory (1 = supplied) —
   * constant stretches at the cut / splice boundaries. A supply with no
   * history answers a single constant stretch at its current state (the
   * never-empty rule).
   */
  poweredTrajectory(fromS: number, toS: number): Piecewise;
}

/**
 * FloodedCell — the electricity **demonstrator**: a flooded switch-cell in a
 * derelict substation, ankle-deep in brackish water with a downed live cable
 * lying in it. Wade in barefoot and the current flows from the cable, through
 * the salt-water pool + the grounded `Floor`, through you — a shock. Stay on
 * the dry raised catwalk, or wear rubber boots, and the ground path is broken:
 * you're untouched. Two allies wading in both take it (faction-blind). It
 * teaches the WHOLE model with no magic.
 *
 * A **one-off demonstrator room** (the `GlassAlley` precedent) — NOT a
 * reusable `HazardMixin`; the reusable abstraction is `ElectricityApi.conduct`
 * itself. A proper {@link CartesianLocation}: it lives at `[x,y,z]` in the
 * substation's {@link CartesianZone} (`/domain/substation`).
 *
 * The **only** bespoke behavior is the hazard trigger — `onEntered` conducts
 * from the live source in the cell. Its fixtures are **authored templates
 * placed declaratively** by the room's seed: the salt-water-pooled `Floor`
 * via `adornments:`, the `LiveWire` via `populates:` (electricity has no
 * declarative room-hazard field like the cistern's `_atmosphere: water`, so
 * the trigger stays code — but the content does not).
 *
 * The substation is also where the deferred **power grid** content grows —
 * the grid is this same Ohm's-law physics scaled up.
 *
 * See docs/subsystems/electricity.md.
 */

import CartesianLocation from '../../lib/location/CartesianLocation';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { ElectricityApi } from '../../api/electricity';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Energized } from '../../lib/electricity/Energized';

export default class FloodedCell extends CartesianLocation {
  /**
   * The hazard: fired on the destination when a body walks in (the
   * `Mobile.traverse` → `onEntered` seam). Conduct from every live source in
   * the cell — the walk decides who is bridged to ground through the pool and
   * inflicts each. Faction-blind (allies included), grounding/insulation
   * emergent. A no-op if no source is present or all are de-energized.
   */
  public onEntered(_mover: Stuff, _exit: unknown): void {
    const self = this as unknown as Stuff & Container;
    for (const content of ContainmentApi.getContents(self)) {
      if (MixinApi.isEnergized(content as Stuff)) {
        ElectricityApi.conduct(content as unknown as Stuff & Energized);
      }
    }
  }
}

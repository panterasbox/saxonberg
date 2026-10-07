/**
 * SealedCellar — the sealed-room CO-death demonstrator (the ventilation
 * lesson). A fire lit inside it starves: it burns incomplete (cooler +
 * soot), fills the room with its own smoke and carbon dioxide until the
 * mixture will not keep a body alive, and finally self-smothers — an
 * enclosed fire kills by CO, not flame. Crack the door and it burns clean.
 *
 * ⭐⭐ **There is nothing bespoke left in this class.** It used to compose
 * `ReservedMixin` to carry an authored `%` air budget, and that was the
 * one thing it was for. The fire build derives a scope's air from its own
 * OPENINGS, so a shut stone room starves a fire because it is a shut
 * stone room — and the four Terminus cellars that authored the same
 * budget and silently dropped it (no `ReservedMixin` in their chain)
 * behave identically now. What remains is the granite, which is a fact
 * about cellars. See docs/subsystems/fire.md.
 *
 * ⭐ The Hearthworks' one class, shipped in the venue pack (the capability
 * rung) since the venue re-rooted under `/world/terminus` — a class path
 * under a pack root resolves into THAT pack's `src/`, never the kernel's.
 * Backs `/world/terminus/hearthworks/location/SealedCellar`.
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/lib/location/SingletonCartesianLocation';
import type { EnclosureDefaults } from '@saxonberg/server/mud/lib/spatial/Enclosed';

export default class SealedCellar extends SingletonCartesianLocation {
  /**
   * ⭐ **A cellar is cut into the rock, and the rock is thick.**
   *
   * The `enclosureDefaults` hook is for exactly this: a
   * room KIND that knows its own construction, so every cellar row gets
   * it without any of them authoring a line. A metre of granite gives
   * this room a time constant measured in many hours — it barely
   * notices the day outside, which is what a cellar is for and is now
   * a consequence of what it is made of rather than a number somebody
   * typed.
   *
   * ⚠ Note what this is NOT: it is not `_temperature`. Declaring the
   * temperature would bypass the envelope and put this row on
   * `lint:envelope`'s ratchet. Declaring the ROCK lets the physics
   * answer, and the answer is a cellar that runs cool and steady
   * because it is underground and massive.
   */
  public override enclosureDefaults(): EnclosureDefaults {
    return {
      materialPath: '/stuff/idea/material/rock/granite',
      thicknessM: 1.0,
    };
  }
}

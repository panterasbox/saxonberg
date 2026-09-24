/**
 * SealedCellar — the sealed-room CO-death demonstrator (the ventilation
 * lesson). A `CartesianLocation` carrying a finite combustion-`air` Reserve
 * (`ReservedMixin`), so a fire lit inside it starves: it burns incomplete
 * (cooler + soot), fills the room with smoke + carbon monoxide (the medium
 * turns un-breathable and poisonous), and finally self-smothers as the air
 * floors — an enclosed fire kills by CO, not flame. Crack the door (an open
 * boundary) and it burns clean. The **only** bespoke thing here is composing
 * `ReservedMixin` for the authored air budget; the whole behaviour is the
 * shipped `FireApi` air model reading it. See docs/subsystems/fire.md.
 *
 * ⭐ The Hearthworks' one class, shipped in the venue pack (the capability
 * rung) since the venue re-rooted under `/world/terminus` — a class path
 * under a pack root resolves into THAT pack's `src/`, never the kernel's.
 * Backs `/world/terminus/hearthworks/location/SealedCellar`.
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/lib/location/SingletonCartesianLocation';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import type { FabricDefaults } from '@saxonberg/server/mud/lib/stuff/Location';

export default class SealedCellar extends ReservedMixin(
  SingletonCartesianLocation,
) {
  /**
   * ⭐ **A cellar is cut into the rock, and the rock is thick.**
   *
   * The `fabricDefaults` hook (envelope build) is for exactly this: a
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
  public override fabricDefaults(): FabricDefaults {
    return {
      materialPath: '/stuff/idea/material/rock/granite',
      thicknessM: 1.0,
    };
  }
}

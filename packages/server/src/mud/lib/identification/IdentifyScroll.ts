/**
 * IdentifyScroll — a `Thing` that *carries* the `identify` verb: while
 * it's in your inventory, you can `identify <item>` to learn that item's
 * type (the thin type-axis trigger).
 *
 * The verb is carried by the object (the scroll affords it), not granted
 * by a capability mixin on the actor — same idiom as a thermometer
 * carrying `measure`. The `inventory`-bucket contribution is pushed onto
 * the holder's command stack when the scroll enters inventory.
 *
 * v1 is reusable (no consumption) — identification is binary and
 * idempotent, so a one-shot consume buys nothing the substrate needs;
 * consumable scrolls are a content refinement.
 */

import Thing from '../stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class IdentifyScroll extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: [],
    inventory: ['perception/identify.yaml'],
    peers: [],
  };
}

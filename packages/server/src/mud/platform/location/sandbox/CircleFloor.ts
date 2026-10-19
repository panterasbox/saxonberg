/**
 * CircleFloor — the entry room of a circle (docs/subsystems/sandbox.md).
 *
 * An ordinary room in every respect a player can see, with one
 * structural difference that matters: it is **not a singleton**.
 * `Locale` composes `SingletonMixin` because a named place
 * in the world is one place — but a circle floor is per-circle content,
 * and every maker's circle materializes its own. Cloning the shared
 * room template twice is exactly what a second visitor does, so the
 * singleton guard would refuse them a floor to stand on (found live:
 * the second player into a circle landed in a bare, descriptionless
 * fallback room with no way out).
 *
 * Everything else is the ordinary room composition: Visible + Detailed
 * for description, Exitable so the return passage can install, Staged
 * so a skin can stock its own furniture, Perceptible for the sensory
 * layer. ⭐ A `Location` (one of many — every circle mints its own), and
 * like every place but the void it has coordinates: a circle is a frame
 * of its own and its floor is that frame's origin.
 */

import Location from '../../../lib/location/Location';
import type { FieldMeta } from '../../../lib/mixin';

export default class CircleFloor extends Location {
  static fieldMeta: FieldMeta = {};
}

/**
 * CircleFloor — the entry room of a circle (docs/subsystems/sandbox.md).
 *
 * An ordinary room in every respect a player can see, with one
 * structural difference that matters: it is **not a singleton**.
 * `CartesianLocation` composes `SingletonMixin` because a named place
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
 * layer. Coordinates are deliberately absent — a circle is a space, not
 * a mapped location, and nothing navigates it by grid.
 */

import Location from '../../../lib/stuff/Location';
import { VisibleMixin } from '../../../lib/description/Visible';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { PerceptibleMixin } from '../../../lib/description/Perceptible';
import { ExitableMixin } from '../../../lib/boundary/Exitable';
import { StagedMixin } from '../../../lib/stuff/Staged';
import type { FieldMeta } from '../../../lib/mixin';

// ⭐ `PostRegistrationMixin` is NOT composed here: it moved down into
// `Location`'s own base stack (the ground build), because the mixin's
// default `postRegister` is a non-chaining no-op — a second composition
// above the base would SWALLOW `Location.postRegister`, and with it the
// room's floor.
const CircleFloorBase =
  StagedMixin(
    DetailedMixin(PerceptibleMixin(ExitableMixin(VisibleMixin(Location))))
  );

export default class CircleFloor extends CircleFloorBase {
  static fieldMeta: FieldMeta = {};
}

/**
 * Floor — composition: Postured + Slotted + Adornment + Detailed +
 * Visible + Thing.
 *
 * Extends `Thing` so the floor carries Tangible (material) and
 * Containable. Material is the load-bearing reason: future
 * material-aware floor-acceptance work (lava floors gating
 * actor-vs-material per § 19.10 of the embodiment requirements)
 * reads the floor's material via Tangible. Stone floors, wooden
 * decks, ice surfaces — all want a real material on the same shape
 * as everything else in the world. Containable rides along; the
 * Adornment-not-portable invariant fires at `ContainmentApi.move`
 * (a floor's adornedTo back-reference is always non-null while
 * attached, so attempting to move it through containment rejects
 * with `ContainmentError`).
 *
 * v1 ships no class-level default for "every Location has a floor"
 * — see § 7.5 of the embodiment requirements. The Floor class exists
 * because templates need a class to clone from; the choice of which
 * Locations include a floor adornment is per-template authoring.
 *
 * Default-floor seed at `seeds/obj/surface/default-floor.yaml`.
 */

import { Thing } from '../lib/stuff/Thing';
import { VisibleMixin } from '../lib/description/Visible';
import { DetailedMixin } from '../lib/description/Detailed';
import { AdornmentMixin } from '../lib/boundary/Adornment';
import { SlottedMixin } from '../lib/slot/Slotted';
import { PosturedMixin } from '../lib/slot/Postured';

const FloorBase = PosturedMixin(
  SlottedMixin(AdornmentMixin(DetailedMixin(VisibleMixin(Thing))))
);

export class Floor extends FloorBase {}

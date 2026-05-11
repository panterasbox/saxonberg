/**
 * Floor — composition: Postured + Slotted + Adornment + Detailed +
 * Visible + Idea.
 *
 * Extends `Idea` (raw Stuff base) rather than `Thing`. A floor isn't
 * a portable inventory item — it's a fixture in a Location's
 * Adornable surface, never moved through `ContainmentApi.move` and
 * never weighed (the v1 Tangible mixin is for inventory-side
 * material/mass questions). When the future material-aware floor
 * acceptance work lands (lava floors gating actor-vs-material per
 * § 19.10 of the embodiment requirements), Tangible can layer on.
 *
 * v1 ships no class-level default for "every Location has a floor"
 * — see § 7.5 of the embodiment requirements. The Floor class exists
 * because templates need a class to clone from; the choice of which
 * Locations include a floor adornment is per-template authoring.
 *
 * Default-floor seed at `seeds/obj/surface/default-floor.yaml`.
 */

import { Idea } from '../lib/stuff/Idea';
import { VisibleMixin } from '../lib/description/Visible';
import { DetailedMixin } from '../lib/description/Detailed';
import { AdornmentMixin } from '../lib/boundary/Adornment';
import { SlottedMixin } from '../lib/slot/Slotted';
import { PosturedMixin } from '../lib/slot/Postured';

const FloorBase = PosturedMixin(
  SlottedMixin(AdornmentMixin(DetailedMixin(VisibleMixin(Idea))))
);

export class Floor extends FloorBase {}

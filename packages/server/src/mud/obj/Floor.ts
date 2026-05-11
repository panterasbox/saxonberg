/**
 * Floor — composition: Postured + Slotted + Adornment + Detailed +
 * Visible + Thing.
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

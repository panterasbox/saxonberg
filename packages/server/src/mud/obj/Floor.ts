/**
 * Floor — composition: Bulkable + Postured + Slotted + Adornment +
 * Detailed + Visible + Thing.
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
 * Default-floor row at the generic-objects pack's `content/obj/surface/default-floor.yaml`.
 *
 * Surface-bulk: the floor composes `BulkableMixin` so a spilled,
 * over-poured, or drained-through liquid pools as the floor's
 * **surface** bulk slot (a puddle). This is independent of `Surfaced`
 * — the floor stays an `Adornment` fixture (excluded from the room's
 * enumerated contents), NOT a discrete-resting surface; discrete
 * containment is untouched. A puddle is the floor's attribute, not a
 * Stuff. The slot is authored on per its seed (`surfaceBulk: true`).
 */

import Thing from '../lib/stuff/Thing';
import { VisibleMixin } from '../lib/description/Visible';
import { DetailedMixin } from '../lib/description/Detailed';
import { AdornmentMixin } from '../lib/boundary/Adornment';
import { SlottedMixin } from '../lib/slot/Slotted';
import { PosturedMixin } from '../lib/slot/Postured';
import { BulkableMixin } from '../lib/bulk/Bulkable';

const FloorBase = BulkableMixin(
  PosturedMixin(
    SlottedMixin(AdornmentMixin(DetailedMixin(VisibleMixin(Thing)))),
  )
);

export default class Floor extends FloorBase {}

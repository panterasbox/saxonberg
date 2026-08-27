/**
 * Bed — a dorm's sleeping surface. A university-owned in-room fixture
 * (invariant, respawned from template), seeded into each `DormRoom` via its `populates:` data (the spine's
 * seed-once). A rest surface; no `Named` (a generic labelled thing).
 *
 *   Postured → Slotted → Surfaced → Detailed → Thing
 *     (Thing already carries Tangible/Visible)
 *
 * ## Why it gained a posture slot
 *
 * It was a `Surfaced` prop you could set things ON but could not lie IN,
 * which stopped being harmless the moment **sleep-as-logout** shipped. The
 * rest model recovers by `posture × restQuality` on a reconcile-on-read
 * clock, so a bed you can occupy is recovery you keep while you are away —
 * and the dorm is the residence every player currently has. A mechanic
 * nobody can reach is not shipped.
 *
 * `Surfaced` is kept rather than replaced, because the two are orthogonal:
 * `Surfaced` is what rests ON the bed, the posture slot is who rests IN it.
 *
 * **The composition changed here; the template path did not.** Every live
 * dorm room holds a record keyed by its unit parcel, and a `class:` edit on
 * a live template row is a data migration rather than a refactor. So the
 * capability lands on the class and the slot spec + `restQuality` land as
 * seed DATA — exactly the way `/platform/thing/Chair` does it, and the reason this
 * retrofit is a seed edit instead of a migration.
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { SurfacedMixin } from '../../../lib/spatial/Surfaced';
import { SlottedMixin } from '../../../lib/slot/Slotted';
import { PosturedMixin } from '../../../lib/slot/Postured';
import type { FieldMeta } from '../../../lib/mixin';

const BedBase = PosturedMixin(SlottedMixin(SurfacedMixin(DetailedMixin(Thing))));

export default class Bed extends BedBase {
  static fieldMeta: FieldMeta = {};
}

/**
 * Bed — a dorm's sleeping surface. A university-owned in-room fixture
 * (invariant, respawned from template), seeded into each `DormRoom` via its `props:` data (the spine's
 * seed-once). A rest surface; no `Named` (a generic labelled thing).
 *
 *   Postured → Slotted → Placing → Detailed → Thing
 *     (Thing already carries Tangible/Visible)
 *
 * ## Why it gained a posture slot
 *
 * It was a `Placing` prop you could set things ON but could not lie IN,
 * which stopped being harmless the moment **sleep-as-logout** shipped. The
 * rest model recovers by `posture × restQuality` on a reconcile-on-read
 * clock, so a bed you can occupy is recovery you keep while you are away —
 * and the dorm is the residence every player currently has. A mechanic
 * nobody can reach is not shipped.
 *
 * `Placing` is kept rather than replaced, because the two are orthogonal:
 * `Placing` is what sits ON the bed, the posture slot is who rests IN it.
 *
 * **The composition changed here; the template path did not.** Every live
 * dorm room holds a record keyed by its unit parcel, and a `class:` edit on
 * a live template row is a data migration rather than a refactor. So the
 * capability lands on the class and the slot spec + `restQuality` land as
 * seed DATA — exactly the way `/platform/thing/Chair` does it, and the reason this
 * retrofit is a seed edit instead of a migration.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { PlacingMixin } from '@saxonberg/server/mud/lib/spatial/Placing';
import { SlottedMixin } from '@saxonberg/server/mud/lib/slot/Slotted';
import { PosturedMixin } from '@saxonberg/server/mud/lib/slot/Postured';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const BedBase = PosturedMixin(SlottedMixin(PlacingMixin(Good)));

export default class Bed extends BedBase {
  static fieldMeta: FieldMeta = {};
}

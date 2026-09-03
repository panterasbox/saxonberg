/**
 * MineRoom — the concrete room class the four procedural type rows name.
 *
 * ⭐⭐ **One class, four rows.** `Face`, `Junction`, `Stope` and `Fall`
 * differ by their prose banks and their shape in the fiction, not by
 * their code — so they are LOCALITY content over this one trade class,
 * and a second mine supplies sandstone galleries or ice caves without a
 * line of TypeScript. That is the falsifiable test the whole trade is
 * built on.
 *
 * The composition, outermost first:
 *
 *  - **`PersistableMixin`** — the host rule (its `cleanupOnDestruct` must
 *    fire before the inner `Container` evacuates). ⚠ Over the PERMISSIVE
 *    `CartesianLocation`, never the singleton one, because a working is a
 *    KIND of place minted many times. It is safe here only because every
 *    instance is **keyed** (`<claimExtent>/<cell>`, through
 *    `restoreOrSeed`) — a keyless persistable over a permissive base
 *    would silently share ONE `holder_snapshots` scope across every mint.
 *  - **`WarrenMemberMixin`** — the back-ref, and the seam `survey` reads
 *    the mine through.
 *  - **`WorkingMixin`** — the three reads, which consult neither of the
 *    two above.
 *
 * A bespoke hand-authored mine either names this class directly or
 * composes `WorkingMixin` over a room class of its own; both behave
 * identically, because nothing in the reads consults how the room came
 * to exist.
 */

import CartesianLocation from '@saxonberg/server/mud/platform/location/CartesianLocation';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { WorkingMixin } from '../lib/Working';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const MineRoomBase = PersistableMixin(WarrenMemberMixin(WorkingMixin(CartesianLocation)));

export default class MineRoom extends MineRoomBase {
  static fieldMeta: FieldMeta = {};
}

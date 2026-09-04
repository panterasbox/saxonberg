/**
 * AuthoredWorking — ⭐⭐ **a hand-cut mine room, and the class that makes
 * the exemplar claim TRUE rather than aspirational.**
 *
 * The whole of P18 is *the warren creates rooms; it does not interpret
 * them* — every read derives from the room and its zone, so a bespoke
 * hand-authored mine works with no warren at all. That claim is only
 * real if there is a class an author can put on a hand-placed room, and
 * for one wave there was not: {@link MineRoom} is the MINTED face
 * (permissive base, keyed per cell), and an authored gallery is one row,
 * one place.
 *
 * ⚠ **Found by driving.** Rejection's three authored galleries were
 * plain `SingletonCartesianLocation`s, so the tutorial drift — the room
 * whose entire job is teaching `hew` and `shore` on safe ground — had no
 * faces, no stability, no air and no acts. The reads existed; nothing
 * was composing them.
 *
 * `SingletonCartesianLocation` and not the permissive base: **one row IS
 * one place**, and the mixin SUBTRACTS, so the singleton guard catches a
 * second `clone()` of a gallery that should only ever be itself.
 *
 * ⚠ Not `Persistable`, deliberately. An authored room's fixtures come
 * from its own `props:` on every boot, and anything a player leaves in it
 * is chattel, which persists owner-side. A Held CARVED cell is the thing
 * that needs a record, and {@link MineRoom} has one.
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { WorkingMixin } from '../lib/Working';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class AuthoredWorking extends WorkingMixin(SingletonCartesianLocation) {
  static fieldMeta: FieldMeta = {};
}

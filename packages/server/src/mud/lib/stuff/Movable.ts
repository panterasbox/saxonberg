/**
 * Movable — a thing you can carry off, and therefore own and hide.
 *
 * Composition: `ChattelMixin(ConcealableMixin(Thing))`.
 *
 * ⭐⭐ **The line (D13): `Thing` is matter; `Movable` is a GOOD.** The two
 * mixins this rung adds are not attributes of matter — they are the two
 * consequences of *portability*:
 *
 * - **`ChattelMixin`** — a durable per-instance identity that unspoofable
 *   ownership is keyed against (empty until stamped; fungible stacks stay
 *   owned-by-possession). Something you cannot carry off is owned by
 *   whoever holds the PARCEL, which is real-property title and a wholly
 *   different substrate — see `docs/subsystems/parcel.md`.
 * - **`ConcealableMixin`** (default `obvious`) — a concealment level
 *   resolved per-viewer by the detection gate (inert until authored). A
 *   hidden cache, a dropped-and-buried item. You cannot hide a floor.
 *
 * Both are additive attribute mixins; composition order is moot.
 *
 * ⚠ Until 2026-09-29 both sat on the `Thing` root, so every floor,
 * hearth, counter, forge and yard wall in the game composed surface
 * claiming it could be owned as a chattel and hidden from view. Nothing
 * ever stamped one — the defect was in what the classes CLAIMED, which is
 * the author surface and therefore the thing `callable == visible ==
 * cared-about` is about.
 *
 * The concrete twin for rows that want exactly a bare good and nothing
 * more — an anvil, a folded hide, a stash pouch — is
 * `platform/thing/Movable`. Rows that want bare *immovable* matter — a
 * yard wall, a toilet, a midden — name `platform/thing/Thing`.
 */

import Thing from './Thing';
import { ChattelMixin } from '../chattel/Chattel';
import { ConcealableMixin } from '../concealment/Concealable';
import type { FieldMeta } from '../mixin';

const MovableBase = ChattelMixin(ConcealableMixin(Thing));

export default class Movable extends MovableBase {
  static fieldMeta: FieldMeta = {};
}

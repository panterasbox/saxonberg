/**
 * Good — **a thing that can belong to somebody.**
 *
 * Composition: `ChattelMixin(ConcealableMixin(Thing))`.
 *
 * ⭐⭐ **The line (D13): `Thing` is matter; a `Good` is matter somebody
 * can own.** The two mixins are the two halves of that:
 *
 * - **`ChattelMixin`** — a durable per-instance identity that
 *   unspoofable ownership is keyed against (empty until stamped;
 *   fungible stacks stay owned-by-possession). Ownership of a thing
 *   that is part of the PLACE belongs to whoever holds the parcel,
 *   which is real-property title and a wholly different substrate —
 *   `docs/subsystems/parcel.md`.
 * - **`ConcealableMixin`** (default `obvious`) — a concealment level
 *   resolved per-viewer by the detection gate. A thing somebody can
 *   own is a thing somebody can put out of sight; you cannot hide a
 *   floor.
 *
 * Both are additive attribute mixins; composition order is moot.
 *
 * ⚠ Until 2026-09-29 both sat on the `Thing` root, so every floor,
 * hearth, counter, forge and yard wall in the game composed surface
 * claiming it could be owned and hidden. Nothing ever stamped one — the
 * defect was in what the classes CLAIMED, which is the author surface
 * and therefore what `callable == visible == cared-about` is about.
 *
 * ## ⚠⚠ It was called `Movable`, and that name was wrong twice over
 *
 * **It read as an interface.** Every other `-able`/`-ible` name in the
 * kernel is a mixin, except `Workable`, which is an interface. In this
 * codebase the suffix *means* mixin-or-interface, so a class wearing it
 * is a category error at a glance.
 *
 * ⭐ **And it was false.** This rung composes nothing that makes a thing
 * movable. What decides whether you can pick something up is
 * `fixedInPlace`, a field on `ContainableMixin` — which is on `Thing`,
 * the PARENT. So "movable" named a cause living one rung down, and it
 * was wrong about the members where that cause does not hold:
 * **`Chair` and `Fitting` both set `fixedInPlace = true`** and both
 * extend this class. We had immovable Movables; a bolted-down back-bar
 * was one.
 *
 * ⭐⭐ The word was in the prose the whole time. Every docstring, commit
 * message and wiki page about this rung said *"a good is what you can
 * carry off"* and not one said *"a movable"* — and
 * `PersistableOrganizationGoods.test.ts` had already written
 * `class Good extends Movable {}`. The same tell this build kept
 * finding elsewhere, pointed at itself.
 *
 * ⚠ *Good* is the economic sense — any tangible article, not a valuable
 * one. Gutter litter is a poor good, not a non-good.
 *
 * The concrete twin for rows that want exactly a bare good and nothing
 * more — an anvil, a folded hide, a stash pouch — is
 * `platform/thing/Good`. Rows that want bare *immovable* matter — a
 * yard wall, a toilet, a midden — name `platform/thing/Thing`.
 */

import Thing from './Thing';
import { ChattelMixin } from '../chattel/Chattel';
import { ConcealableMixin } from '../concealment/Concealable';
import type { FieldMeta } from '../mixin';

const GoodBase = ChattelMixin(ConcealableMixin(Thing));

export default class Good extends GoodBase {
  static fieldMeta: FieldMeta = {};
}

/**
 * Holder — **matter that holds other matter.**
 *
 * Composition: `Holder`.
 *
 * ⭐⭐ **The container taxonomy is a CHAIN, and this is the link that was
 * missing.** There are exactly four rungs and each adds one idea:
 *
 * ```
 * Container (the mixin)
 *  ├── Location        holds, is not held        a place you stand in
 *  └── Holder          holds, is held            a counter, a shelf, a warehouse
 *        └── Vessel      …and can be OWNED        a chest, a pack, a crate
 *              └── ExitableVessel  …and has air and a door   a coach, a barge
 * ```
 *
 * ⚠ **Why it had to exist.** Until the base-class narrowing `Vessel` was
 * the only container-object, and `Vessel` now sits on `Good` — so it
 * claims `Chattel` and `Concealable`, which a shop counter, a bank
 * counter and a warehouse cannot. Seven fixtures fell out of the bottom
 * of it and each wrote `Holder` by hand. Seven copies of
 * one composition with nothing to stop an eighth is the shape this file
 * closes: **the next immovable container extends this class.**
 *
 * ⭐ `Vessel` is its SUBCLASS, not its sibling — `Chattel(Concealable(
 * Holder))`, which is the same mixin set it had as `Container(Good)`,
 * reordered. Both are additive attribute mixins and order among them is
 * moot. A chest genuinely *is* a thing that holds things, plus ownable.
 *
 * ## ⚠⚠ Three container-ish nouns, and the boundary between them
 *
 * Stated here because three such names with no stated boundary is how a
 * taxonomy grows an eighth branch by accident:
 *
 * - **`Holder`** — holds DISCRETE things and is itself held somewhere.
 *   Ownership, if it has any, is the PARCEL's: a warehouse belongs to
 *   whoever holds the ground under it.
 * - **`Vessel`** — a `Holder` that is also a `Good`: an article of
 *   property with a chattel identity, which can change hands and be put
 *   out of sight.
 * - **`Receptacle`** (`platform/thing/`) — not in this chain at all. It
 *   holds BULK, not discrete contents (`Thermal(Bulkable(Good))`), and
 *   the thing it holds is poured rather than put.
 *
 * ⚠ `Receptacle`'s own docstring says it was *"named `Receptacle`, not
 * `Vessel`, to stay clear of the existing `lib/stuff/Vessel`"* — a name
 * chosen defensively rather than chosen. Classically a *vessel* is a
 * liquid container and a *receptacle* is the general one, so those two
 * are arguably swapped; re-seating them is a three-way rename across
 * the bulk subsystem and is filed, not done here.
 *
 * ⭐ And the name: *holder* was good enough for a bag of holding, which
 * this tree already says twice.
 */

import Thing from './Thing';
import { ContainerMixin } from '../spatial/Container';
import type { FieldMeta } from '../mixin';

const HolderBase = ContainerMixin(Thing);

export default class Holder extends HolderBase {
  static fieldMeta: FieldMeta = {};
}

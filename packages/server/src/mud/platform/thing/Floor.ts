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
 * ⭐⭐ **Every Location has one, since the ground build.** The v1 note
 * that used to sit here — *"no class-level default; the choice of which
 * Locations include a floor adornment is per-template authoring"* — is
 * retired: 27 of 180 Locations had a floor, `sit` / `lie` / `kneel`
 * declined in the room a new player opens their eyes in, and *"per-template
 * authoring"* is not a choice anybody was making. `Location.ensureFloor()`
 * now mints one at `postRegister` unless the row says `noDefaultFloor`.
 *
 * The capability is `FloorMixin` (`lib/ground/Floor.ts`) — the keyword
 * union, the canonical `ground:1` slot, the five-rung material ladder and
 * the derived kind. This class is the instanceable twin (the shared-stem
 * pattern: `lib/ground/Floor.ts` is substrate, `platform/thing/Floor.ts`
 * is what a row's `class:` names).
 *
 * Default-floor row at the generic-objects pack's `content/stuff/thing/surface/default-floor.yaml`.
 *
 * Surface-bulk: the floor composes `BulkableMixin` so a spilled,
 * over-poured, or drained-through liquid pools as the floor's
 * **surface** bulk slot (a puddle). This is independent of `Placing`
 * — the floor stays an `Adornment` fixture (excluded from the room's
 * enumerated contents), NOT a discrete-resting surface; discrete
 * containment is untouched. A puddle is the floor's attribute, not a
 * Stuff. The slot is authored on per its seed (`surfaceBulk: true`).
 */

import Thing from '../../lib/stuff/Thing';
import { VisibleMixin } from '../../lib/description/Visible';
import { AdornmentMixin } from '../../lib/boundary/Adornment';
import { SlottedMixin } from '../../lib/slot/Slotted';
import { PosturedMixin } from '../../lib/slot/Postured';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { FloorMixin } from '../../lib/ground/Floor';

// FloorMixin is OUTERMOST: its `getMaterial` / `getKeywords` /
// `getSlotNames` overrides have to see the composed stack's answers
// through `super` before they add their own.
const FloorBase = FloorMixin(
  BulkableMixin(
    PosturedMixin(
      SlottedMixin(AdornmentMixin(VisibleMixin(Thing))),
    )
  )
);

export default class Floor extends FloorBase {
  constructor() {
    super();
    // ⭐⭐ **Fixed in place, because it is the place.** Found by the
    // base-class narrowing's own drive: `get floor` answered *"You pick
    // up a featureless plain floor"* and put the ground of the room into
    // the player's hands. Every locality's floor is minted at
    // `postRegister` and none of them said this, so it was true of every
    // room in the game.
    //
    // ⚠ Note what did NOT catch it. `AdornmentMixin`'s not-portable
    // invariant only fires when `adornedTo` is non-null, and a minted
    // floor is contained, not hung — so the one guard on the stack was
    // structurally unable to see this. `fixedInPlace` is the field that
    // says *no agent pockets it*, and `place` and a remodel still move
    // it, which is what a floor needs.
    this.fixedInPlace = true;
  }
}

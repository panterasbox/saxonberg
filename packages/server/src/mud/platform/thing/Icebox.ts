/**
 * Icebox — ⭐ **a cold box whose cold is a thing you carry in.**
 *
 * The passive rung of the cold ladder and the first object in the game
 * that can satisfy a kitchen's `coldStorage` capability. A chest-sized
 * insulated box on legs: put a block of ice in it, shut the lid, and
 * what is inside keeps until the ice is gone. No setpoint, no power, no
 * bill — a fridge is the next rung and a different build.
 *
 * `CoolboxMixin(SealableMixin(ThermalMixin(ContainerMixin(Movable))))`
 *
 * ⭐ **A plain `Container`, deliberately — region zero, not a
 * compartment.** By the placement taxonomy a `Chamber` is *the
 * compartment inside a holder*; an icebox IS the holder, with nothing
 * inside it but its interior. You put things IN it and it holds them.
 * Making it a compartment so the `in` vocabulary member had a composer
 * would be choosing the class for the vocabulary's sake — the model
 * claiming a division that is not there. See the placement plan D10/D17.
 *
 * ⚠ **Seeded SHUT**, and that inverts the larder's rule on purpose. The
 * craft gather walk descends one level into OPEN room containers, so an
 * open larder is ingredients in reach; a shut icebox's contents are out
 * of reach, out of the `peers` scope, out of sight and out of the
 * gather walk — every one of those reads the same lid. To keep food you
 * open it, put the food in, and shut it; to cook from it you open it.
 * That is a real icebox, and it is shipped behaviour: this class adds
 * no site.
 *
 * ⭐ **Fixed in place.** A chest-sized box on legs full of ice is not a
 * thing you pocket — the back-bar rule. What you carry is the ice.
 *
 * ⭐ *A second cold box is a row naming this class with its own walls.*
 */

import Movable from '../../lib/stuff/Movable';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { CoolboxMixin } from '../../lib/thermal/Coolbox';
import { StagedMixin } from '../../lib/stuff/Staged';
import type { FieldMeta } from '../../lib/mixin';

// ⭐ `StagedMixin`, as `Chest` has it: a row may ship an icebox with
// something already in it. That is how a venue stocks its cold — and
// it is the only honest way, because ice left LOOSE in a warm kitchen
// is gone in game-minutes (correct physics: a bare block's own R is
// tiny). The generic row below ships EMPTY; a venue that keeps ice
// says so with `extends:` and a `props:` line.
const IceboxBase = CoolboxMixin(
  SealableMixin(
    StagedMixin(ThermalMixin(ContainerMixin(Movable))),
  ),
);

export default class Icebox extends IceboxBase {
  static fieldMeta: FieldMeta = {};

  constructor() {
    super();
    this.fixedInPlace = true;
  }
}

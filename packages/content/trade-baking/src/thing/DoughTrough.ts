/**
 * DoughTrough — where dough is made, and where it proofs.
 *
 * `ManualBuildMixin(Vat)`. Two jobs in one object, and they are the same
 * object for a reason a kitchen would recognise: you mix the dough in
 * the trough and then you leave it in the trough, because moving a wet
 * dough is a nuisance and nobody does it.
 *
 * Mechanically the two jobs are quite different substrates:
 *
 *  - **`ManualBuildMixin`** — `pour` banks contributions into a build
 *    buffer and `knead` mints them into matter;
 *  - **`Vat`** — `MaturingMixin` over `BulkableMixin` + `SealableMixin`,
 *    which is the shipped ferment substrate the cellars already use.
 *
 * ⭐ And the seal is the design, not plumbing. `Vat` brings `Sealable`,
 * and a cloth over the trough IS the seal: leave it OFF and wild flora
 * settle out of the air (`spontaneousLagDays`), put it ON and nothing
 * gets in and you must pitch a culture from the crock. The choice
 * between a sourdough that takes a day to catch and a barm you pitched
 * this morning is a real one, made by whether you covered the bowl.
 *
 * ⚠ `Bulkable` is MANDATORY beneath `Maturing`
 * (`MaturingMixin.__validateComposition__` throws without it) — the
 * ferment rides the VESSEL, never the matter, which is the shipped
 * decision (D2 of the fermentation build) and the reason a trough can
 * be a ferment at all.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { ManualBuildMixin } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

/**
 * ⚠ A STATIC ON THE CLASS. A row's `commandContributions:` is dead
 * silently — a mistake this codebase has already paid for once.
 */
const BAKING = [
  'platform/cmd/crafting/pour.yaml',
  'trade/baking/cmd/baking/knead.yaml',
  'trade/baking/cmd/baking/bake.yaml',
];

export default class DoughTrough extends ManualBuildMixin(Vat) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: BAKING,
    peers: BAKING,
  };

  constructor() {
    super();
    this.category = 'trough';
    this.setInteriorCapacity(Quantity.of(20, 'L'));
  }
}

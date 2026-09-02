/**
 * MineZone — a `CartesianZone` that knows which orebody lies under it.
 *
 * ⚠⚠ **A pack cannot add a field to a kernel class, and the failure is
 * SILENT.** `deposit:` was authored straight onto Rejection's region
 * zone, which is a plain `CartesianZone` — and `fieldMeta` is what the
 * hydrator reflects through, so an undeclared key is simply discarded.
 * The zone came up with no deposit, `Working.getDeposit()` answered
 * `null`, `facesOf()` returned nothing, and `hew west` said *"You can't
 * cut 'west' here"* in a room with a seam visibly running through the
 * face. Found by driving; no test could have caught it, because every
 * fixture set the field directly on the object.
 *
 * So the trade ships the class and the venue authors the row — the same
 * shape as {@link MineRoom} and the four type rows, and for the same
 * reason.
 *
 * ⭐ **Put it on the zone that COVERS both halves.** `Zone.lookupField`
 * walks outward, so a `deposit:` on a region zone is inherited by the
 * surface pithead AND the workings under it — and that matters: the
 * outcrop, the float and the three-point problem are all played above
 * ground, so a deposit declared only on the mine zone would leave a
 * prospector standing on the stain with nothing to measure. It is also
 * what makes a second mine's zone pair a pure content copy.
 */

import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class MineZone extends CartesianZone {
  static fieldMeta: FieldMeta = {
    deposit: { persistent: true, authorable: true },
  };

  /**
   * The `Deposit` row governing the ground here. `null` falls through to
   * the enclosing zone, exactly as every other zone-carried field does.
   *
   * ⚠ The GETTER is load-bearing, not decoration: `Zone.lookupField`
   * prefers `get<PascalCase>()` over the raw property (the inter-Stuff
   * contract surface), so without it the walk would be reaching past the
   * method surface into a field.
   */
  protected deposit: string | null = null;

  public getDeposit(): string | null { return this.deposit; }
  public setDeposit(value: string | null): void { this.deposit = value ?? null; }
}

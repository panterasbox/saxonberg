/**
 * Vat — the fermenting vessel (fermentation P5): the ONE concrete every
 * trade's ferment rows name. `FermentingMixin` over
 * `Crafted + Sealable + Thermal + Bulkable + Detailed + Thing` — a
 * bulk holder that ferments what its interior holds, drifts toward its
 * room's temperature (the cold cellar is a place), keeps or turns by
 * its seal (D3), and carries the batch's grade + maker's mark on its
 * Crafted face so the W0 transfer seam stamps every bottle racked from
 * it.
 *
 * Sizes and shapes are authored DATA: a carboy is a small vat row, a
 * conditioning bottle/cask is a row over this same class with a
 * `sealedOnly` profile (sparkling wine, real ale — P5/P9). No second
 * mechanism, no mixin on `Bottle`.
 *
 * The seal verbs are the shipped `open`/`close` (Sealable — the vat's
 * bung); racking is `pour`; bottling is `fill`. Zero new verbs (P4):
 * fermenting itself is passive on the vat, and the craft is timing and
 * conditions.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { FermentingMixin } from '../../lib/ferment/Fermenting';
import { Quantity } from '../../lib/quantity';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';

const VatBase = FermentingMixin(
  CraftedMixin(
    SealableMixin(ThermalMixin(BulkableMixin(DetailedMixin(Thing)))),
  ),
);

export default class Vat extends VatBase {
  constructor() {
    super();
    // Host-internal writes (the constructor IS the class body — the
    // Bottle precedent). A row's `data:` overrides any of these through
    // the hydrator: a carboy authors a smaller capacity, a conditioning
    // cask its own closure.
    this.interiorBulk = true;
    this.category = 'vat'; // the vessel KIND; rows depart (carboy, cask)
    this.setInteriorCapacity(Quantity.of(100, 'L'));
    this.setClosure('liquidTight');
    this.setKeywords(['vat']);
    this.setPrimaryKeyword('vat');
  }

  // Seal toggles and moves are WINDOW EVENTS (P1): reconcile the batch
  // under the OLD conditions first, then flip, then re-anchor the
  // thermal drift (the Flask precedent). This is what makes "credit
  // the closed window at its conditions" honest — the open time past
  // finished and the cellar move are each credited exactly.

  public override setOpen(value: boolean): void {
    this.reconcileFerment();
    super.setOpen(value);
    void this.restamp();
  }

  public override open(): void {
    this.reconcileFerment();
    super.open();
    void this.restamp();
  }

  public override close(): void {
    this.reconcileFerment();
    super.close();
    void this.restamp();
  }

  public override onMoved(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null,
  ): void {
    this.reconcileFerment();
    super.onMoved(from, to);
  }
}

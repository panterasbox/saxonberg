/**
 * Vat — the fermenting vessel (fermentation P5): the ONE concrete every
 * trade's ferment rows name. `MaturingMixin` over
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

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { MaturingMixin } from '../../lib/maturation/Maturing';
import { Quantity } from '../../lib/quantity';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { VesselKindMixin } from '../../lib/bulk/VesselKind';
import type { ClosureLevel } from '../../lib/bulk/Bulkable';
import type { FieldMeta } from '../../lib/mixin';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { DurableMixin } from '../../lib/material/Durable';
import { AssembledMixin } from '../../lib/craft/Assembled';

// Merge of two independent changes: master wrapped the vat in
// `VesselKindMixin`; this branch renamed `FermentingMixin` to
// `MaturingMixin` (bleaching is a photochemical maturation, not a
// ferment — see maturation.md). Both apply.
// ⭐ Durable + Assembled (assembly D8): a vessel wears, and may be made of
// staves — which is what lets `repair <cask>` reach its controller at all
// (the view gates on `DurableMixin`).
const VatBase = VesselKindMixin(
  MaturingMixin(
    AssembledMixin(
      DurableMixin(
        CraftedMixin(SealableMixin(ThermalMixin(BulkableMixin(Good)))),
      ),
    ),
  ),
);

/** How far an empty cask's hoops ride loose when it dries out. */
const DRY_OUT_SLACK = 0.6;

/** Numeric AppSetting read with the seeded fallback. */
function vatDial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default class Vat extends VatBase {
  /** Game-seconds it was first read empty; 0 = wet (or never read empty). */
  public emptySince = 0;

  static fieldMeta: FieldMeta = {
    emptySince: { persistent: true, runtimeState: true },
  };

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

  /**
   * ⭐ The authored closure is the CEILING; the joints are the floor
   * (assembly D10). A vessel made of staves holds what its build allows
   * only while every structural member is sound and every joint is tight —
   * a sprung stave or a slack hoop and it weeps, whatever the row says.
   */
  public override getClosure(): ClosureLevel {
    this.reconcileDrying();
    return this.leaks() ? 'open' : super.getClosure();
  }

  /**
   * ⭐⭐ **A cask left standing EMPTY dries out, and its hoops slip**
   * (assembly AC 6, drive 8) — why a cooper keeps a cask wet, and why an
   * empty one weeps the first time it is filled again. The staves shrink
   * as they dry and the hoops ride loose with every stave still sound: a
   * joint failing with every part undamaged, and the repair (drive the
   * hoops back down) consumes nothing.
   *
   * Reconciled on read: the first read that finds it empty starts the
   * clock; a read that finds it full stops it. After
   * `cask.dryOutDays` empty, every joint slackens once — by its row's
   * looseness, so a slack barrel's hoops go further than a tight cask's.
   */
  public reconcileDrying(): void {
    if (!this.isAssembly() || this.getJoints().length === 0) return;
    const now = WorldClockApi.getNow().rawValue();
    if (!this.isBulkEmpty('interior')) {
      this.emptySince = 0;
      return;
    }
    if (this.emptySince === 0) {
      this.emptySince = now;
      return;
    }
    const days = vatDial(AppSettingKeys.caskDryOutDays, 7);
    if (now - this.emptySince < days * 86_400) return;
    // Once per drying-out: restart the clock so it does not slacken again
    // until it has been wetted and left empty again.
    this.emptySince = Number.MAX_SAFE_INTEGER;
    for (const j of this.getJoints()) this.slackenJoint(j.key, DRY_OUT_SLACK);
  }

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

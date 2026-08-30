/**
 * Bottle — the stock vessel every floor product is a row over.
 *
 * `CirculatingMixin(SealableMixin(DetailedMixin(GradedReceptacle)))` on
 * top of `Thing`'s own `Chattel`: a graded, branded bulk holder that
 * **keeps** when capped (`Sealable` — the pour verbs ask `isOpen()`),
 * that **counts** in the regional census (`Circulating` — the spawn
 * sweep is the sanctioned faucet a producer's floor stock stands at
 * target through), and whose **ownership** is a durable fact
 * (`Chattel` — consignment keys on `_chattelId`).
 *
 * A trade pack authors the preset as a ROW (`keg`, `cask`, `wine-bottle`,
 * `can`, `sack`, `ice-bag` — capacity, closure, keywords, material) or
 * extends the class where it needs code (`trade-distilling`'s
 * `SpiritBottle`). Defaults here are the bottle every preset departs
 * from: a 0.75 L glass bottle, liquid-tight, capped.
 *
 * `censusKey` derives from the interior material's primary keyword when
 * unauthored (`material:gin`), so a floor row counts the moment it names
 * what it holds — a row that wants a coarser bucket (`spirit:gin`) says
 * so. ⭐ An EMPTY vessel is not product and never counts as its authored
 * bucket — it counts under its VESSEL KIND (`category`), which is what
 * ties `can.yaml` to `can-of-cola.yaml`. That rule is general and lives
 * on `CirculatingMixin`; only the unauthored-material fallback is here.
 */

import GradedReceptacle from './GradedReceptacle';
import { DetailedMixin } from '../../lib/description/Detailed';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { CirculatingMixin } from '../../lib/residency/Circulating';
import { Quantity } from '../../lib/quantity';

const GLASS = '/stuff/idea/material/glass/glass';

const BottleBase = CirculatingMixin(SealableMixin(DetailedMixin(GradedReceptacle)));

export default class Bottle extends BottleBase {
  constructor() {
    super();
    // Host-internal writes (the constructor IS the class body — the
    // arcana `Potion` precedent). A row's `data:` overrides any of these
    // through the hydrator exactly as on a bare GradedReceptacle.
    this._materialPath = GLASS;
    this.interiorBulk = true;
    this.setInteriorCapacity(Quantity.of(0.75, 'L'));
    this.setClosure('liquidTight');
    this.setKeywords(['bottle']);
    this.setPrimaryKeyword('bottle');
  }

  /**
   * The unauthored fallback: a floor row that names what it holds counts
   * the moment it does (`material:gin`), so a row wanting a coarser
   * bucket (`spirit:gin`) says so and anything else still counts.
   *
   * ⭐ The *empty* case is not here — it is the general rule on
   * `CirculatingMixin.getCensusKey`, which every circulating holder gets
   * (a Container-only `Crate` had the bug for as long as this lived on
   * `Bottle` alone). `super` returns `vessel:<kind>` for an empty and the
   * authored key otherwise; only the unauthored-and-filled case is a
   * bottle-specific question, because only a Bulkable has an interior
   * material to name.
   */
  public override getCensusKey(): string {
    const key = super.getCensusKey();
    if (key.length > 0) return key;
    const material = this.getBulkMaterial('interior');
    const kw = material?.getPrimaryKeyword() ?? material?.getName();
    return kw ? `material:${kw.toLowerCase()}` : '';
  }
}

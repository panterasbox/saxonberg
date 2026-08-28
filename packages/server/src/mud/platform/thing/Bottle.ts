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
 * so.
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

  /** The authored bucket, else `material:<interior primary keyword>`. */
  public override getCensusKey(): string {
    const authored = super.getCensusKey();
    if (authored.length > 0) return authored;
    const material = this.getBulkMaterial('interior');
    const kw = material?.getPrimaryKeyword() ?? material?.getName();
    return kw ? `material:${kw.toLowerCase()}` : '';
  }
}

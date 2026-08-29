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
 * ties `can.yaml` to `can-of-cola.yaml`. See `getCensusKey` below.
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
   * ⭐ The census counts PRODUCT, and product is a filled vessel.
   *
   * An emptied bottle is not a bottle of gin any more — it is a bottle.
   * Deriving the key from **state** rather than reading the authored row
   * is what makes the faucet honest: drain the world's gin and the
   * shortfall is real, so the sweep restocks. Reading the authored key
   * unconditionally (the shipped behaviour before this) left every empty
   * counting as product for ever, so a world drunk dry read as *at
   * target* while the shelf stood bare.
   *
   * An empty's own key is `vessel:<primary keyword>` — derived, never
   * authored, so nothing can target it and the sweep never mints
   * empties (they come from drinking). It is also the count a returns
   * or deposit market would read.
   *
   * A vessel with no interior slot at all is not a product either way,
   * and keeps its authored key.
   */
  public override getCensusKey(): string {
    if (this.hasInteriorBulk() && this.getBulkAmount('interior').rawValue() <= 0) {
      // The VESSEL KIND first (`category` on Bulkable: `can`, `keg`,
      // `sack`), so a drained can of cola counts with the empty cans
      // rather than under its own product keyword — the empty-vessel
      // row and the product row share one census the moment both
      // declare the kind. Falls back to the keyword for a row that
      // declares none.
      const kind = this.getCategory() || this.getPrimaryKeyword();
      return kind ? `vessel:${kind.toLowerCase()}` : '';
    }
    const authored = super.getCensusKey();
    if (authored.length > 0) return authored;
    const material = this.getBulkMaterial('interior');
    const kw = material?.getPrimaryKeyword() ?? material?.getName();
    return kw ? `material:${kw.toLowerCase()}` : '';
  }
}

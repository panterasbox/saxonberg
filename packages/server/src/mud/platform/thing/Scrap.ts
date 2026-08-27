/**
 * Scrap — the fungible salvage stack: `GlobbableMixin(Thing)` (the Coin
 * precedent), material-stamped per salvage, **quantity by mass** (one
 * unit = {@link Scrap.UNIT_KG}). The non-metal half of salvage's
 * matter-typed outputs (metal returns as re-meltable Castings) and the
 * soft-goods repair stock. Provenance-less by construction — the
 * value-add died with the form (the entropy sink).
 */

import Thing from '../../lib/stuff/Thing';
import { GlobbableMixin } from '../../lib/stuff/Globbable';

const ScrapBase = GlobbableMixin(Thing);

export default class Scrap extends ScrapBase {
  /** One scrap unit's mass (kg) — quantity counts these. */
  static readonly UNIT_KG = 0.1;
}

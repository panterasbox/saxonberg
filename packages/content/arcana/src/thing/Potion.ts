/**
 * Potion — a **preset Receptacle** (D5): the glassware a catalog potion
 * ships in, with the boilerplate every such row used to repeat set as
 * constructor defaults — glass, a 0.25 L interior (the reference dose),
 * the `flask`/`vial`/`potion`/`draught` keywords — so a catalog potion
 * is three lines: a description, `interiorMaterial`, `interiorAmount`.
 * Every field a row may still override through the ordinary hydrator.
 *
 * NOT a consumable and never a one-shot like `Scroll`: the potion is
 * the LIQUID, a `PotionMaterial` riding `Bulkable` inside this vessel —
 * which is what buys dose, dilution, splitting and spilling (magic-items
 * D4, kept). Identity rides the material too (`Identifiable` is on
 * `PotionMaterial`, where the `potion` descriptor class is authored),
 * so this class carries no descriptor of its own: the flask reads the
 * same to everybody; what is in it does not. The class is what makes
 * `/stuff/thing/magic/potion-of-mana` a thing a player clones and
 * recognizes as a potion.
 *
 * Ships in the arcana pack (`/arcana/thing/Potion`).
 */

import Receptacle from '@saxonberg/server/mud/platform/thing/Receptacle';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

/** The commons' glass — what a catalog potion is bottled in unless a row says otherwise. */
const GLASS = '/stuff/idea/material/glass/glass';

export default class Potion extends Receptacle {
  constructor() {
    super();
    // Host-internal writes (the constructor IS the class body): the
    // material by path — the singleton need not be resident yet — and
    // the interior through its own setters. A row's `data:` overrides
    // any of these through the hydrator exactly as on a bare Receptacle.
    this._materialPath = GLASS;
    this.interiorBulk = true;
    this.setInteriorCapacity(Quantity.of(0.25, 'L'));
    this.setKeywords(['flask', 'vial', 'potion', 'draught']);
    this.setPrimaryKeyword('potion');
  }
}

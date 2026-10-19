/**
 * Brazier — a basket of coals on legs: a FLUELESS hearth you can carry
 * (cleanliness D18).
 *
 * A sibling of `Hearth`, not a subclass: it heats the room around it the
 * same way (`SpaceHeating`) and holds a pot on it (`Placing`), and it
 * composes no flue — so nothing it burns goes up a chimney, and all of it
 * goes into the room. Which is what *burn sulfur in a shut room* needs.
 */

import Firebox from '../../lib/fire/Firebox';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { SpaceHeatingMixin } from '../../lib/thermal/SpaceHeating';

const BrazierBase = SpaceHeatingMixin(PlacingMixin(Firebox));

export default class Brazier extends BrazierBase {
  /** A brazier ships cold — `BurnerMixin.lit` defaults true for a campfire. */
  public override lit = false;
}

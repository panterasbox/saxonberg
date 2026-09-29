/**
 * Firebox — a **built-in fire**: a chamber that holds one, burns fuel to
 * keep it and throws light while it does.
 *
 * Composition: `BurnerMixin(LightSourceMixin(ReservedMixin(ThermalMixin(Thing))))`.
 *
 * ⭐⭐ **Four mixins in one order, written six times.** A forge, an oven,
 * a hearth, a campfire, a smelting furnace and a charcoal clamp each
 * declared this exact chain and then added their own two or three: the
 * oven encloses (`Container` + `Placing`), the hearth and the campfire
 * warm the room (`SpaceHeating`), the campfire seats you (`Postured` +
 * `Slotted`). What they share is not a mixin — it is the **order**, and
 * an order written six times is a class nobody had minted.
 *
 * ⚠ **The order is load-bearing and the tests know it.** `Burner`
 * outermost, because igniting and dousing must see the composed answers
 * of everything under them through `super`; `LightSource` next, so a
 * doused lamp goes dark; `Reserved` for the fuel; `Thermal` innermost,
 * because the fuel's heat is what the thermal model integrates. A lit
 * forge does not warm the room and a lit hearth does — that difference
 * is `SpaceHeating` composed OUTSIDE this chain, not a dial inside it.
 *
 * ## ⚠⚠ It sits on `Thing`, and a LAMP does not compose it
 *
 * The base-class narrowing's clusters plan listed `Lamp` as *"`Firebox`
 * + dials"*. It cannot be: a lamp, a lantern and a candle are goods you
 * buy and carry off, so they sit on `Movable`
 * (`Chattel(Concealable(Thing))`), and a forge bolted to a smithy floor
 * does not. The same conflation `Fitting` / {@link Station} resolved one
 * wave earlier — **a shared capability chain is not a shared rung.**
 *
 * So `Lamp` and `trade-distilling`'s `Still` write the same four mixins
 * over `Movable` and point here for the order. ⭐ Two consumers is not
 * three: a `PortableFirebox` twin is declined until something forces it
 * (*promote at the third consumer*), and two duplicated lines are
 * cheaper than a class minted on speculation.
 */

import Thing from '../stuff/Thing';
import { ReservedMixin } from '../reserve';
import { LightSourceMixin } from '../perception/LightSource';
import { ThermalMixin } from '../thermal/Thermal';
import { BurnerMixin } from './Burner';
import type { FieldMeta } from '../mixin';

const FireboxBase = BurnerMixin(
  LightSourceMixin(ReservedMixin(ThermalMixin(Thing))),
);

export default class Firebox extends FireboxBase {
  static fieldMeta: FieldMeta = {};
}

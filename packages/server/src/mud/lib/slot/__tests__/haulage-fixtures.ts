/**
 * Shared fixtures for the haulage suite — a concrete `Cart`
 * (`HaulableMixin(Vessel)`) and a load-bearing `HaulingBearer`
 * (`HaulerMixin(Sensor(Creature))`) wired to a test body plan, so the
 * draft term can be read through the real `getBorneBurden` surface.
 */

import { Creature } from '../../creature/Creature';
import { Vessel } from '../../stuff/Vessel';
import { SensorMixin } from '../../message/Sensor';
import { HaulableMixin } from '../Haulable';
import { HaulerMixin } from '../Hauler';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { bearerOf } from '../../encumbrance/__tests__/encumbrance-fixtures';

/** A concrete dragged container — the cart class for tests. */
class CartBase extends HaulableMixin(Vessel) {}
export class Cart extends CartBase {
  static _mixinName = 'Cart';
}

/** A load-bearing creature that can also haul (the burden-term subject). */
class HaulingBearerBase extends HaulerMixin(SensorMixin(Creature)) {}
export class HaulingBearer extends HaulingBearerBase {
  static _mixinName = 'HaulingBearer';
}

/** Build a cart with a given frame mass + draft factor. */
export function cart(massKg = 25, draftFactor = 0.04): Cart {
  const c = makeStuff(() => new Cart());
  c.setMass(Quantity.of(massKg, 'kg'));
  c.setDraftFactor(draftFactor);
  return c;
}

/** Build a hauling bearer wired to the shared test body plan. */
export function haulingBearer(baseMass = 70): HaulingBearer {
  return bearerOf(() => new HaulingBearer(), baseMass);
}

/** A hauling bearer whose body plan admits `walk` (for the locomotion gates). */
export function walkingHaulingBearer(baseMass = 70): HaulingBearer {
  const b = haulingBearer(baseMass);
  b.getSpecies()?.getBodyPlan()?.setLocomotionModes(['walk']);
  return b;
}

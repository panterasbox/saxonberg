/**
 * Shared fixtures for the encumbrance suite — a load-bearing Creature
 * with a minimal test body plan (a worn `torso` slot and a held
 * `hand:left` slot, plus an authored `baseMass`) and small item builders
 * that carry real mass through the real mixin surfaces.
 */

import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { Vessel } from '../../stuff/Vessel';
import { WearableMixin } from '../../slot/Wearable';
import { WieldableMixin } from '../../slot/Wieldable';
import { SlottableMixin } from '../../slot/Slottable';
import { SensorMixin } from '../../message/Sensor';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

/**
 * A load-bearing Creature that is also a Sensor — needed wherever a
 * driver emits a scene to the bearer (the `get` lift-gate decline).
 * Concrete subclass so `makeStuff` can construct it.
 */
class SensingCreatureBase extends SensorMixin(Creature) {}
export class SensingCreature extends SensingCreatureBase {
  static _mixinName = 'SensingCreature';
}

/** A wearable, mass-bearing item (claims a worn slot). */
const WearThingBase = WearableMixin(SlottableMixin(Thing));
export class WearThing extends WearThingBase {}

/** A wieldable, mass-bearing item (claims a held slot). */
const WieldThingBase = WieldableMixin(SlottableMixin(Thing));
export class WieldThing extends WieldThingBase {}

let planSeq = 0;

/**
 * A Creature whose species body plan authors `baseMass` and a small slot
 * universe: `torso` (Wearable → worn-floor coupling) and `hand:left`
 * (Wieldable → held surcharge). Each call gets a uniquely-pathed plan +
 * species so registrations don't collide within a suite.
 */
export function bearerCreature(baseMass = 70): Creature {
  return bearerOf(() => new Creature(), baseMass);
}

/** As {@link bearerCreature}, but a Sensor too (for scene-emitting drivers). */
export function sensingBearer(baseMass = 70): SensingCreature {
  return bearerOf(() => new SensingCreature(), baseMass);
}

/**
 * Build any Creature subclass as a load-bearer wired to a fresh test
 * species + body plan (slots: worn `torso` + held `hand:left`) authoring
 * `baseMass`. Lets a caller layer extra mixins (Mobile, Propertied) onto
 * the bearer for driver tests.
 */
export function bearerOf<T extends Creature>(
  factory: () => T,
  baseMass = 70,
): T {
  const n = planSeq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`test-bearer-${n}`);
  plan.setBaseMass(baseMass);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
    },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 3 }],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.arm.left',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.4 }],
    },
  ]);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', covers: ['body.torso'] },
    { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.arm.left.hand' },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/test-bearer-${n}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/bearer-${n}`);

  const creature = makeStuff(factory);
  creature.setSpecies(species);
  return creature;
}

/** A plain mass-bearing `Thing` (loose-carry / nested cargo). */
export function massThing(kg: number): Thing {
  const t = makeStuff(() => new Thing());
  t.setMass(Quantity.of(kg, 'kg'));
  return t;
}

/** A wearable mass-bearing item. */
export function wornThing(kg: number): WearThing {
  const t = makeStuff(() => new WearThing());
  t.setMass(Quantity.of(kg, 'kg'));
  return t;
}

/** A wieldable mass-bearing item. */
export function heldThing(kg: number): WieldThing {
  const t = makeStuff(() => new WieldThing());
  t.setMass(Quantity.of(kg, 'kg'));
  return t;
}

/**
 * Claim `slot` on `host`'s body plan for `item` and occupy it — the
 * worn/wielded equivalent of dropping into general contents. `fitsSlot`
 * requires the item to declare a slot claim keyed by the host's body-plan
 * path, so wire that up before occupying.
 */
export function equip<T extends WearThing | WieldThing>(
  host: Creature,
  item: T,
  slot: string,
): T {
  const planPath = host.getSpecies()?.getBodyPlanPath();
  if (planPath) item.setSlotClaims({ [planPath]: [slot] });
  host.occupy(item, slot);
  return item;
}

/** A `Vessel` (container-object) with its own mass + transmission factor. */
export function vessel(kg: number, transmissionFactor = 1.0): Vessel {
  const v = makeStuff(() => new Vessel());
  v.setMass(Quantity.of(kg, 'kg'));
  v.setTransmissionFactor(transmissionFactor);
  return v;
}

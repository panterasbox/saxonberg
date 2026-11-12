/**
 * Shared fixtures for the carrying suite (size-and-carrying W4): a biped
 * with real hands (body parts serving `manipulation`), a sheath slot, a
 * worn torso and a `back`; a gnome-sized one; a handless quadruped; and
 * the things they hold.
 *
 * @internal — test-only.
 */

import { Actor } from '../../creature/Actor';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../../platform/thing/Thing';
import Holder from '../../stuff/Holder';
import { SealableMixin } from '../../spatial/Sealable';
import { WearableMixin } from '../Wearable';
import { WieldableMixin } from '../Wieldable';
import { SlottableMixin } from '../Slottable';
import { Quantity } from '../../quantity';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';

/** An acting body (Mobile, a Combatant, a Sensor) — what a player's is. */
export class Body extends Actor {}
/** A thing a hand takes (a knife, a pole, a compass). */
export class Tool extends WieldableMixin(SlottableMixin(Thing)) {}
/** A worn bag (a satchel on the torso, a rucksack on the back, a pouch). */
export class Bag extends SealableMixin(WearableMixin(SlottableMixin(Holder))) {}

let seq = 0;

export interface BodySpec {
  mass?: number;
  stature?: number;
  hands?: boolean;
}

/** A body on a fresh plan. Returns the body and its plan path. */
export function makeBody(spec: BodySpec = {}): { me: Body; plan: string } {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`carrying-w4-${n}`);
  plan.setBaseMass(spec.mass ?? 70);
  plan.setBaseStature(spec.stature ?? 1.75);
  plan.setLocomotionModes(['walk', 'run', 'sneak']);
  const hands = spec.hands !== false;
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body'] },
    { name: 'back', accepts: 'WearableMixin', capacity: 1 },
    { name: 'sidearm', accepts: 'WieldableMixin', capacity: 1 },
    ...(hands
      ? [
          { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
          { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
        ]
      : []),
  ]);
  plan.setBodyParts([
    { key: 'body', parent: null, tissues: [] },
    ...(hands
      ? [
          { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
          { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
        ]
      : []),
  ]);
  const path = `/stuff/idea/species/BodyPlan/carrying-w4-${n}`;
  stampTemplatePathForTest(plan, path);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/carrying-w4-${n}`);
  const me = makeStuff(() => new Body());
  me.setSpecies(species);
  return { me, plan: path };
}

/** A holdable thing of `kg`, optionally with a box (m). */
export function tool(name: string, kg: number, box?: [number, number, number]): Tool {
  const t = makeStuff(() => new Tool());
  t.setShortDescription(name);
  t.setKeywords([name]);
  t.setMass(Quantity.of(kg, 'kg'));
  if (box) t.setDimensions({ width: box[0], depth: box[1], height: box[2] });
  return t;
}

/** A bag worn in `slot` on `me`, open unless `shut`. */
export function wornBag(me: Body, plan: string, name: string, slot: string, shut = false): Bag {
  const b = makeStuff(() => new Bag());
  b.setShortDescription(name);
  b.setKeywords([name]);
  b.setSlotClaims({ [plan]: [slot] });
  b.setOpen(true);
  ContainmentApi.move(b, me);
  me.occupy(b, slot);
  if (shut) b.setOpen(false);
  return b;
}

/** Put `t` in `me`'s hand (contents first, then the slot — `seatInSlot`). */
export function hold(me: Body, plan: string, t: Tool, hand = 'hand:right'): Tool {
  t.setSlotClaims({ [plan]: [hand] });
  me.seatInSlot(t, hand);
  return t;
}

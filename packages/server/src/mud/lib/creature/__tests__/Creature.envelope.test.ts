/**
 * ⭐ The body's envelope (size and carrying D19): height by profile ×
 * stature, girth from mass and the body's own density, a worn pack riding
 * on top when the body goes low, the mounted pair, and the narrowest way
 * round with no gravity or through a way up or down.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import DraftAnimal from '../../../platform/agent/DraftAnimal';
import Pack from '../../../platform/thing/equipment/Pack';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import type { SlotSpec } from '../../slot/Slotted';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

const BIPED_SLOTS: SlotSpec[] = [
  { name: 'torso', accepts: 'WearableMixin', capacity: 4 },
  { name: 'hand:left', accepts: 'WieldableMixin' },
  { name: 'hand:right', accepts: 'WieldableMixin' },
];

function species(statureM: number, massKg: number, slots: SlotSpec[] = BIPED_SLOTS): Species {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`envelope-plan-${n}`);
  plan.setBaseMass(massKg);
  plan.setBaseStature(statureM);
  plan.setSlots(slots);
  plan.setLocomotionModes(['walk', 'stoop', 'crawl']);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/envelope-${n}`);
  const sp = makeStuff(() => new Species());
  sp.setBodyPlan(plan);
  stampTemplatePathForTest(sp, `/stuff/idea/species/test/envelope-${n}`);
  return sp;
}

function body(statureM: number, massKg: number): Creature {
  const c = makeStuff(() => new Creature());
  c.setSpecies(species(statureM, massKg));
  return c;
}

function room(): Location {
  const zone = makeStuff(() => new CartesianZone());
  const loc = makeStuff(() => new Location());
  zone.addLocation(loc, 0, 0, 0);
  return loc;
}

describe('Creature.envelope — the gap a body needs', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('a human stands its stature, stoops at 0.6 of it and crawls at 0.4', () => {
    const human = body(1.75, 70);
    expect(human.envelope('upright')!.height).toBeCloseTo(1.75);
    expect(human.envelope('crouched')!.height).toBeCloseTo(1.05);
    expect(human.envelope('prone')!.height).toBeCloseTo(0.7);
    expect(human.envelope('horizontal')!.height).toBeCloseTo(0.7);
  });

  it('girth is a cylinder of the body at its own density — under a door for a human', () => {
    const human = body(1.75, 70);
    const w = human.envelope('upright')!.width;
    const rho = human.getBodyDensity().rawValue();
    expect(w).toBeCloseTo(2 * Math.sqrt(70 / (Math.PI * 1.75 * rho)));
    expect(w).toBeLessThan(1);
  });

  it('a gnome is smaller than a human, an ogre larger', () => {
    const gnome = body(1.0, 30).envelope('upright')!;
    const human = body(1.75, 70).envelope('upright')!;
    const ogre = body(2.6, 250).envelope('upright')!;
    expect(gnome.height).toBeLessThan(human.height);
    expect(gnome.width).toBeLessThan(human.width);
    expect(ogre.height).toBeGreaterThan(human.height);
    expect(ogre.width).toBeGreaterThan(human.width);
  });

  it('a body with no stature has no envelope (never refused)', () => {
    expect(body(0, 70).envelope('upright')).toBeNull();
  });

  it('a pack worn on the torso rides on top when the body is low, and trails behind upright', () => {
    const human = body(1.75, 70);
    const pack = makeStuff(() => new Pack());
    pack.setMass(Quantity.of(2, 'kg'));
    pack.setDimensions({ width: 0.3, depth: 0.2, height: 0.5 });
    pack.setSlotClaims({ [human.getSpecies()!.getBodyPlan()!.getTemplatePath()!]: ['torso'] });
    human.seatInSlot(pack, 'torso');
    const bulk = human.wornBulk();
    expect(bulk.things).toEqual([pack]);
    expect(bulk.depthM).toBeCloseTo(Math.cbrt(0.03));
    expect(human.envelope('upright')!.height).toBeCloseTo(1.75);
    expect(human.envelope('prone')!.height).toBeCloseTo(0.7 + bulk.depthM);
    expect(human.envelope('prone', { bare: true })!.height).toBeCloseTo(0.7);
  });

  it('with no gravity, or lengthwise through a way up or down, it fits by its narrowest way round', () => {
    const human = body(1.75, 70);
    const loc = room();
    ContainmentApi.move(human, loc);
    const girth = human.envelope('upright')!.width;
    const along = human.envelope('upright', { lengthwise: true })!;
    expect(along.width).toBeCloseTo(girth);
    expect(along.height).toBeCloseTo(girth);
    loc.setGravity(Quantity.of(0, 'm/s²'));
    const floating = human.envelope('upright')!;
    expect(floating.width).toBeCloseTo(girth);
    expect(floating.height).toBeCloseTo(girth);
  });

  it('mounted, the pair: the mount\'s height plus the rider\'s seated share', () => {
    const horse = makeStuff(() => new DraftAnimal());
    horse.setSpecies(species(1.6, 600, [{ name: 'back:1', accepts: 'SlottableMixin' }]));
    horse.setMountSlot('back:1');
    const rider = body(1.75, 70);
    const loc = room();
    ContainmentApi.move(horse, loc);
    ContainmentApi.move(rider, loc);
    const horseAlone = horse.envelope('upright')!;
    horse.occupy(rider, 'back:1');
    const pair = horse.envelope('upright')!;
    expect(pair.height).toBeCloseTo(horseAlone.height + 1.75 * 0.6);
    expect(pair.width).toBeCloseTo(horseAlone.width);
    // The rider reads the same pair.
    expect(rider.envelope('upright')!.height).toBeCloseTo(pair.height);
    expect(rider.mountedPair()).toEqual({ mount: horse, rider });
  });
});

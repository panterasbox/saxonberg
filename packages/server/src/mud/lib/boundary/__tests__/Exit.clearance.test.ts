/**
 * ⭐ Bodies meet openings (size and carrying D8/D21): the traverse gate
 * reads the way's clearance against the body's envelope at its mode, and
 * each held thing on its own; the refusal says what would work — a lower
 * mode the body's plan has, or the pack that makes it too deep — and the
 * turn of a stair refuses the long crate a straight doorway passes. A
 * ladder wants both hands.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Exit from '../Exit';
import Door from '../../../platform/thing/Door';
import Thing from '../../../platform/thing/Thing';
import Pack from '../../../platform/thing/equipment/Pack';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import { Creature } from '../../creature/Creature';
import { CarryingMixin } from '../../slot/Carrying';

/** A body that carries — the hands the clearance measures. */
class Carrier extends CarryingMixin(Creature) {}
import Species from '../../../platform/idea/species/Species';
import BodyPlan, { type BodyPart } from '../../../platform/idea/species/BodyPlan';
import { WieldableMixin } from '../../slot/Wieldable';
import { SlottableMixin } from '../../slot/Slottable';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { LocomotionApi } from '../../../api/locomotion';
import { BoundaryApi } from '../../../api/boundary';
import type { SlotSpec } from '../../slot/Slotted';
import { buildMode } from '../../locomotion/__tests__/test-helpers';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Carryable extends WieldableMixin(SlottableMixin(Thing)) {}

const PLAN_PATH = '/stuff/idea/species/BodyPlan/clearance-biped';

const SLOTS: SlotSpec[] = [
  { name: 'torso', accepts: 'WearableMixin', capacity: 4 },
  { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
  { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
];

const PARTS: BodyPart[] = [
  { key: 'body', parent: null, tissues: [] },
  { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
  { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
];

function human(): Carrier {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('clearance-biped');
  plan.setBaseMass(70);
  plan.setBaseStature(1.75);
  plan.setSlots(SLOTS);
  plan.setBodyParts(PARTS);
  plan.setLocomotionModes(['walk', 'stoop', 'crawl', 'climb']);
  stampTemplatePathForTest(plan, PLAN_PATH);
  const sp = makeStuff(() => new Species());
  sp.setBodyPlan(plan);
  stampTemplatePathForTest(sp, '/stuff/idea/species/test/clearance-human');
  const c = makeStuff(() => new Carrier());
  c.setSpecies(sp);
  return c;
}

describe('Exit.clearanceRefusal — bodies meet openings', () => {
  let here: Location;
  let there: Location;
  let below: Location;
  let body: Carrier;

  async function way(direction: string, to: Location = there): Promise<Exit> {
    const exit = makeStuff(() => new Exit({ direction, source: here, destination: to }));
    await here.addExit(exit);
    return exit;
  }

  async function gate(exit: Exit, mode: string) {
    return LocomotionApi.canTraverseExit(body, exit, LocomotionApi.modeOfOrThrow(mode), exit.getDirection());
  }

  function hold(thing: Carryable, slot = 'hand:left'): void {
    thing.setSlotClaims({ [PLAN_PATH]: [slot] });
    body.seatInSlot(thing, slot);
  }

  beforeEach(() => {
    installV1QuantityMarshallers();
    for (const m of ['walk', 'stoop', 'crawl', 'climb'] as const) buildMode(m);
    const zone = makeStuff(() => new CartesianZone());
    here = makeStuff(() => new Location());
    there = makeStuff(() => new Location());
    below = makeStuff(() => new Location());
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(there, 0, 1, 0);
    zone.addLocation(below, 0, 0, -1);
    body = human();
    ContainmentApi.move(body, here);
  });
  afterEach(() => StuffApi.clearAll());

  it('the whole face of a 3 m cell passes a walking body', async () => {
    const north = await way('north');
    expect(north.clearance()).toEqual({ width: 3, height: 3 });
    expect((await gate(north, 'walk')).ok).toBe(true);
  });

  it('a low door refuses a walk and names `stoop`; stooping goes through', async () => {
    const north = await way('north');
    north.setOpening({ width: 0.9, height: 1.4 });
    const refused = await gate(north, 'walk');
    expect(refused.ok).toBe(false);
    expect(refused.gate).toBe('clearance');
    expect(refused.reason).toBe("You'd have to stoop — `stoop north`.");
    expect((await gate(north, 'stoop')).ok).toBe(true);
  });

  it('the crawlway refuses a stoop and names `crawl`; crawling goes through', async () => {
    const north = await way('north');
    north.setOpening({ width: 0.8, height: 0.8 });
    const refused = await gate(north, 'stoop');
    expect(refused.reason).toBe("You'd have to crawl — `crawl north`.");
    expect((await gate(north, 'crawl')).ok).toBe(true);
  });

  it('a pack on the back in the crawlway is named, with the command that takes it off', async () => {
    const north = await way('north');
    north.setOpening({ width: 0.8, height: 0.8 });
    const pack = makeStuff(() => new Pack());
    pack.setShortDescription('canvas backpack');
    pack.setKeywords(['backpack', 'canvas']);
    pack.setDimensions({ width: 0.3, depth: 0.2, height: 0.5 });
    pack.setSlotClaims({ [PLAN_PATH]: ['torso'] });
    body.seatInSlot(pack, 'torso');
    const crawling = await gate(north, 'crawl');
    expect(crawling.ok).toBe(false);
    expect(crawling.reason).toBe('Your canvas backpack won\'t go through — `remove backpack`.');
    const walking = await gate(north, 'walk');
    expect(walking.reason).toBe(
      "You'd have to crawl, and your canvas backpack won't go through — `remove backpack`, then `crawl north`.",
    );
  });

  it('D10-d: weightless, a pack bigger than the hatch is refused by name; a smaller one passes trailing', async () => {
    here.setGravity(Quantity.of(0, 'm/s²'));
    const north = await way('north');
    north.setOpening({ width: 0.5, height: 0.5 });
    const big = makeStuff(() => new Pack());
    big.setShortDescription('frame pack');
    big.setKeywords(['pack', 'frame']);
    big.setDimensions({ width: 0.6, depth: 0.3, height: 0.8 });
    big.setSlotClaims({ [PLAN_PATH]: ['torso'] });
    body.seatInSlot(big, 'torso');
    const refused = await north.clearanceRefusal(body, 'walk');
    expect(refused?.reason).toBe('too-big-for-way');
    expect(refused?.facts.pack).toBe(big);
    expect((await gate(north, 'walk')).reason).toMatch(/frame pack won't go through — `remove pack`/);
    // Off, the body alone goes through.
    ContainmentApi.move(big, there);
    expect(await north.clearanceRefusal(body, 'walk')).toBeNull();
    const small = makeStuff(() => new Pack());
    small.setShortDescription('belt pack');
    small.setKeywords(['pack', 'belt']);
    small.setDimensions({ width: 0.2, depth: 0.1, height: 0.15 });
    small.setSlotClaims({ [PLAN_PATH]: ['torso'] });
    body.seatInSlot(small, 'torso');
    expect(await north.clearanceRefusal(body, 'walk')).toBeNull();
  });

  it('a hung hatch bounds the way; through a way down a body goes lengthwise', async () => {
    const north = await way('north');
    const hatch = await StuffApi.create(() => new Door());
    hatch.setOpening({ width: 1, height: 1 });
    hatch.setOpen(true);
    const back = makeStuff(() => new Exit({ direction: 'south', source: there, destination: here }));
    await there.addExit(back);
    BoundaryApi.attach(hatch, north, back);
    expect(north.clearance()).toEqual({ width: 1, height: 1 });
    expect((await gate(north, 'walk')).reason).toBe("You'd have to crawl — `crawl north`.");
    const down = await way('down', below);
    down.setOpening({ width: 1, height: 1 });
    expect((await gate(down, 'walk')).ok).toBe(true);
  });

  it('the stair\'s turn refuses a long crate; a wide doorway with no turn passes it', async () => {
    const crate = makeStuff(() => new Carryable());
    crate.setShortDescription('crate');
    crate.setDimensions({ width: 2.5, depth: 0.5, height: 0.5 });
    crate.setMass(Quantity.of(4, 'kg'));
    hold(crate);
    const stair = await way('north');
    stair.setTurn(2.2);
    const refused = await gate(stair, 'walk');
    expect(refused.gate).toBe('clearance');
    expect(refused.reason).toBe('The crate is too long to get round the turn — 2.5 m of it.');
    const doorway = await way('east');
    doorway.setOpening({ width: 1.5, height: 2.2 });
    expect((await gate(doorway, 'walk')).ok).toBe(true);
  });

  it('a held thing too big for the gap is refused on its own', async () => {
    const board = makeStuff(() => new Carryable());
    board.setShortDescription('board');
    board.setDimensions({ width: 1.2, depth: 1.2, height: 0.05 });
    hold(board);
    const north = await way('north');
    north.setOpening({ width: 0.8, height: 0.8 });
    expect((await gate(north, 'crawl')).reason).toBe("The board won't go through — it's too big for the way.");
  });

  it('a ladder wants both hands, naming what you hold', async () => {
    const lantern = makeStuff(() => new Carryable());
    lantern.setShortDescription('lantern');
    hold(lantern);
    const up = await way('up', below);
    const refused = await gate(up, 'climb');
    expect(refused.ok).toBe(false);
    expect(refused.gate).toBe('handsNeeded');
    expect(refused.reason).toBe("You need both hands to climb — you're holding a lantern.");
    expect(body.freeHands()).toBe(1);
  });
});

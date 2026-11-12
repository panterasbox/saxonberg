/**
 * ⭐ What hangs from a worn host widens the body (size-and-carrying W7, for
 * drive 18): a hung thing rides flat against the flank, so it stands out by
 * its THINNEST side, and hung things go either side, so their thicknesses
 * add. A mule (400 kg, 1.5 m — ≈0.58 m bare) passes a 0.8 m gate; with a
 * pannier pair hung from its pack saddle (each 0.5 × 0.3 × 0.45 m, the
 * trade-tanning row) it does not — and the leader hears why. The numbers
 * are the Old Steading's paddock gate (0.8 × 2 m) and the shipped rows'
 * (the newbie-wilds pack's own test pins the rows themselves).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import Exit from '../../boundary/Exit';
import Thing from '../../../platform/thing/Thing';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Placements } from '../../spatial/Placement';
import { TetherEndMixin } from '../../spatial/TetherEnd';
import { TieableMixin } from '../../spatial/Tieable';
import { WearableMixin } from '../../slot/Wearable';
import { WieldableMixin } from '../../slot/Wieldable';
import { SlottableMixin } from '../../slot/Slottable';
import type { Stuff } from '../../stuff/Stuff';
import { buildAllModes } from '../../locomotion/__tests__/test-helpers';
import { installForms } from '../../spatial/__tests__/size-fixture';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, pack, wornGarment } from '../../slot/__tests__/carrying-fixture';
import { makeStuff } from '../../security/__tests__/test-setup';

class Halter extends TieableMixin(WearableMixin(SlottableMixin(Thing))) {}
class LeadEnd extends TetherEndMixin(WieldableMixin(SlottableMixin(Thing))) {
  public animal: Stuff | null = null;
  public override tetheredTo(): Stuff | null {
    return this.animal;
  }
}

const pannier = () => {
  const p = pack('pannier', 3, [0.5, 0.3, 0.45]);
  p.setShortDescription('canvas pannier');
  p.setKeywords(['pannier', 'canvas']);
  return p;
};

describe('Creature.wornBulk — side load (W7)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
    buildAllModes();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function steading() {
    const zone = makeStuff(() => new CartesianZone());
    const yard = makeStuff(() => new Location());
    const paddock = makeStuff(() => new Location());
    zone.addLocation(yard, 0, 0, 0);
    zone.addLocation(paddock, 0, 1, 0);
    const gate = makeStuff(() => new Exit({ direction: 'north', source: yard, destination: paddock, media: ['ground'] }));
    gate.setOpening({ width: 0.8, height: 2 });
    await yard.addExit(gate);
    const { me: mule, plan } = makeBody({ mass: 400, stature: 1.5, hands: false });
    ContainmentApi.move(mule, yard);
    const saddle = await wornGarment(mule, plan, 'pack saddle', 'back', [Placements.FROM], 7);
    const halter = makeStuff(() => new Halter());
    halter.setSlotClaims({ [plan]: ['torso'] });
    mule.seatInSlot(halter, 'torso');
    return { yard, paddock, gate, mule, saddle };
  }

  it('bare, the mule passes the 0.8 m gate', async () => {
    const { gate, mule } = await steading();
    const env = mule.envelope('upright')!;
    expect(env.width).toBeGreaterThan(0.5);
    expect(env.width).toBeLessThan(0.8);
    expect((await gate.canTraverse(mule, 'walk')).ok).toBe(true);
  });

  it('⭐ a pannier pair hung from the pack saddle adds both thicknesses — refused, naming the panniers', async () => {
    const { gate, mule, saddle } = await steading();
    for (const p of [pannier(), pannier()]) ContainmentApi.move(p, saddle, 'from');
    const bulk = mule.wornBulk();
    expect(bulk.hung).toHaveLength(2);
    expect(bulk.sideM).toBeCloseTo(0.6);
    expect(mule.envelope('upright')!.width).toBeCloseTo(mule.envelope('upright', { bare: true })!.width + 0.6);
    const refused = await gate.canTraverse(mule, 'walk');
    expect(refused.ok).toBe(false);
    expect(refused.context?.['about']).toBe("its canvas panniers won't go through — take them off first.");
  });

  it('even one pannier is too wide for the gate', async () => {
    const { gate, mule, saddle } = await steading();
    ContainmentApi.move(pannier(), saddle, 'from');
    expect((await gate.canTraverse(mule, 'walk')).ok).toBe(false);
  });

  it('⭐ the leader hears it: "the mule won\'t follow you: its canvas panniers won\'t go through"', async () => {
    const { yard, gate, mule, saddle } = await steading();
    for (const p of [pannier(), pannier()]) ContainmentApi.move(p, saddle, 'from');
    const { me, plan } = makeBody();
    ContainmentApi.move(me, yard);
    const end = makeStuff(() => new LeadEnd());
    end.setShortDescription('end of a lead');
    end.animal = mule;
    end.setSlotClaims({ [plan]: ['hand:right'] });
    me.seatInSlot(end, 'hand:right');
    const guard = await me.traverse(gate, 'walk');
    expect(guard.ok).toBe(false);
    expect(guard.reason).toMatch(/won't follow you: its canvas panniers won't go through — take them off first\.$/);
    expect(me.getContainer()).toBe(yard);
  });

  it('a person with two belt pouches still passes — a pocketed key widens nothing', async () => {
    const { gate } = await steading();
    const { me, plan } = makeBody();
    ContainmentApi.move(me, gate.getSource() as never);
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    for (const p of [pack('pouch', 0.15, [0.15, 0.06, 0.12]), pack('pouch', 0.15, [0.15, 0.06, 0.12])]) {
      ContainmentApi.move(p, belt, 'from');
    }
    expect(me.wornBulk().sideM).toBeCloseTo(0.12);
    expect((await gate.canTraverse(me, 'walk')).ok).toBe(true);
  });

  it('a hung thing on your own body is named with the command that takes it off its host', async () => {
    const { gate } = await steading();
    const { me, plan } = makeBody();
    ContainmentApi.move(me, gate.getSource() as never);
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    const crate = pack('crate', 2, [0.8, 0.7, 0.6]);
    crate.setKeywords(['crate']);
    ContainmentApi.move(crate, belt, 'from');
    const refused = await gate.canTraverse(me, 'walk');
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe("Your crate won't go through — `get crate from belt`.");
  });
});

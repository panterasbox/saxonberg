/**
 * ⭐ The modular belt (size and carrying D27): a belt is a Garment row with
 * `placements: [from]` whose hanging length is its WEARER's waist — so a
 * gnome's belt takes fewer pouches than an ogre's and no row says how many;
 * what hangs from it is ready, a holster on it draws fast, an overloaded
 * belt refuses in words, and a hung pouch stays on under water.
 */
import '../../../../../test-bootstrap';
import { carry } from '../../../../lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { BiomeApi } from '../../../../api/biome';
import { Quantity } from '../../../../lib/quantity';
import { Placements } from '../../../../lib/spatial/Placement';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installForms, material } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, pack, wornGarment, garment } from '../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import Location from '../../../../lib/location/Location';
import { SIZE_DEFAULTS } from '../../../../lib/spatial/Dimensions';

const pouch = () => pack('pouch', 0.1, [0.15, 0.05, 0.15]);
const hang = (p: Stuff & Containable, belt: Stuff, me: Stuff & { getContainer(): unknown }) => {
  carry(me, p);
  return ContainmentApi.putPlanFor(p, belt, { prep: 'on', by: me as never });
};

describe('Garment — the belt (D27)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installForms();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('worn, its length is the wearer\'s waist — a gnome\'s belt takes fewer pouches than an ogre\'s', async () => {
    const count = async (mass: number, stature: number): Promise<number> => {
      const { me, plan } = makeBody({ mass, stature });
      const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
      const env = me.envelope('upright', { bare: true })!;
      expect(belt.hangingLengthM()).toBeCloseTo(Math.PI * env.width * SIZE_DEFAULTS.WAIST_FRACTION);
      let n = 0;
      for (let i = 0; i < 20; i++) {
        const plan2 = hang(pouch(), belt, me);
        if (!plan2.ok) {
          expect(plan2).toMatchObject({ ok: false, reason: 'cannot-rest', facts: { why: 'no-room-along' } });
          break;
        }
        await plan2.onComplete();
        n++;
      }
      return n;
    };
    const gnome = await count(27, 1.0);
    const ogre = await count(250, 2.6);
    expect(gnome).toBeGreaterThan(0);
    expect(ogre).toBeGreaterThan(gnome);
  });

  it('off the body a belt is its own length', async () => {
    const belt = await garment('belt', [Placements.FROM]);
    belt.setDimensions({ width: 0.04, depth: 0.004, height: 1.1 });
    expect(belt.hangingLengthM()).toBeCloseTo(1.1);
  });

  it('`put holster on belt` clips it; `get holster from belt` takes it off; it is ready and draws fast', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    const holster = pack('holster', 0.3, [0.06, 0.04, 0.25], '/trade/smithing/thing/pistol');
    const p = hang(holster, belt, me);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.facts.route).toEqual({ kind: 'region', name: Placements.FROM, word: 'from' });
    await p.onComplete();
    expect(holster.getPlacement()).toEqual({ host: belt, name: Placements.FROM });
    expect(me.tierOf(holster)).toBe('ready');
    expect(me.isHonest(holster)).toBe(true);
    const pistol = tool('pistol', 1.1, [0.04, 0.03, 0.2]);
    stampTemplatePathForTest(pistol, '/trade/smithing/thing/pistol');
    ContainmentApi.move(pistol, holster);
    expect(me.tierOf(pistol)).toBe('ready');
    expect(me.isHonest(pistol)).toBe(true);
    expect(me.holderPhrase(pistol)).toBe('your holster');
    // `get holster from belt`: the receiving act takes it off its host.
    ContainmentApi.move(holster, me);
    expect(holster.getPlacement()).toBeNull();
    expect(belt.getPlaced()).toEqual([]);
  });

  it('a pouch\'s contents are ready', async () => {
    const { me, plan } = makeBody();
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    const p = pouch();
    carry(me, p);
    ContainmentApi.move(p, belt, Placements.FROM);
    const coin = tool('coin', 0.01, [0.02, 0.02, 0.002]);
    ContainmentApi.move(coin, p);
    expect(me.tierOf(coin)).toBe('ready');
    // A hung pouch is somewhere a handed thing can go (D11's walk): with
    // both hands full, a coin moved onto the body lands in it.
    carry(me, tool('hammer', 1, [0.3, 0.05, 0.03]));
    carry(me, tool('saw', 1, [0.5, 0.15, 0.02]));
    const another = tool('coin', 0.01, [0.02, 0.02, 0.002]);
    carry(me, another);
    expect(another.getContainer()).toBe(p);
  });

  it('an overloaded belt refuses — the weight its leather will not bear', async () => {
    const { me, plan } = makeBody({ mass: 250, stature: 2.6 });
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    belt.setMaterial(material('/stuff/idea/material/_belt/leather', 860, 20));
    belt.setDimensions({ width: 0.03, depth: 0.003, height: 1.0 });
    const anvil = pack('anvil bag', belt.bearsKg() + 5, [0.1, 0.05, 0.1]);
    const r = hang(anvil, belt, me);
    expect(r).toMatchObject({ ok: false, reason: 'cannot-rest', facts: { why: 'too-heavy-for' } });
  });

  it('the pouches stay on under water — a hung thing is fastened', async () => {
    const { me, plan } = makeBody();
    ContainmentApi.move(me, makeStuff(() => new Location()));
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue({
      tag: 'water', substance: 'water', immersed: true, atSurface: false,
    } as never);
    vi.spyOn(BiomeApi, 'densityOf').mockReturnValue(Quantity.of(1000, 'kg/m³'));
    const p = pouch();
    p.setMaterial(material('/stuff/idea/material/_belt/cork', 300));
    carry(me, p);
    ContainmentApi.move(p, belt, Placements.FROM);
    expect(me.reconcilePressing()).toEqual([]);
    expect(p.getPlacement()).toEqual({ host: belt, name: Placements.FROM });
  });

  it('⭐ received, a pouch that claims no slot hangs from the worn belt — the medic\'s pouch in an outfit (W7)', async () => {
    const { me, plan } = makeBody();
    const belt = await wornGarment(me, plan, 'belt', 'waist', [Placements.FROM]);
    const p = pouch();
    expect(me.canReceive(p)).toBeNull();
    ContainmentApi.move(p, me);
    expect(p.getContainer()).toBe(me);
    expect(p.getPlacement()?.host).toBe(belt);
    expect(p.getPlacement()?.name).toBe(Placements.FROM);
    expect(me.isHonest(p)).toBe(true);
    expect(me.tierOf(p)).toBe('ready');
  });

  it('a pouch received with no belt worn does not hang (it goes the ordinary way)', () => {
    const { me } = makeBody();
    const p = pouch();
    ContainmentApi.move(p, me);
    expect(p.getContainer()).toBe(me);
    expect(p.getPlacement()).toBeNull();
  });

  it('`seatInSlots` puts a garment on by its whole claim', async () => {
    const { me, plan } = makeBody();
    const belt = await garment('belt', [Placements.FROM]);
    belt.setSlotClaims({ [plan]: ['waist'] });
    me.seatInSlots(belt, ['waist']);
    expect(me.getOccupants('waist').has(belt)).toBe(true);
  });
});

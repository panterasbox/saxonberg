/**
 * ⭐⭐ Firing is ONE rule (ceramics M1): a body that has been hot carries a
 * heat history, and its material says what that makes of it.
 *
 * These tests put a lump of a test material in a lit `Oven` and let the
 * clock run — nothing calls `fire`, because the claim is that the HEAT does
 * it: an unwatched gap integrates, a part-firing reads part-converted, wood
 * in a starved chamber chars and in an open one does not, a reducing firing
 * takes its twin, the volatiles go to the chamber that knows what to do with
 * them, and the credit waits for whoever held the firing.
 */

import '../../../../test-bootstrap';
import type { Burner } from '../../fire/Burner';
import { chargeHot } from '../../fire/__tests__/burner-fuel';
import type { Stuff } from '../../stuff/Stuff';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../../material/Material';
import type { KineticSpec } from '../../material/Kinetics';
import { ThermalMixin } from '../Thermal';
import Oven from '../../../platform/thing/Oven';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Location from '../../location/Location';
import { BiomeApi } from '../../../api/biome';
import type { Container } from '../../spatial/Container';

class Lump extends ThermalMixin(Good) {
  static _mixinName = 'HeatworkTestLump';
}
class TestRoom extends Place {}

/** A retort's shape: a chamber that takes what leaves its charge. */
class TestRetort extends Oven {
  public caught: Record<string, number> = {};
  public override receiveVolatiles(materialPath: string, litres: number): number {
    this.caught[materialPath] = (this.caught[materialPath] ?? 0) + litres;
    return litres;
  }
}

const SCALE = 12;
let real = 0;
function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

let seq = 0;
function material(name: string, opts: { transitions?: KineticSpec[]; appearance?: string } = {}): Material {
  seq += 1;
  const path = `/stuff/idea/material/_heatwork/${name}-${seq}`;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setSpecificHeat(Quantity.of(900, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(1, 'W/(m·K)'));
    m.setDensity(Quantity.of(2000, 'kg/m³'));
    if (opts.appearance) m.setAppearance(opts.appearance);
    if (opts.transitions) m.setKinetics(opts.transitions);
    return m;
  }, path) as unknown as Material;
}

function lumpOf(mat: Material, kg = 2): Lump {
  return makeStuff(() => {
    const l = new Lump();
    l.setMass(Quantity.of(kg, 'kg'));
    l.setMaterial(mat);
    l.setStampedTemperatureK(293);
    l.setLastAmbientK(293);
    (l as unknown as { setShortDescription(s: string): void }).setShortDescription(`lump of ${mat.getName()}`);
    return l;
  });
}

async function litChamber<T extends Oven>(make: () => T, heldK: number, draught = 1): Promise<T> {
  const room = makeStuff(() => {
    const r = new TestRoom();
    r.setTemperature(Quantity.of(293, 'K'));
    return r;
  });
  const o = makeStuff(make);
  chargeHot(o as unknown as Stuff & Burner, 400);
  o.setBurnTemperatureK(heldK);
  o.setDraught(draught);
  await ContainmentApi.move(o, room);
  if (!o.isLit()) o.ignite();
  return o;
}

async function load(chamber: Oven, piece: Lump): Promise<void> {
  await ContainmentApi.move(piece, chamber);
  await piece.restamp();
  piece.reconcileThermal();
}

describe('heat-work — the one rule', () => {
  let quick: Material;
  let lime: Material;

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    quick = material('quicklime', { appearance: 'chalk-white and light' });
    lime = material('limestone', {
      transitions: [
        {
          key: 'calcine',
          rate: { referenceK: 1170, zK: 60, fullDoseS: 3600 },
          massRetained: 0.56,
          discipline: 'quarrying',
          ladder: [{ atDegree: 1, becomes: quick.getTemplatePath()! }],
        },
      ],
    });
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ limestone left in a lit kiln — unread — comes out quicklime at 56 % of its mass', async () => {
    const kiln = await litChamber(() => new Oven(), 1400);
    const piece = lumpOf(lime, 10);
    await load(kiln, piece);
    advance(6 * 3600);
    piece.getTemperature();
    expect(piece.getMaterial()?.getTemplatePath()).toBe(quick.getTemplatePath());
    expect(piece.getMass().rawValue()).toBeCloseTo(5.6, 1);
    // ⭐ Identity is kept: it is the same piece, and it says what it is now.
    expect(StuffApi.findById(piece.stuffId)).toBe(piece);
    expect((piece as unknown as { getShortDescription(): string }).getShortDescription()).toBe('lump of quicklime');
  });

  it('fired short, it is burnt to the skin and raw at the heart', async () => {
    const kiln = await litChamber(() => new Oven(), 1250);
    const piece = lumpOf(lime, 10);
    await load(kiln, piece);
    advance(2 * 3600);
    piece.getTemperature();
    const rec = piece.getKineticRecord();
    const degree = rec?.changes['calcine']?.extent ?? 0;
    expect(degree).toBeGreaterThan(0);
    expect(degree).toBeLessThan(1);
    expect(piece.getMaterial()?.getTemplatePath()).toBe(lime.getTemplatePath());
    expect(piece.getMass().rawValue()).toBeLessThan(10);
    expect(piece.getMass().rawValue()).toBeGreaterThan(5.6);
  });

  it('a cold lump on a shelf keeps no heat history at all', async () => {
    const room = makeStuff(() => new TestRoom());
    const piece = lumpOf(lime, 10);
    await ContainmentApi.move(piece, room);
    piece.reconcileThermal();
    advance(24 * 3600);
    piece.getTemperature();
    expect(piece.getKineticRecord()).toBeNull();
  });

  it('the credit waits for whoever held the firing, and is handed over once', async () => {
    const kiln = await litChamber(() => new Oven(), 1400);
    const piece = lumpOf(lime, 10);
    await load(kiln, piece);
    piece.stampFiredBy('/platform/agent/Avatar/firer');
    advance(6 * 3600);
    piece.getTemperature();
    expect(piece.getKineticRecord()?.firedBy).toBe('/platform/agent/Avatar/firer');
    expect(piece.drainKineticCredits()).toEqual(['quarrying']);
    expect(piece.drainKineticCredits()).toEqual([]);
  });
});

describe('pyrolysis — a flame needs air', () => {
  let charcoal: Material;
  let wood: Material;
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    charcoal = material('charcoal');
    wood = material('hazel', {
      transitions: [
        {
          key: 'char',
          rate: { referenceK: 650, zK: 40, fullDoseS: 90_000 },
          massRetained: 0.25,
          requiresStarvedAir: true,
          volatiles: [{ material: '/stuff/idea/material/bulk/wood-tar', litresPerKg: 0.08 }],
          ladder: [{ atDegree: 0.8, becomes: charcoal.getTemplatePath()!, describes: 'charred' }],
        },
      ],
    });
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ in a starved chamber wood chars — and the tar goes to the chamber that takes it', async () => {
    const retort = await litChamber(() => new TestRetort(), 720, 0.45);
    expect(retort.completeness()).toBeLessThan(0.6);
    const length = lumpOf(wood, 4);
    (length as unknown as { setShortDescription(s: string): void }).setShortDescription('length of cordwood');
    await load(retort, length);
    advance(3 * 24 * 3600);
    length.getTemperature();
    expect(length.getMaterial()?.getTemplatePath()).toBe(charcoal.getTemplatePath());
    expect(length.getMass().rawValue()).toBeCloseTo(1, 1);
    expect((length as unknown as { getShortDescription(): string }).getShortDescription()).toBe('charred length of cordwood');
    expect(retort.caught['/stuff/idea/material/bulk/wood-tar'] ?? 0).toBeGreaterThan(0.25);
  });

  it('⭐ a starved chamber that takes NOTHING lets the tar into the air of its place (B105)', async () => {
    // `Burner.receiveVolatiles` answers 0 for an ordinary oven: what left the
    // charge is the room's (it was a duck-probe for a retort's method).
    const zone = makeStuff(() => new CartesianZone());
    const yard = makeStuff(() => new Location());
    zone.addLocation(yard, 0, 0, 0);
    const oven = makeStuff(() => new Oven());
    chargeHot(oven as unknown as Stuff & Burner, 400);
    oven.setBurnTemperatureK(720);
    oven.setDraught(0.45);
    await ContainmentApi.move(oven, yard as never);
    if (!oven.isLit()) oven.ignite();
    const length = lumpOf(wood, 4);
    await load(oven, length);
    advance(3 * 24 * 3600);
    length.getTemperature();
    expect(length.getMaterial()?.getTemplatePath()).toBe(charcoal.getTemplatePath());
    const tar = BiomeApi.resolveAtmosphereContentsFor(yard as unknown as Stuff & Container)
      .find((c) => c.type === '/stuff/idea/material/bulk/wood-tar');
    expect(tar?.amount ?? 0).toBeGreaterThan(0);
  });

  it('in an open chamber the same wood banks nothing — it is a fire’s, not a kiln’s', async () => {
    const kiln = await litChamber(() => new Oven(), 720, 1);
    expect(kiln.completeness()).toBeGreaterThanOrEqual(0.6);
    const length = lumpOf(wood, 4);
    await load(kiln, length);
    advance(3 * 24 * 3600);
    length.getTemperature();
    expect(length.getMaterial()?.getTemplatePath()).toBe(wood.getTemplatePath());
  });
});

describe('the atmosphere of a firing', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('a starved, reducing firing takes the rung’s twin', async () => {
    const red = material('terracotta');
    const blue = material('blue terracotta');
    const clay = material('clay', {
      transitions: [
        {
          key: 'fire',
          rate: { referenceK: 1150, zK: 100, fullDoseS: 3600 },
          ladder: [{ atDegree: 0.5, becomes: red.getTemplatePath()!, reducing: blue.getTemplatePath()! }],
        },
      ],
    });
    const open = await litChamber(() => new Oven(), 1300, 1);
    const starved = await litChamber(() => new Oven(), 1300, 0.3);
    const a = lumpOf(clay);
    const b = lumpOf(clay);
    await load(open, a);
    await load(starved, b);
    advance(6 * 3600);
    a.getTemperature();
    b.getTemperature();
    expect(a.getMaterial()?.getTemplatePath()).toBe(red.getTemplatePath());
    expect(b.getMaterial()?.getTemplatePath()).toBe(blue.getTemplatePath());
  });
});

describe('vapor in the chamber’s air', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ salt vapor at the rung lays a fused salt-glaze coat on the outside (ruling B)', async () => {
    const glaze = material('salt glaze', {
      transitions: [{ key: 'fuse', rate: { referenceK: 1300, zK: 30, fullDoseS: 3600 }, ladder: [{ atDegree: 1, becomes: '/x' }] }],
    });
    const salt = material('salt');
    const stone = material('stoneware');
    const clay = material('clay', {
      transitions: [
        {
          key: 'stoneware',
          rate: { referenceK: 1350, zK: 30, fullDoseS: 3600 },
          ladder: [{ atDegree: 1, becomes: stone.getTemplatePath()! }],
          vapor: { [salt.getTemplatePath()!]: glaze.getTemplatePath()! },
        },
      ],
    });
    const kiln = await litChamber(() => new Oven(), 1450);
    kiln.addChamberVapor(salt.getTemplatePath()!, 1);
    const pot = lumpOf(clay);
    await load(kiln, pot);
    advance(6 * 3600);
    pot.getTemperature();
    expect(pot.getMaterial()?.getTemplatePath()).toBe(stone.getTemplatePath());
    const coat = pot.getCoats('outside')[0];
    expect(coat?.material).toBe(glaze.getTemplatePath());
    expect(coat?.state).toBe('set');
  });
});

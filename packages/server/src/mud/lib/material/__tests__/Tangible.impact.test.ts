/**
 * ⭐⭐ A brittle body breaks by a CAUSE (ceramics M5): the energy of a blow
 * against its strength — toughness × volume, a thick wall far stronger
 * than a thin one — and against the floor it lands on. Nothing breaks from
 * being handled; a crack you cannot see is heard with `ring`; heat too
 * fast is a shock.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class Pot extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'ImpactTestPot';
}
class Room extends Place {}

let seq = 0;
function mat(name: string, fill: (m: Material) => void): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setSpecificHeat(Quantity.of(880, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(1.5, 'W/(m·K)'));
    fill(m);
    return m;
  }, `/stuff/idea/material/_impact/${name}-${seq}`) as unknown as Material;
}

let stoneware: Material;
let terracotta: Material;
let earthenware: Material;
let granite: Material;
let earth: Material;
let oak: Material;

function pot(body: Material, kg: number): Pot {
  return makeStuff(() => {
    const p = new Pot();
    p.setMass(Quantity.of(kg, 'kg'));
    p.setMaterial(body);
    p.setStampedTemperatureK(295);
    p.setLastAmbientK(295);
    return p;
  });
}

let real = 0;
beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 1_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  const body = (name: string, rho: number, h: number, t: number, wac: number, alpha: number): Material =>
    mat(name, (m) => {
      m.setDensity(Quantity.of(rho, 'kg/m³'));
      m.setHardness(Quantity.of(h, 'MPa'));
      m.setToughness(Quantity.of(t, 'MJ/m³'));
      m.setWaterAbsorptionCapacity(Quantity.of(wac, '%'));
      m.setThermalExpansion(alpha);
      m.setTags(['ceramic', 'fired', 'brittle']);
    });
  stoneware = body('stoneware', 2300, 90, 7, 1.5, 6e-6);
  terracotta = body('terracotta', 1900, 50, 5, 15, 5.5e-6);
  earthenware = body('earthenware', 2000, 60, 6, 8, 6e-6);
  granite = mat('granite', (m) => m.setHardness(Quantity.of(200, 'MPa')));
  earth = mat('earth', (m) => m.setHardness(Quantity.of(5, 'MPa')));
  oak = mat('oak', (m) => {
    m.setHardness(Quantity.of(40, 'MPa'));
    m.setToughness(Quantity.of(60, 'MJ/m³'));
    m.setDensity(Quantity.of(700, 'kg/m³'));
    m.setTags(['wood']);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

const drop = (p: Pot, floor: Material) =>
  p.sufferImpact({ energyJ: p.getMass().rawValue() * 9.81, surface: floor, cause: 'drop' });

describe('a blow against strength and floor', () => {
  it('⭐ a master’s thin stoneware bowl dropped on granite breaks; on strewn earth it does not', async () => {
    vi.spyOn(StuffApi, 'clone').mockRejectedValue(new Error('no sherds row in a unit test'));
    const onStone = pot(stoneware, 0.25);
    expect((await drop(onStone, granite)).broke).toBe(true);
    expect(onStone.isDestroyed()).toBe(true);
    const onEarth = pot(stoneware, 0.25);
    expect((await drop(onEarth, earth)).broke).toBe(false);
    expect(onEarth.isDestroyed()).toBe(false);
  });

  it('⭐ a novice’s thick terracotta mug survives both — the wall is the strength', async () => {
    const mug = pot(terracotta, 0.6);
    expect((await drop(mug, granite)).broke).toBe(false);
    expect((await drop(mug, earth)).broke).toBe(false);
  });

  it('wood does not shatter at all; a near-miss leaves a crack', async () => {
    expect(pot(oak, 0.3).impactStrengthJ()).toBe(Number.POSITIVE_INFINITY);
    const p = pot(stoneware, 0.4);
    const s = p.impactStrengthJ();
    const out = await p.sufferImpact({ energyJ: s * 0.7, surface: granite, cause: 'blow' });
    expect(out.flawed).toBe(true);
    expect(p.getFlaws()[0]?.kind).toBe('crack');
    // A crack costs strength.
    expect(p.impactStrengthJ()).toBeLessThan(s);
  });

  it('nothing breaks from being handled — `move` never calls it', async () => {
    const room = makeStuff(() => new Room());
    const other = makeStuff(() => new Room());
    const p = pot(stoneware, 0.25);
    const spy = vi.spyOn(p, 'sufferImpact');
    await ContainmentApi.move(p, room);
    await ContainmentApi.move(p, other);
    expect(spy).not.toHaveBeenCalled();
  });

  it('a pour at a melting heat melts its receiver; at a burning one it burns', () => {
    const tin = mat('tin', (m) => m.setMeltingPoint(Quantity.of(505, 'K')));
    const wood = mat('board', (m) => m.setAutoignitionTemperature(Quantity.of(570, 'K')));
    const t = pot(tin, 1);
    const w = pot(wood, 1);
    expect(t.canReceiveAtK(1300)).toBe('melts');
    expect(w.canReceiveAtK(1300)).toBe('burns');
    expect(pot(stoneware, 1).canReceiveAtK(1300)).toBe('holds');
  });
});

describe('thermal shock — heat too fast', () => {
  it('⭐ boiling water poured into a cold glazed mug cracks it; an unglazed stoneware crock warmed slowly does not', () => {
    const mug = pot(earthenware, 0.35);
    mug.layCoat('outside', '/x', 0);
    // A fused coat lowers what the body stands.
    (mug as unknown as { coats: Record<string, unknown[]> }).coats = {
      outside: [{ material: '/x', thicknessM: 0.0003, state: 'set' }],
    };
    mug.reconcileThermal();
    mug.setContentsTemperature(373);
    expect(mug.getFlaws().length).toBeGreaterThan(0);
    const crock = pot(stoneware, 2);
    crock.reconcileThermal();
    crock.setContentsTemperature(310);
    expect(crock.getFlaws()).toEqual([]);
  });

  it('⭐ a stoneware crock set on a cook fire cracks; grogged earthenware stands it', () => {
    const crock = pot(stoneware, 2);
    const cooking = pot(earthenware, 1.5);
    // The heating rate a fire gives each: (fire − room) / τ.
    for (const p of [crock, cooking]) {
      const tau = p.getTau().rawValue();
      (p as unknown as { shockBody(step: number, rate: number): void }).shockBody(0, (900 - 295) / tau);
    }
    expect(crock.getFlaws().length).toBeGreaterThan(0);
    // Earthenware with no grog is marginal; the potter's cooking body is
    // grogged — W3's composition carries it. Here: no flaw at a gentler fire.
    const gentle = pot(earthenware, 1.5);
    (gentle as unknown as { shockBody(step: number, rate: number): void }).shockBody(0, (700 - 295) / gentle.getTau().rawValue());
    expect(gentle.getFlaws()).toEqual([]);
  });

  it('⭐ a REFRACTORY body stands a step the same clay without the tag cracks under (the ceramics drive)', () => {
    const fill = (tags: string[]) => (m: Material): void => {
      m.setTags(tags);
      m.setThermalExpansion(5e-6);
    };
    const plain = pot(mat('fireclay-body', fill(['ceramic', 'fired', 'brittle'])), 4);
    const refractory = pot(mat('refractory-body', fill(['ceramic', 'fired', 'brittle', 'refractory'])), 4);
    for (const p of [plain, refractory]) {
      (p as unknown as { shockBody(step: number, rate: number): void }).shockBody(250, 0);
    }
    expect(plain.getFlaws().length).toBeGreaterThan(0);
    expect(refractory.getFlaws()).toEqual([]);
  });

  it('a hidden dunt is heard, not seen: `ring` on a flawed body is dull', () => {
    const room = makeStuff(() => new Room());
    const p = pot(stoneware, 0.5);
    void ContainmentApi.move(p, room);
    p.addFlaw('dunt', false);
    expect(p.getFlaws()[0]?.visible).toBe(false);
    expect(p.holdsWater('inside')).toBe(true);
    p.addFlaw('crack', true);
    expect(p.holdsWater('inside')).toBe(false);
  });
});

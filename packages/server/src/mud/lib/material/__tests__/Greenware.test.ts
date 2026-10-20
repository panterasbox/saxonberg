/**
 * ⭐⭐ Green ware (ceramics M4, R2): an unfired clay body whose water
 * decides what can be done to it and what the weather does to it — and
 * none of it once it has been fired.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { WaterActivityMixin } from '../WaterActivity';
import { CompositionMixin } from '../Composition';
import { GreenwareMixin } from '../Greenware';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class Piece extends GreenwareMixin(WaterActivityMixin(ThermalMixin(CompositionMixin(Good)))) {
  static _mixinName = 'GreenwareTestPiece';
}

let real = 0;
const SCALE = 12;
const advance = (s: number): void => {
  real += (s / SCALE) * 1000;
};

let seq = 0;
function mat(name: string, tags: string[]): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(900, 'J/(kg·K)'));
    return m;
  }, `/stuff/idea/material/_green/${name}-${seq}`) as unknown as Material;
}

let clay: Material;
let terracotta: Material;
let mineral: Material;
let sand: Material;

function piece(moisture: number, alloying: { materialPath: string; fraction: number }[] = []): Piece {
  return makeStuff(() => {
    const p = new Piece();
    p.setMass(Quantity.of(2, 'kg'));
    p.setMaterial(clay);
    p.setStampedTemperatureK(290);
    p.setLastAmbientK(290);
    p.setWaterState({ moisture, solute: 0 });
    p.setAlloying(alloying);
    return p;
  });
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 1_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  clay = mat('clay', ['earth', 'plastic', 'clay']);
  terracotta = mat('terracotta', ['ceramic', 'fired', 'brittle']);
  mineral = mat('clay mineral', ['mineral', 'clay-mineral']);
  sand = mat('sand', ['mineral', 'sand']);
});
afterEach(() => WorldClockApi._resetForTesting());

describe('the three states', () => {
  it('wet clay is plastic; drier, leather-hard; as dry as the air allows, bone-dry', () => {
    expect(piece(1).greenState()).toBe('plastic');
    // Ambient humidity defaults to ~50 % → equilibrium 0.5: dryness is
    // (1 − m) / 0.5.
    expect(piece(0.7).greenState()).toBe('leather-hard');
    expect(piece(0.52).greenState()).toBe('bone-dry');
  });

  it('only leather-hard trims, joins and stamps; only bone-dry fires', () => {
    expect(piece(1).canTrim()).toBe(false);
    expect(piece(0.7).canTrim()).toBe(true);
    expect(piece(0.7).canJoin()).toBe(true);
    expect(piece(0.52).canTrim()).toBe(false);
    expect(piece(0.7).isFireable()).toBe(false);
    expect(piece(0.52).isFireable()).toBe(true);
  });
});

describe('the weather', () => {
  it('⭐ rain on a soft piece slumps it', () => {
    const p = piece(0.9);
    p.reconcileGreen();
    advance(3600);
    p.wet(0.4);
    expect(p.getRuin()).toBe('slumped');
    expect(p.isFireable()).toBe(false);
  });

  it('⭐ a wet piece across a frost shatters; a bone-dry one does not', () => {
    const wet = piece(0.8);
    const dry = piece(0.52);
    for (const p of [wet, dry]) {
      p.reconcileThermal();
      p.reconcileGreen();
      p.setLastAmbientK(260);
    }
    advance(12 * 3600);
    expect(wet.getRuin()).toBe('shattered');
    expect(dry.getRuin()).toBeNull();
  });

  it('fat clay dried fast checks; the same clay opened with sand does not', () => {
    const fat = piece(1, [{ materialPath: mineral.getTemplatePath()!, fraction: 0.8 }]);
    const lean = piece(1, [
      { materialPath: mineral.getTemplatePath()!, fraction: 0.4 },
      { materialPath: sand.getTemplatePath()!, fraction: 0.5 },
    ]);
    for (const p of [fat, lean]) p.reconcileGreen();
    advance(3600);
    for (const p of [fat, lean]) {
      p.setWaterState({ moisture: 0.6, solute: 0 });
      p.reconcileGreen();
    }
    expect(fat.getFlaws().some((f) => f.kind === 'check')).toBe(true);
    expect(lean.getFlaws()).toEqual([]);
  });
});

describe('⭐⭐ green ends at firing (R2)', () => {
  it('a fired piece is no longer green — rain is just rain on a pot', () => {
    const p = piece(0.9);
    p.setMaterial(terracotta);
    expect(p.isGreen()).toBe(false);
    expect(p.greenState()).toBeNull();
    p.reconcileGreen();
    advance(3600);
    p.wet(0.5);
    expect(p.getRuin()).toBeNull();
  });
});

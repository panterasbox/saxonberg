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
import { BiomeApi } from '../../../api/biome';
import { ContainmentApi } from '../../../api/containment';
import Place from '../../stuff/Place';
import { Evaporation } from '../Evaporation';
import { vi } from 'vitest';
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
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

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

  it('⭐ a storm that soaks it and passes slumps it, though it dried back before the look', () => {
    // The ceramics drive (run 16): rain on the open yard, the brick read two
    // hours later — dried back to where it was, so two reads saw no rise.
    const p = piece(0.9);
    p.reconcileGreen();
    advance(3600);
    p.wet(0.4);
    advance(7200);
    p.wet(-0.4); // dried back: the same wetness as at the last look
    expect(p.getRuin()).toBe('slumped');
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

  it('⭐ a damp piece in a kiln bursts on its steam, and says so — not "the frost"', () => {
    const damp = piece(0.8);
    damp.reconcileThermal();
    damp.reconcileGreen();
    damp.setLastAmbientK(900);
    advance(2 * 3600);
    expect(damp.getRuin()).toBe('shattered');
    expect(damp.getBurstBy()).toBe('steam');
    const cold = piece(0.8);
    cold.reconcileThermal();
    cold.reconcileGreen();
    cold.setLastAmbientK(260);
    advance(12 * 3600);
    expect(cold.getBurstBy()).toBe('frost');
  });

  it('fat clay dried fast checks; the same clay opened with sand does not', async () => {
    // ⭐ Dried through the AIR, as a pot dries: the check is the water
    // model's rule for every drying solid (a board in a hot kiln too), and
    // a green piece only says how readily its clay cracks.
    class Yard extends Place {}
    const yard = makeStuff(() => new Yard());
    const fat = piece(1, [{ materialPath: mineral.getTemplatePath()!, fraction: 0.8 }]);
    const lean = piece(1, [
      { materialPath: mineral.getTemplatePath()!, fraction: 0.4 },
      { materialPath: sand.getTemplatePath()!, fraction: 0.5 },
    ]);
    // A hot, dry, windy day — far harsher drying than a pot stands.
    const harsh = new Evaporation(10, 12, 315);
    vi.spyOn(BiomeApi, 'airFor').mockReturnValue(harsh as never);
    vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation(((_s: unknown, t0: number, t1: number) => [
      { air: harsh, durationS: t1 - t0, rainMmPerH: 0 },
    ]) as never);
    for (const p of [fat, lean]) {
      await ContainmentApi.move(p as never, yard as never);
      p.getMoisture(); // the clock starts
    }
    advance(3600);
    for (const p of [fat, lean]) p.greenState();
    expect(fat.getMoisture()).toBeLessThan(1);
    expect(fat.getFlaws().some((f) => f.kind === 'check')).toBe(true);
    expect(lean.getFlaws()).toEqual([]);
  });
});

describe('⭐⭐ green ends at firing (R2)', () => {
  it('⭐ a piece fired elsewhere (an import) says its body — it read as nothing (drive C, run 37)', () => {
    const p = piece(0.1);
    p.setMaterial(terracotta);
    p.setLongDescription('A pot.');
    expect(p.getMarkupLong(p as never, {})).toMatch(/It is fired terracotta\./);
  });

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

describe('⭐⭐ bone-dry is judged against the air it dried in (the ceramics drive)', () => {
  it('a brick that dried to the locality\'s real 75 % air reads bone-dry, not leather-hard against the bare 50 %', async () => {
    class Yard extends Place {}
    const yard = makeStuff(() => new Yard());
    const p = piece(1);
    await ContainmentApi.move(p as never, yard as never);
    // The weather walk the water is integrated over: the Delight's own air.
    vi.spyOn(BiomeApi, 'airSegmentsFor').mockImplementation(((_s: unknown, t0: number, t1: number) => [
      { air: new Evaporation(75, 2, 290), durationS: t1 - t0, rainMmPerH: 0 },
    ]) as never);
    // …and the quick read that skips the locality and the weather.
    vi.spyOn(BiomeApi, 'localHumidityFor').mockReturnValue(50 as never);
    p.reconcileGreen();
    advance(60 * 86_400);
    expect(p.getMoisture()).toBeLessThan(0.8);
    expect(p.greenState()).toBe('bone-dry');
  });
});

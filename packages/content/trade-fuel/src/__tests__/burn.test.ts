/**
 * The burn — ⭐⭐ **airflow is the decision, and the failure mode is the
 * point** — now as ONE rule (ceramics ruling A).
 *
 * The clamp used to read its draught against a threshold table and mint
 * one of three rows. It is a real fire now, and the assertions here are
 * that the three outcomes FALL OUT of the shipped rows:
 *
 *  - at the row's draught (0.45 → completeness ≈ 0.53, below the flaming
 *    dial) the heap is starved and hazel cordwood chars through in three
 *    days — the same lengths, a quarter of their mass;
 *  - drawn too tight (0.3) the heap runs too cool and three days only
 *    reach **brands**;
 *  - opened wide, a flame can burn in it: the wood catches, goes onto the
 *    bed, and the burn is **ash** in the grate.
 *
 * ⚠ Still a THRESHOLD, never a roll: the same draught, the same answer.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import CharcoalPit from '../thing/CharcoalPit';
import Crop from '@saxonberg/server/mud/platform/thing/Crop';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Material from '@saxonberg/server/mud/lib/material/Material';
import type { KineticSpec } from '@saxonberg/server/mud/lib/material/Kinetics';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const BASE = fileURLToPath(new URL('../../../base-library/content/', import.meta.url));

function row(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(`${PACK}content/${rel}`, 'utf8')) as Record<string, unknown>;
}
function baseRow(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(`${BASE}${rel}`, 'utf8')) as Record<string, unknown>;
}

const HAZEL = '/stuff/idea/material/wood/hazel';
const CHARCOAL = '/stuff/idea/material/organic/charcoal';
const BRANDS = '/stuff/idea/material/organic/half-burnt-wood';

/** A material at its REAL path, from its REAL row's numbers. */
function material(path: string): Material {
  const data = baseRow(`${path.replace('/stuff/', 'stuff/')}.yaml`).data as Record<string, unknown>;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(String(data.name));
    const n = (k: string): number => Number(data[k] ?? 0);
    m.setDensity(Quantity.of(n('density'), 'kg/m³'));
    m.setSpecificHeat(Quantity.of(n('specificHeat'), 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(n('thermalConductivity'), 'W/(m·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(n('waterAbsorptionCapacity'), '%'));
    m.setAutoignitionTemperature(Quantity.of(n('autoignitionTemperature'), 'K'));
    m.setHeatOfCombustion(Quantity.of(n('heatOfCombustion'), 'MJ/kg'));
    m.setAshFraction(n('ashFraction'));
    if (data.kinetics) m.setKinetics(data.kinetics as KineticSpec[]);
    return m;
  }, path) as unknown as Material;
}

class Yard extends Place {}

const SCALE = 12;
let real = 0;
function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

/** The clamp as its row authors it, standing in a yard. */
async function clamp(draught: number): Promise<CharcoalPit> {
  const data = row('trade/fuel/thing/clamp.yaml').data as Record<string, unknown>;
  const yard = makeStuff(() => {
    const y = new Yard();
    y.setTemperature(Quantity.of(288, 'K'));
    return y;
  });
  const pit = makeStuff(() => new CharcoalPit());
  pit.setBurnTemperatureK(Number(data.burnTemperatureK));
  pit.setMaxBurnPowerW(Number(data.maxBurnPowerW));
  pit.setFuelCapacityKg(Number(data.fuelCapacityKg));
  (pit as unknown as { fuelBed: Record<string, number> }).fuelBed = {
    ...(data.fuelBed as Record<string, number>),
  };
  pit.setDraught(draught);
  await ContainmentApi.move(pit, yard);
  if (!pit.isLit()) pit.ignite();
  return pit;
}

/** A length of cordwood, as the forestry row mints it. */
function cordwood(): Crop {
  return makeStuff(() => {
    const c = new Crop();
    c.setMaterial(StuffApi.findByTemplatePath<Material>(HAZEL)!);
    c.setMass(Quantity.of(3.2, 'kg'));
    c.setKeywords(['cordwood', 'wood', 'length']);
    c.setShortDescription('length of cordwood');
    c.setStampedTemperatureK(288);
    c.setLastAmbientK(288);
    return c;
  });
}

async function burn(draught: number, lengths = 4): Promise<{ pit: CharcoalPit; wood: Crop[] }> {
  const pit = await clamp(draught);
  const wood: Crop[] = [];
  for (let i = 0; i < lengths; i++) {
    const c = cordwood();
    await ContainmentApi.move(c, pit);
    await c.restamp();
    c.reconcileThermal();
    wood.push(c);
  }
  // Three days, read every two hours (the fire's own tick runs between).
  for (let step = 0; step < 36; step++) {
    advance(2 * 3600);
    pit.reconcileBurnerFuel();
    pit.catchContents();
    for (const c of wood) if (!c.isDestroyed()) c.getTemperature();
  }
  await pit.settleFiring(null);
  return { pit, wood };
}

function materialOf(c: Crop): string {
  return c.getMaterial()?.getTemplatePath() ?? '';
}

describe('the charcoal burn — one rule', () => {
  // ⚠ No `clearAll`: the world clock's registry must outlive each test
  // (the purify test's precedent), so the materials are made once.
  beforeAll(() => {
    installV1QuantityMarshallers();
    material(CHARCOAL);
    material(BRANDS);
    material(HAZEL);
  });
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ at the row’s draught the heap is starved, and the lengths come out charcoal', async () => {
    const pit = await clamp(0.45);
    expect(pit.completeness()).toBeLessThan(0.6);
    const { wood } = await burn(0.45);
    for (const c of wood) {
      expect(c.isDestroyed()).toBe(false);
      expect(materialOf(c)).toBe(CHARCOAL);
      // A quarter of its mass: the volatiles went up the vents.
      expect(c.getMass().rawValue()).toBeCloseTo(0.8, 1);
      expect(c.getShortDescription()).toBe('charred length of cordwood');
    }
  });

  it('⚠ drawn too tight the heap runs cool, and three days only reach brands', async () => {
    const { wood } = await burn(0.3);
    for (const c of wood) expect(materialOf(c)).toBe(BRANDS);
  });

  it('⚠ opened wide a flame can burn in it — the wood catches and the burn is ash', async () => {
    const { pit, wood } = await burn(1);
    expect(pit.completeness()).toBeGreaterThanOrEqual(0.6);
    for (const c of wood) expect(c.isDestroyed()).toBe(true);
    // Burning on the bed: nothing charred, ash in the grate as it goes.
    expect(pit.getAshKg()).toBeGreaterThan(0);
  });

  it('⚠ it is a THRESHOLD, never a roll: the same draught, the same answer', async () => {
    const a = await burn(0.45, 1);
    const b = await burn(0.45, 1);
    expect(materialOf(a.wood[0]!)).toBe(materialOf(b.wood[0]!));
    expect(a.wood[0]!.getMass().rawValue()).toBeCloseTo(b.wood[0]!.getMass().rawValue(), 6);
  });

  it('the draught is clamped to a fraction — a row cannot author 300% open', async () => {
    const pit = await clamp(0.45);
    pit.setDraught(5);
    expect(pit.getDraught()).toBe(1);
    pit.setDraught(-1);
    expect(pit.getDraught()).toBe(0);
  });

  it('the clamp is a Burner and a Container — it holds a charge and holds a heat', async () => {
    const pit = await clamp(0.45);
    expect(MixinApi.isBurner(pit)).toBe(true);
    expect(MixinApi.isContainer(pit)).toBe(true);
  });

  it('⭐ the retort row is SHUT — what is in it chars, never catches', () => {
    const retort = row('trade/fuel/thing/retort.yaml').data as Record<string, number>;
    // completeness = draught × air / 0.85 in clean air.
    expect((retort.draught ?? 1) / 0.85).toBeLessThan(0.6);
  });
});

describe('charcoal, read off the MATERIAL', () => {
  it('⭐ charcoal’s flame reaches copper and wood’s does not — the reason the trade exists', () => {
    // A flame's temperature is derived from heatOfCombustion
    // (≈ 300 + 65 × MJ/kg). Copper melts at 1358 K.
    const flame = (mjPerKg: number): number => 300 + 65 * mjPerKg;
    const charcoal = baseRow('stuff/idea/material/organic/charcoal.yaml').data as Record<string, number>;
    const oak = baseRow('stuff/idea/material/wood/oak.yaml').data as Record<string, number>;
    expect(flame(charcoal.heatOfCombustion!)).toBeGreaterThan(1358);
    expect(flame(oak.heatOfCombustion!)).toBeLessThan(1358);
  });

  it('⚠ charcoal’s fuel value and ignition read off the MATERIAL, never authored twice', () => {
    const product = row('trade/fuel/thing/charcoal.yaml').data as Record<string, unknown>;
    expect(product._materialPath).toBe(CHARCOAL);
    expect(product).not.toHaveProperty('autoignitionPoint');
    expect(product).not.toHaveProperty('fuelValue');
    const material = baseRow('stuff/idea/material/organic/charcoal.yaml').data as Record<string, unknown>;
    expect(material.autoignitionTemperature).toBe(620);
    expect(material).not.toHaveProperty('autoignitionPoint');
    expect(material.heatOfCombustion).toBe(30);
    expect((material.tags as string[])).toContain('fuel');
  });

  it('⭐ every wood chars to the same two commons rows (ruling A, R4)', () => {
    for (const w of ['ash', 'beech', 'birch', 'elm', 'hazel', 'maple', 'oak', 'pine', 'willow', 'yew']) {
      const data = baseRow(`stuff/idea/material/wood/${w}.yaml`).data as {
        kinetics: KineticSpec[];
      };
      const char = data.kinetics.find((t) => t.key === 'char')!;
      expect(char.requiresStarvedAir).toBe(true);
      expect((char.ladder ?? []).map((r) => r.becomes)).toEqual([BRANDS, CHARCOAL]);
    }
  });

  it('⭐ ash is not a provision (potash D1): a heap whose grade is its STRENGTH', () => {
    // No freshness, no cure, no pathogens — and a burnt-through clamp's ash
    // lies in its grate, raked out in heaps like any hearth's.
    expect(row('trade/fuel/thing/wood-ash.yaml').class).toBe('/trade/fuel/thing/Ash');
    expect((row('trade/fuel/thing/wood-ash.yaml').data as Record<string, unknown>).gradedByStrength).toBe(true);
  });

});

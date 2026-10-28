/**
 * ⭐⭐ A good has faces, and a face carries coats (ceramics M6–M8).
 *
 * The coat: laid wet, fused by heat, crazed by a mismatch in shrinkage,
 * run by too much heat, crawled over grease. The face: holds water when
 * its coat is sound or its body tight. The slot: a lead-glazed inside
 * leaches into acid contents, silently; an unglazed porous jar weeps and
 * its water reads cooler than the room.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Place from '../../stuff/Place';
import Material from '../Material';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { StackableMixin } from '../../stuff/Stackable';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class Jar extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'FacedTestJar';
}
class Room extends Place {}
class Tiles extends StackableMixin(Good) {
  static _mixinName = 'FacedTestTiles';
}

let real = 0;
const SCALE = 12;
function advance(gameS: number): void {
  real += (gameS / SCALE) * 1000;
}

let seq = 0;
function mat(name: string, fill: (m: Material) => void): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(900, 'J/(kg·K)'));
    fill(m);
    return m;
  }, `/stuff/idea/material/_faced/${name}-${seq}`) as unknown as Material;
}

let terracotta: Material;
let stoneware: Material;
let lead: Material;
let ash: Material;
let vinegar: Material;
let water: Material;

function jarOf(body: Material, contents?: { m: Material; l: number }): Jar {
  return makeStuff(() => {
    const j = new Jar();
    j.setMass(Quantity.of(1.2, 'kg'));
    j.setMaterial(body);
    j.interiorBulk = true;
    j.setInteriorCapacity(Quantity.of(3, 'L'));
    if (contents) {
      j.setBulkMaterial('interior', contents.m);
      j.setBulkAmount('interior', Quantity.of(contents.l, 'L'));
    }
    return j;
  });
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 1_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  terracotta = mat('terracotta', (m) => {
    m.setTags(['ceramic', 'fired', 'porous', 'brittle']);
    m.setWaterAbsorptionCapacity(Quantity.of(15, '%'));
    m.setThermalExpansion(5.5e-6);
  });
  stoneware = mat('stoneware', (m) => {
    m.setTags(['ceramic', 'fired', 'brittle']);
    m.setWaterAbsorptionCapacity(Quantity.of(1.5, '%'));
    m.setThermalExpansion(6e-6);
  });
  const glaze = (name: string, refK: number, runK: number, alpha: number, leaches: boolean): Material =>
    mat(name, (m) => {
      m.setLaysCoat(true);
      m.setCoatWord('glazed');
      m.setThermalExpansion(alpha);
      m.setHeatTransitions([
        {
          key: 'fuse',
          referenceK: refK,
          zK: 30,
          fullDoseS: 3600,
          scorchAboveK: runK,
          ladder: [{ atDegree: 1, becomes: `/stuff/idea/material/_faced/${name}` }],
        },
      ]);
      if (leaches) m.setLeaches([{ toxin: 'lead-poisoning', mgPerLPerDayPerAcidity: 4 }]);
    });
  lead = glaze('lead-glaze', 1250, 1400, 7.5e-6, true);
  ash = glaze('ash-glaze', 1250, 1500, 5e-6, false);
  vinegar = mat('vinegar', (m) => {
    m.setTags(['liquid']);
    m.setAcidity(0.9);
  });
  water = mat('water', (m) => m.setTags(['liquid']));
});
afterEach(() => WorldClockApi._resetForTesting());

describe('coats', () => {
  it('a jug has an outside and, holding bulk, an inside', () => {
    const j = jarOf(terracotta);
    expect(j.faces()).toEqual(['outside', 'inside']);
    expect(j.getCoats('inside')).toEqual([]);
    expect(j.outermost('inside')).toBe(terracotta);
  });

  it('a coat is laid wet and fused by heat — the glaze’s own heat, not before', () => {
    const j = jarOf(stoneware);
    j.layCoat('inside', ash.getTemplatePath()!, 0);
    expect(j.getCoats('inside')[0]?.state).toBe('wet');
    expect(j.fuseCoats(1100)).toBe(0);
    expect(j.fuseCoats(1300)).toBe(1);
    expect(j.getCoats('inside')[0]?.state).toBe('set');
    expect(j.outermost('inside')).toBe(ash);
  });

  it('⭐ a look SAYS the coat — wet, then glazed (drive C, run 37: a glazed crock read as a bare one)', () => {
    const j = jarOf(stoneware);
    j.setLongDescription('A jar.');
    expect(j.getMarkupLong(j as never, {})).not.toMatch(/glaze|coat/i);
    j.layCoat('inside', ash.getTemplatePath()!, 0);
    expect(j.getMarkupLong(j as never, {})).toMatch(/wet coat of .* on the inside, not yet fired/);
    j.fuseCoats(1300);
    expect(j.getMarkupLong(j as never, {})).toMatch(/glazed on the inside with/);
  });

  it('⭐ a look shows a VISIBLE flaw; a hidden one only `ring` finds (drive C, run 37)', () => {
    const seen = jarOf(terracotta);
    seen.setLongDescription('A jar.');
    seen.addFlaw('crack', true);
    expect(seen.getMarkupLong(seen as never, {})).toMatch(/It is cracked\./);
    const hidden = jarOf(terracotta);
    hidden.setLongDescription('A jar.');
    hidden.addFlaw('dunt', false);
    expect(hidden.getMarkupLong(hidden as never, {})).not.toMatch(/crack/);
  });

  it('lead on terracotta CRAZES (it shrinks more than its body); ash does not', () => {
    const a = jarOf(terracotta);
    a.layCoat('inside', lead.getTemplatePath()!, 0);
    a.fuseCoats(1300);
    expect(a.getCoats('inside')[0]?.state).toBe('crazed');
    const b = jarOf(terracotta);
    b.layCoat('inside', ash.getTemplatePath()!, 0);
    b.fuseCoats(1300);
    expect(b.getCoats('inside')[0]?.state).toBe('set');
  });

  it('over-fired, a coat RUNS; laid over grease, it CRAWLS', () => {
    const a = jarOf(stoneware);
    a.layCoat('outside', ash.getTemplatePath()!, 0);
    a.fuseCoats(1600);
    expect(a.getCoats('outside')[0]?.state).toBe('run');
    const b = jarOf(stoneware);
    b.layCoat('outside', ash.getTemplatePath()!, 0, 0.6);
    b.fuseCoats(1300);
    expect(b.getCoats('outside')[0]?.state).toBe('crawled');
    // Crawled is bare in patches — the face falls back to its body, and
    // stoneware is tight.
    expect(b.holdsWater('outside')).toBe(true);
  });

  it('a face holds water by a sound coat or a tight body; terracotta bare does not', () => {
    expect(jarOf(terracotta).holdsWater('inside')).toBe(false);
    expect(jarOf(stoneware).holdsWater('inside')).toBe(true);
    const glazed = jarOf(terracotta);
    glazed.layCoat('inside', ash.getTemplatePath()!, 0);
    glazed.fuseCoats(1300);
    expect(glazed.holdsWater('inside')).toBe(true);
  });

  it('a crazed coat or a bare porous body is harder to clean', () => {
    expect(jarOf(stoneware).cleansAs()).toBe(1);
    expect(jarOf(terracotta).cleansAs()).toBeGreaterThan(1);
    const crazed = jarOf(terracotta);
    crazed.layCoat('inside', lead.getTemplatePath()!, 0);
    crazed.fuseCoats(1300);
    expect(crazed.cleansAs()).toBeGreaterThan(1);
  });
});

describe('the slot — the leach and the weep', () => {
  it('⭐ vinegar held a week against a lead-glazed inside carries lead; ash carries none', () => {
    const leaded = jarOf(stoneware, { m: vinegar, l: 1 });
    leaded.layCoat('inside', lead.getTemplatePath()!, 0);
    leaded.fuseCoats(1300);
    const clean = jarOf(stoneware, { m: vinegar, l: 1 });
    clean.layCoat('inside', ash.getTemplatePath()!, 0);
    clean.fuseCoats(1300);
    leaded.getBulkPayload('interior');
    clean.getBulkPayload('interior');
    advance(7 * 86_400);
    const dose = leaded.getBulkPayload('interior')?.dissolvedToxins?.find((t) => t.type === 'lead-poisoning');
    expect(dose?.amount ?? 0).toBeCloseTo(4 * 0.9 * 7, 0);
    expect(clean.getBulkPayload('interior')?.dissolvedToxins ?? []).toEqual([]);
  });

  it('water is not acid — it takes nothing from a lead glaze', () => {
    const j = jarOf(stoneware, { m: water, l: 1 });
    j.layCoat('inside', lead.getTemplatePath()!, 0);
    j.fuseCoats(1300);
    j.getBulkPayload('interior');
    advance(7 * 86_400);
    expect(j.getBulkPayload('interior')?.dissolvedToxins ?? []).toEqual([]);
  });

  it('⭐ an unglazed terracotta jar WEEPS: it loses water and its outside is wet; a glazed one holds', () => {
    const bare = jarOf(terracotta, { m: water, l: 2 });
    const glazed = jarOf(terracotta, { m: water, l: 2 });
    glazed.layCoat('inside', ash.getTemplatePath()!, 0);
    glazed.layCoat('outside', ash.getTemplatePath()!, 0);
    glazed.fuseCoats(1300);
    bare.getBulkAmount('interior');
    glazed.getBulkAmount('interior');
    advance(6 * 3600);
    expect(bare.getBulkAmount('interior').rawValue()).toBeLessThan(2);
    expect(bare.getWetness()).toBeGreaterThan(0);
    expect(glazed.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    // ⭐ …and a look SAYS it (drive C, run 37: "thoroughly dried").
    expect(bare.weeps()).toBe(true);
    expect(glazed.weeps()).toBe(false);
    expect(bare.getMarkupLong(bare as never, {})).toMatch(/damp and beaded/);
    expect(glazed.getMarkupLong(glazed as never, {})).not.toMatch(/damp and beaded/);
  });

  it('⭐ evaporation carries heat away — a wet jar sits below its air; a dry one at it', async () => {
    const room = makeStuff(() => {
      const r = new Room();
      r.setTemperature(Quantity.of(300, 'K'));
      return r;
    });
    const wet = jarOf(terracotta);
    const dry = jarOf(terracotta);
    await ContainmentApi.move(wet, room);
    await ContainmentApi.move(dry, room);
    wet.wet(0.8);
    expect(wet.evaporativeDepressionK(300)).toBeGreaterThan(3);
    expect(dry.evaporativeDepressionK(300)).toBe(0);
  });

  it('⭐⭐ the weeping jar’s water reads cooler than its room; the glazed one at the room', async () => {
    const room = makeStuff(() => {
      const r = new Room();
      r.setTemperature(Quantity.of(300, 'K'));
      return r;
    });
    const bare = jarOf(terracotta, { m: water, l: 2 });
    const glazed = jarOf(terracotta, { m: water, l: 2 });
    glazed.layCoat('inside', ash.getTemplatePath()!, 0);
    glazed.layCoat('outside', ash.getTemplatePath()!, 0);
    glazed.fuseCoats(1300);
    for (const j of [bare, glazed]) {
      await ContainmentApi.move(j, room);
      j.setStampedTemperatureK(300);
      j.reconcileThermal();
      j.getBulkAmount('interior');
    }
    // A day of weeping wets the bare jar's outside; the push side then
    // reads the air with evaporation taken off it.
    advance(12 * 3600);
    bare.getBulkAmount('interior');
    await bare.restamp();
    await glazed.restamp();
    advance(12 * 3600);
    expect(bare.getContentsTemperature().rawValue()).toBeLessThanOrEqual(297);
    expect(glazed.getContentsTemperature().rawValue()).toBeCloseTo(300, 0);
  });
});

describe('⭐ coats are a per-piece record — a coated stack does not merge with a bare one', () => {
  function tiles(): Tiles {
    const t = makeStuff(() => new Tiles());
    t.setMaterial(terracotta);
    t.setMass(Quantity.of(1, 'kg'));
    stampTemplatePathForTest(t, '/x/thing/tile');
    return t;
  }

  it('bare tiles merge; a glazed lot and a bare lot do not', () => {
    const a = tiles();
    const b = tiles();
    expect(a.canMergeWith(b)).toBe(true);
    b.layCoat('outside', ash.getTemplatePath()!, 0);
    expect(a.canMergeWith(b)).toBe(false);
    a.layCoat('outside', ash.getTemplatePath()!, 0);
    expect(a.canMergeWith(b)).toBe(true);
    a.fuseCoats(1300);
    expect(a.canMergeWith(b)).toBe(false);
  });
});

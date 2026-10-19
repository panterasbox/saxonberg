/**
 * ⭐⭐ Latex — the tap opens on the AIR of the stove house, and latex sets
 * into raw rubber in a pan (rubber build).
 *
 * The rows under test are the SHIPPED ones: the Hevea species' production
 * and the latex material's drain set are read off their YAML, so a number
 * changed in a row is a number changed here.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import SapStandard from '@saxonberg/content-trade-forestry/src/thing/SapStandard';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { TapSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Mould from '@saxonberg/server/mud/platform/thing/Mould';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import Casting from '@saxonberg/server/mud/platform/thing/Casting';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const row = (rel: string): Record<string, unknown> =>
  (parse(readFileSync(`${ROOT}${rel}`, 'utf8')) as { data: Record<string, unknown> }).data;

const HEVEA = '/stuff/idea/species/plantae/tracheophyta/magnoliopsida/malpighiales/euphorbiaceae/hevea/brasiliensis';
const LATEX = '/stuff/idea/material/organic/latex';
const RAW = '/stuff/idea/material/organic/raw-rubber';
const SHEET = '/trade/rubber/thing/raw-rubber-sheet';
const DAY = 86_400;

let now = 0;

/** A plain cup: bulk and thermal, and NOT a mould. */
class Cup extends ThermalMixin(BulkableMixin(Good)) {}

function room(airK: number): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const r = makeStuff(() => new CartesianLocation());
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as { _temperature: Quantity<'K'> })._temperature = Quantity.of(airK, 'K');
  return r;
}

function stem(): SapStandard {
  return makeStuff(() => {
    const p = new SapStandard();
    p.setShortDescription('rubber tree');
    p.setMass(Quantity.of(290, 'kg'));
    // ⚠ The stem's own body is COLD — it lags the house by hours. The
    // window must read the air, not this.
    p.setLastAmbientK(250);
    p.setLifecycleState('alive');
    p._speciesPath = HEVEA;
    (p as unknown as { growthStage: string }).growthStage = 'mature';
    return p;
  });
}

function latex(): Material {
  const d = row('trade-rubber/../base-library/content/stuff/idea/material/organic/latex.yaml');
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('latex');
    m.setDensity(Quantity.of(Number(d.density), 'kg/m³'));
    m.setNutrients(['water']);
    m.setNutrientAmounts(d.nutrientAmounts as Record<string, number>);
    m.setDrainSetting(d.drainSetting as never);
    return m;
  }, LATEX);
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  now = 10 * DAY;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  }
  const production = (row('trade-rubber/content/stuff/idea/species/plantae/tracheophyta/magnoliopsida/malpighiales/euphorbiaceae/hevea/brasiliensis.yaml')
    .production) as TapSpec[];
  makeStuffAtPath(() => {
    const sp = new Species();
    sp.setProduction(production);
    return sp;
  }, HEVEA);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('raw rubber');
    return m;
  }, RAW);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ the latex runs on the AIR of its house', () => {
  it('in a 300 K stove house the tap is open — though the stem itself is cold', () => {
    const r = room(300);
    const t = stem();
    ContainmentApi.move(t as never, r as never);
    expect(t.tapWindow('latex').open).toBe(true);
  });

  it('at 285 K it is shut, and says it is too cold', () => {
    const r = room(285);
    const t = stem();
    ContainmentApi.move(t as never, r as never);
    expect(t.tapWindow('latex')).toEqual({ open: false, reason: 'cold' });
  });

  it('past 309 K the tree shuts down in the heat', () => {
    const r = room(315);
    const t = stem();
    ContainmentApi.move(t as never, r as never);
    expect(t.tapWindow('latex')).toEqual({ open: false, reason: 'warm' });
  });
});

describe('⭐⭐ latex sets in a pan, the way curd does', () => {
  function pan(): Mould {
    const m = makeStuff(() => new Mould());
    m.setCastTemplate(SHEET);
    (m as unknown as { interiorBulk: boolean }).interiorBulk = true;
    return m;
  }

  beforeEach(() => {
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const c = makeStuff(() => new Casting());
      stampTemplatePathForTest(c, path);
      return c;
    }) as never);
  });

  it('a pan of latex left a game day holds a sheet of raw rubber, lighter by its serum', async () => {
    const p = pan();
    p.setBulkMaterial('interior', latex());
    p.setBulkAmount('interior', Quantity.of(2, 'L'));
    expect(p.setState()).toBe('filled');
    now += DAY + 60;
    expect(p.setState()).not.toBe('filled');
    for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
    const sheet = p.getContents().find((c) => c.getTemplatePath() === SHEET);
    expect(sheet).toBeDefined();
    const kg = (sheet as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue();
    // 2 L × 0.98 kg/L, 60 % water, left at 0.6 moisture: ≈ 1.49 kg.
    expect(kg).toBeGreaterThan(1.3);
    expect(kg).toBeLessThan(1.96);
    expect(p.holdsCast()).toBe(true);
  });

  it('⚠ a cup of latex left standing stays latex — the set runs only in a mould', async () => {
    const cup = makeStuff(() => new Cup());
    (cup as unknown as { interiorBulk: boolean }).interiorBulk = true;
    cup.setInteriorCapacity(Quantity.of(1, 'L'));
    cup.setBulkMaterial('interior', latex());
    cup.setBulkAmount('interior', Quantity.of(0.5, 'L'));
    now += 3 * DAY;
    for (let i = 0; i < 8; i++) await new Promise<void>((r) => setTimeout(r, 0));
    expect(cup.getBulkMaterial('interior')?.getName()).toBe('latex');
    expect(cup.getBulkAmount('interior').rawValue()).toBeCloseTo(0.5, 6);
  });
});

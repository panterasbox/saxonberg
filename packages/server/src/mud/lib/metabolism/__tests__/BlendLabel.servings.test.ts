/**
 * ⭐⭐ Servings DERIVE from mass (ceramics re-plan R1-D1).
 *
 * A blend records what went into it as `makeup` — mass FRACTIONS of the
 * host — and a part's servings are `fraction × hostKg / servingKg` at the
 * read. Nothing stores a serving. What that buys, pinned here:
 *
 *   1. a martini built at its measures is one serving of each spirit —
 *      gin 19 + vermouth 7 = 26 — from a full glass;
 *   2. a half-drunk glass gives half that;
 *   3. a glass poured half off into another gives half in EACH, where an
 *      absolute servings record copied the whole dose into both;
 *   4. a material with no `servingKg` serves a quarter litre at its own
 *      density (the `nutrition.servingLitres` dial);
 *   5. anything that is not a blend reads exactly as before: an empty
 *      makeup falls through to the Material's own dose, whatever the mass.
 *
 * The fixtures are synthetic (a kernel test names no shipped content);
 * their densities and servings are the ones the shipped rows author.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { BulkableApi } from '../../../api/bulk';
import { MaterialApi } from '../../../api/material';
import Good from '../../stuff/Good';
import { BulkableMixin, type BulkPayload } from '../../bulk/Bulkable';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { BlendLabel } from '../BlendLabel';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

class TestGlass extends BulkableMixin(Good) {
  static _mixinName = 'TestGlassServings';
}

const GIN = '/stuff/idea/material/_test/servings-gin';
const VERMOUTH = '/stuff/idea/material/_test/servings-vermouth';
const STOCK = '/stuff/idea/material/_test/servings-stock';
const BLEND = '/stuff/idea/material/_test/servings-blend';

/** A martini at its measures: 60 ml of gin, 10 ml of dry vermouth. */
const GIN_KG = 0.06 * 0.94;
const VERMOUTH_KG = 0.01 * 0.99;
const MARTINI_KG = GIN_KG + VERMOUTH_KG;
const MARTINI_L = 0.07;
const MARTINI: BulkPayload = {
  recipeId: 'martini',
  makeup: [
    { materialPath: GIN, fraction: GIN_KG / MARTINI_KG },
    { materialPath: VERMOUTH, fraction: VERMOUTH_KG / MARTINI_KG },
  ],
};

function material(
  path: string,
  densityKgM3: number,
  alcohol: number,
  servingKg = 0,
): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setEdibility(true);
    m.setDensity(Quantity.of(densityKgM3, 'kg/m³'));
    if (alcohol > 0) m.setToxicity([{ type: 'alcohol', amount: alcohol }]);
    if (servingKg > 0) m.setServingKg(servingKg);
    return m;
  }, path) as unknown as Material;
}

/** A glass of the blend — its density the parts' own, so it holds exactly what went in. */
function glass(litres: number, payload: BulkPayload | null): TestGlass {
  const g = makeStuff(() => new TestGlass());
  (g as unknown as { interiorBulk: boolean }).interiorBulk = true;
  g.setInteriorCapacity(Quantity.of(0.3, 'L'));
  if (litres > 0) {
    const slot = BulkableApi.slotFor(g, undefined)!;
    slot.setMaterial(StuffApi.findByTemplatePath<Material>(BLEND)!);
    slot.setAmount(Quantity.of(litres, 'L'));
    if (payload) slot.setPayload(payload);
  }
  return g;
}

function alcoholIn(g: TestGlass): number {
  const slot = BulkableApi.slotFor(g, undefined)!;
  return (
    BlendLabel.toxicityOf(slot.getPayload(), slot.getMaterial(), slot.getMassKg()).find(
      (t) => t.type === 'alcohol',
    )?.amount ?? 0
  );
}

beforeEach(() => {
  StuffApi.clearAll();
  material(GIN, 940, 19, GIN_KG);
  material(VERMOUTH, 990, 7, VERMOUTH_KG);
  material(STOCK, 1000, 12);
  material(BLEND, (MARTINI_KG / MARTINI_L) * 1000, 18);
});

describe('⭐⭐ a serving is a mass, derived at the read', () => {
  it('a spirit at its measure is exactly one serving of it', () => {
    const gin = StuffApi.findByTemplatePath<Material>(GIN)!;
    expect(MaterialApi.servingKgOf(gin)).toBeCloseTo(0.0564, 9);
    expect(MaterialApi.servingsOf(gin, GIN_KG)).toBeCloseTo(1, 9);
  });

  it('⭐ unauthored, a serving is a quarter litre at the material’s own density', () => {
    const stock = StuffApi.findByTemplatePath<Material>(STOCK)!;
    expect(MaterialApi.servingKgOf(stock)).toBeCloseTo(0.25, 9);
    expect(MaterialApi.servingsOf(stock, 0.5)).toBeCloseTo(2, 9);
    expect(MaterialApi.servingsOf(stock, 0)).toBe(0);
  });
});

describe('⭐⭐ the martini — 26 full, 13 half, and never duplicated', () => {
  it('a full glass is gin 19 + vermouth 7 = 26', () => {
    expect(alcoholIn(glass(MARTINI_L, MARTINI))).toBeCloseTo(26, 6);
  });

  it('a half-drunk glass gives 13 — the dose scales with what is still in it', () => {
    expect(alcoholIn(glass(MARTINI_L / 2, MARTINI))).toBeCloseTo(13, 6);
  });

  it('⭐ poured half off, EACH glass is 13 — the makeup is intensive, so a pour cannot copy a dose', () => {
    const a = glass(MARTINI_L, MARTINI);
    const b = glass(0, null);
    BulkableApi.transfer(BulkableApi.slotFor(a, undefined)!, BulkableApi.slotFor(b, undefined)!, {
      kind: 'measure',
      litres: MARTINI_L / 2,
      mode: 'strict',
    });
    expect(BulkableApi.slotFor(b, undefined)!.getPayload()?.makeup).toEqual(MARTINI.makeup);
    expect(alcoholIn(a)).toBeCloseTo(13, 6);
    expect(alcoholIn(b)).toBeCloseTo(13, 6);
  });

  it('the label reads the same parts, the same way', () => {
    const slot = BulkableApi.slotFor(glass(MARTINI_L, MARTINI), undefined)!;
    expect(
      MaterialApi.blendToxicity(slot.getPayload(), slot.getMaterial(), slot.getMassKg()),
    ).toEqual(BlendLabel.toxicityOf(slot.getPayload(), slot.getMaterial(), slot.getMassKg()));
  });
});

describe('⭐ nothing that is not a blend changes', () => {
  it('an empty makeup falls through to the Material’s own dose, whatever the mass', () => {
    const stock = StuffApi.findByTemplatePath<Material>(STOCK)!;
    for (const kg of [0, 0.03, 1, 40]) {
      expect(BlendLabel.toxicityOf(null, stock, kg)).toEqual([{ type: 'alcohol', amount: 12 }]);
      expect(BlendLabel.toxicityOf({ recipeId: 'x' }, stock, kg)).toEqual([
        { type: 'alcohol', amount: 12 },
      ]);
    }
  });
});

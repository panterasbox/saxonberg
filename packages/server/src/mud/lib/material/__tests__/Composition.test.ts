/**
 * ⭐ The truthful lump (storage-and-ice D17): composition is what is
 * dissolved in a piece, temper is what a heat treatment left, and only
 * metal claims the second.
 *
 *  1. `Casting` (glass, wax, ice) composes composition and NOT temper.
 *  2. `MetalCasting`, `Ingot` — metal stock — compose both, and
 *     `isAlloyed` still means both.
 *  3. `IceBlock` is a Casting with a grade, defaulting to `cloudy`.
 *  4. `Material.getCastTemplate()` — authored row, else metal-casting for
 *     a `metal`-tagged material, else the composition-only Casting.
 *  5. ⭐ (ceramics re-plan R1-D1) a FOOD is made of parts by the same
 *     record — `Provision` composes it (it absorbed `ComposedMixin`), and
 *     the label reads each part's share of the piece's mass.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Material from '../Material';
import Casting from '../../../platform/thing/Casting';
import MetalCasting from '../../../platform/thing/MetalCasting';
import IceBlock from '../../../platform/thing/IceBlock';
import Ingot from '../../../platform/thing/Ingot';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import Provision from '../../../platform/thing/Provision';
import { BlendLabel } from '../../metabolism/BlendLabel';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

const IRON = '/stuff/idea/material/element/iron';

beforeEach(() => {
  StuffApi.clearAll();
});

describe('the truthful lump — composition off temper', () => {
  it('a Casting keeps what is dissolved in it and claims no temper', () => {
    const lump = makeStuff(() => new Casting()) as unknown as Stuff;
    expect(MixinApi.isComposition(lump)).toBe(true);
    expect(MixinApi.isTempered(lump)).toBe(false);
    expect(MixinApi.isAlloyed(lump)).toBe(false);
    if (!MixinApi.isComposition(lump)) throw new Error('narrowing');
    lump.setFractionOf(IRON, 0.004);
    expect(lump.fractionOf(IRON)).toBeCloseTo(0.004, 6);
  });

  it('metal stock composes both halves, and isAlloyed still means both', () => {
    for (const make of [() => new MetalCasting(), () => new Ingot()]) {
      const piece = makeStuff(make) as unknown as Stuff;
      expect(MixinApi.isAlloyed(piece)).toBe(true);
      expect(MixinApi.isComposition(piece)).toBe(true);
      expect(MixinApi.isTempered(piece)).toBe(true);
    }
    expect(MixinApi.hasMixin(MetalCasting, Mixins.Alloyed)).toBe(true);
    expect(MixinApi.hasMixin(Casting, Mixins.Composition)).toBe(true);
    expect(MixinApi.hasMixin(Casting, Mixins.Tempered)).toBe(false);
  });

  it('an iron lump keeps its carbon AND its temper', () => {
    const lump = makeStuff(() => new MetalCasting());
    lump.setFractionOf('/stuff/idea/material/element/carbon', 0.008);
    lump.setTemper('hardened');
    expect(lump.getTemper()).toBe('hardened');
    expect(lump.fractionOf('/stuff/idea/material/element/carbon')).toBeCloseTo(0.008, 6);
  });

  it('an ice block is a composition-only Casting whose grade defaults to cloudy', () => {
    const block = makeStuff(() => new IceBlock());
    expect(block.getIceQuality()).toBe('cloudy');
    expect(MixinApi.isTempered(block as unknown as Stuff)).toBe(false);
    block.setIceQuality('black');
    expect(block.getIceQuality()).toBe('black');
    block.setIceQuality('slush' as never);
    expect(block.getIceQuality()).toBe('cloudy');
  });
});

describe('Material.getCastTemplate — the lump a frozen pool becomes', () => {
  function mat(tags: string[], castTemplate = ''): Material {
    const m = makeStuff(() => new Material());
    m.setName('m');
    (m as unknown as { tags: string[] }).tags = tags;
    (m as unknown as { castTemplate: string }).castTemplate = castTemplate;
    return m;
  }

  it('a metal pool casts a metal lump; any other the composition-only lump', () => {
    expect(mat(['metal', 'element']).getCastTemplate()).toBe('/stuff/thing/metal-casting');
    expect(mat(['glass']).getCastTemplate()).toBe('/stuff/thing/Casting');
  });

  it('an authored cast row wins (water sets as a lump of ice)', () => {
    expect(mat(['liquid'], '/stuff/thing/ice-lump').getCastTemplate()).toBe('/stuff/thing/ice-lump');
  });
});

describe('⭐ a food is made of parts — the same record, by mass (R1-D1)', () => {
  const BREAD = '/stuff/idea/material/food/test-bread';
  const ENDOSPERM = '/stuff/idea/material/food/test-endosperm';
  const BRAN = '/stuff/idea/material/food/test-bran-c';

  function food(path: string, name: string, amounts: Record<string, number>): void {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(name);
      m.setEdibility(true);
      m.setNutrientAmounts(amounts);
      m.setDensity(Quantity.of(570, 'kg/m³'));
      // The mill's 100 g serving, so a 0.8 kg loaf is eight servings.
      m.setServingKg(0.1);
      return m;
    }, path);
  }

  function loaf(): Provision {
    const p = makeStuff(() => new Provision());
    p.setMass(Quantity.of(0.8, 'kg'));
    p.setMaterial(StuffApi.findByTemplatePath<Material>(BREAD)!);
    return p;
  }

  /** The label a loaf reads off its parts, over its own mass. */
  function label(l: Provision): Record<string, number> {
    return BlendLabel.amountsOf({ makeup: [...l.getMakeup()] }, l.getMaterial(), l.getMass().rawValue());
  }

  beforeEach(() => {
    // The loaf's own material is deliberately thin — a loaf is not "made
    // of bread" in any nutritional sense, it is made of what went in.
    food(BREAD, 'bread', { carb: 100 });
    food(ENDOSPERM, 'flour', { carb: 1000, protein: 80 });
    food(BRAN, 'bran', { carb: 200, protein: 150, fibre: 430 });
  });

  it('every Provision can be made of parts, and starts made of none', () => {
    const l = loaf();
    expect(MixinApi.isComposition(l as unknown as Stuff)).toBe(true);
    expect(l.getMakeup()).toEqual([]);
  });

  it('a makeup with no parts falls straight through to the material', () => {
    const l = loaf();
    expect(BlendLabel.amountsOf(null, l.getMaterial(), 0.8)).toEqual({ carb: 100 });
  });

  it("⭐ a loaf that knows its parts reads its label off them — each part's share of its mass", () => {
    const l = loaf();
    l.setMakeup([
      { materialPath: ENDOSPERM, fraction: 0.8 },
      { materialPath: BRAN, fraction: 0.2 },
    ]);
    // 0.8 × 0.8 kg = 0.64 kg of flour = 6.4 servings; 0.16 kg of bran = 1.6.
    const amounts = label(l);
    expect(amounts.carb).toBeCloseTo(1000 * 6.4 + 200 * 1.6, 6);
    expect(amounts.protein).toBeCloseTo(80 * 6.4 + 150 * 1.6, 6);
    expect(amounts.fibre).toBeCloseTo(430 * 1.6, 6);
  });

  it('⭐ the same loaf at half the mass reads half the label — the record is intensive', () => {
    const l = loaf();
    l.setMakeup([
      { materialPath: ENDOSPERM, fraction: 0.8 },
      { materialPath: BRAN, fraction: 0.2 },
    ]);
    const whole = label(l);
    l.setMass(Quantity.of(0.4, 'kg'));
    expect(l.getMakeup()).toEqual([
      { materialPath: ENDOSPERM, fraction: 0.8 },
      { materialPath: BRAN, fraction: 0.2 },
    ]);
    expect(label(l).fibre!).toBeCloseTo(whole.fibre! / 2, 6);
  });

  it('⭐⭐ a wholemeal loaf feeds you MORE than a white one of the same weight', () => {
    // Same mass, different proportions — which is exactly the difference
    // an extraction setting makes, carried all the way here.
    const white = loaf();
    white.setMakeup([
      { materialPath: ENDOSPERM, fraction: 0.96 },
      { materialPath: BRAN, fraction: 0.04 },
    ]);
    const wholemeal = loaf();
    wholemeal.setMakeup([
      { materialPath: ENDOSPERM, fraction: 0.75 },
      { materialPath: BRAN, fraction: 0.25 },
    ]);
    const w = label(white);
    const m = label(wholemeal);
    expect(m.fibre!).toBeGreaterThan(w.fibre!);
    expect(m.protein!).toBeGreaterThan(w.protein!);
    // …and less starch, which is the honest trade rather than a free win.
    expect(m.carb!).toBeLessThan(w.carb!);
  });

  it('junk parts are refused rather than stored', () => {
    const l = loaf();
    l.setMakeup([
      { materialPath: ENDOSPERM, fraction: 0.5 },
      { materialPath: '', fraction: 0.3 },
      { materialPath: BRAN, fraction: 0 },
      { materialPath: BRAN, fraction: Number.NaN },
    ]);
    expect(l.getMakeup()).toEqual([{ materialPath: ENDOSPERM, fraction: 0.5 }]);
  });
});

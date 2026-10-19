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
import { makeStuff } from '../../security/__tests__/test-setup';

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

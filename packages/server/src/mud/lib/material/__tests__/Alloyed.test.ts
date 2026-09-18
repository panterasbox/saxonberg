/**
 * AlloyedMixin — ⭐ the per-instance half of what a piece of metal is
 * made of.
 *
 * What is being pinned:
 *
 *  1. ⭐⭐ **The ferrous ladder is ONE SCALAR.** Bloom, steel and cast
 *     iron are the same iron at three carbon fractions, and the class
 *     that carries the fraction is the only thing that had to be built.
 *  2. **Empty is the sparse default**, so a copper ingot composing this
 *     behaves exactly as it did — the host-placement claim, asserted.
 *  3. ⚠ **Zero REMOVES.** A bar carburized and then melted back down
 *     must read identically to one that never was; a stored zero would
 *     make those two different objects.
 *  4. The effective composition is the kind's, scaled by what is left,
 *     plus this instance's own.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { AlloyedMixin } from '../Alloyed';
import Material from '../Material';
import Thing from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

const IRON = '/stuff/idea/material/element/iron';
const CARBON = '/stuff/idea/material/element/carbon';
const STEEL = '/stuff/idea/material/alloy/steel';

class TestBar extends AlloyedMixin(Thing) {
  static _mixinName = 'TestBarAlloyed';
}

function bar(materialPath?: string): TestBar {
  const b = makeStuff(() => new TestBar());
  if (materialPath) {
    b.setMaterial(StuffApi.findByTemplatePath<Material>(materialPath) as Material);
  }
  return b;
}

beforeEach(() => {
  StuffApi.clearAll();
  const steel = makeStuffAtPath(() => new Material(), STEEL);
  steel.setName('steel');
  steel.setComposition([
    { materialPath: IRON, fraction: 0.998 },
    { materialPath: CARBON, fraction: 0.002 },
  ]);
  const iron = makeStuffAtPath(() => new Material(), IRON);
  iron.setName('iron');
  iron.setComposition([]);
});

describe('AlloyedMixin', () => {
  it('registers, and narrows through the predicate', () => {
    expect(MixinApi.hasMixin(TestBar, Mixins.Alloyed)).toBe(true);
    expect(MixinApi.isAlloyed(bar() as unknown as Stuff)).toBe(true);
    expect(MixinApi.isAlloyed(makeStuff(() => new Thing()) as unknown as Stuff)).toBe(false);
  });

  it('⭐ an un-set piece alloys NOTHING — the sparse default', () => {
    const b = bar(STEEL);
    expect(b.getAlloying()).toEqual([]);
    expect(b.fractionOf(CARBON)).toBe(0);
    expect(b.getTemper()).toBe('none');
    // …and reads exactly the material's own kind composition.
    expect(b.getEffectiveComposition()).toEqual([
      { materialPath: IRON, fraction: 0.998 },
      { materialPath: CARBON, fraction: 0.002 },
    ]);
  });

  it('⭐⭐ the ferrous ladder is one scalar against two thresholds', () => {
    const bloom = bar(IRON);
    const steel = bar(IRON);
    const pig = bar(IRON);
    bloom.setFractionOf(CARBON, 0.0005);
    steel.setFractionOf(CARBON, 0.006);
    pig.setFractionOf(CARBON, 0.04);
    // The same class, the same material, three different metals — and
    // nothing anywhere had to enumerate "bloom", "steel", "cast iron".
    const carbon = [bloom, steel, pig].map((b) => b.fractionOf(CARBON));
    expect(carbon).toEqual([0.0005, 0.006, 0.04]);
    expect(carbon[0]!).toBeLessThan(carbon[1]!);
    expect(carbon[1]!).toBeLessThan(carbon[2]!);
  });

  it('⚠ setFractionOf(0) REMOVES rather than storing a zero', () => {
    const b = bar(IRON);
    b.setFractionOf(CARBON, 0.006);
    expect(b.getAlloying()).toHaveLength(1);
    b.setFractionOf(CARBON, 0);
    // A bar carburized and melted back down must be indistinguishable
    // from one that never was.
    expect(b.getAlloying()).toEqual([]);
    expect(b.fractionOf(CARBON)).toBe(0);
  });

  it('clamps out of range, and ignores a nonsense entry', () => {
    const b = bar(IRON);
    b.setFractionOf(CARBON, 5);
    expect(b.fractionOf(CARBON)).toBe(1);
    b.setFractionOf(CARBON, -1);
    expect(b.fractionOf(CARBON)).toBe(0);
    b.setFractionOf('', 0.5);
    expect(b.getAlloying()).toEqual([]);
    b.setAlloying([{ materialPath: CARBON, fraction: Number.NaN }]);
    expect(b.getAlloying()).toEqual([]);
  });

  it('⭐ the effective composition scales the KIND by what is left', () => {
    const b = bar(STEEL);
    b.setFractionOf(CARBON, 0.008);
    const composition = b.getEffectiveComposition();
    // The kind's entries, scaled by 1 − 0.008…
    expect(composition[0]).toEqual({ materialPath: IRON, fraction: 0.998 * 0.992 });
    // …and the instance's own on the end.
    expect(composition[composition.length - 1]).toEqual({
      materialPath: CARBON,
      fraction: 0.008,
    });
    expect(composition.reduce((s, e) => s + e.fraction, 0)).toBeCloseTo(1, 6);
  });

  it('⚠ a PURE element authors no composition, so the alloying is the whole answer', () => {
    // Iron's row is `composition: []` — it is an element. Inventing an
    // "iron 0.994" entry here would mean writing the host entry the row
    // deliberately omits, so this reports only what is dissolved.
    const b = bar(IRON);
    b.setFractionOf(CARBON, 0.006);
    expect(b.getEffectiveComposition()).toEqual([
      { materialPath: CARBON, fraction: 0.006 },
    ]);
  });

  it('setAlloying merges duplicate entries and drops empty ones', () => {
    const b = bar(IRON);
    b.setAlloying([
      { materialPath: CARBON, fraction: 0.004 },
      { materialPath: CARBON, fraction: 0.002 },
      { materialPath: IRON, fraction: 0 },
    ]);
    expect(b.getAlloying()).toEqual([{ materialPath: CARBON, fraction: 0.006 }]);
  });

  it('temper is a two-value vocabulary and refuses anything else', () => {
    const b = bar(IRON);
    b.setTemper('hardened');
    expect(b.getTemper()).toBe('hardened');
    b.setTemper('quenched' as never);
    expect(b.getTemper()).toBe('none');
  });
});

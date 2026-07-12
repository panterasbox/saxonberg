import { describe, it, expect } from 'vitest';
import Armor from '../Armor';
import Weapon from '../Weapon';
import Material from '../../material/Material';
import { Construction } from '../../material/Construction';
import { Grade } from '../../craft/Grade';
import { MaterialApi } from '../../../api/material';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setName('steel');
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, '/lib/material/alloy/steel');
  return m;
}

describe('Armor — emergent composition', () => {
  it('composes the material + construction + graded + tool + wearable stack', () => {
    const a = makeStuff(() => new Armor());
    expect(MixinApi.isTangible(a)).toBe(true);
    expect(MixinApi.isConstructed(a)).toBe(true);
    expect(MixinApi.isGraded(a)).toBe(true);
    expect(MixinApi.isTool(a)).toBe(true);
    expect(MixinApi.isWearable(a)).toBe(true);
    // No ArmorMixin — armor is the composition, nothing narrows on it.
    expect((MixinApi as unknown as { isArmor?: unknown }).isArmor).toBeUndefined();
  });

  it('carries material, construction, grade, and a wearing condition', () => {
    const a = makeStuff(() => new Armor());
    if (!MixinApi.isTangible(a)) throw new Error('tangible');
    a.setMaterial(steel());
    a.setConstruction(Construction.of('plate'));
    a.setGrade(Grade.of('fine'));

    expect(MaterialApi.materialOf(a)!.getName()).toBe('steel');
    expect(a.getConstruction()!.getForm()).toBe('plate');
    expect(a.getGrade().getBand()).toBe('fine');

    expect(a.getCondition()).toBe(1);
    a.wear(0.3);
    expect(a.getCondition()).toBeCloseTo(0.7, 5);
  });
});

describe('Weapon — delivery half', () => {
  it('composes material + construction + graded + tool (no wearable)', () => {
    const w = makeStuff(() => new Weapon());
    expect(MixinApi.isTangible(w)).toBe(true);
    expect(MixinApi.isConstructed(w)).toBe(true);
    expect(MixinApi.isGraded(w)).toBe(true);
    expect(MixinApi.isTool(w)).toBe(true);
    expect(MixinApi.isWearable(w)).toBe(false);
  });

  it('a dagger delivers edge/point; a mace delivers blunt', () => {
    const dagger = makeStuff(() => new Weapon());
    dagger.setConstruction(Construction.of('bladed'));
    expect(
      MaterialApi.deliverableChannels(dagger.getConstruction()!),
    ).toEqual(['edge', 'point']);

    const mace = makeStuff(() => new Weapon());
    mace.setConstruction(Construction.of('hafted'));
    expect(MaterialApi.deliverableChannels(mace.getConstruction()!)).toEqual([
      'blunt',
    ]);
    expect(MaterialApi.primaryChannel(mace.getConstruction()!)).toBe('blunt');
  });
});

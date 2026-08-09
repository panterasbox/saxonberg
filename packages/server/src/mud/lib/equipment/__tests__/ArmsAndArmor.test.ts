import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import Armor from '../../../obj/equipment/Armor';
import Weapon from '../../../obj/equipment/Weapon';
import Material from '../../material/Material';
import Thing from '../../stuff/Thing';
import Species from '../../../obj/species/Species';
import BodyPlan from '../../../obj/species/BodyPlan';
import { Creature } from '../../creature/Creature';
import { Construction } from '../../material/Construction';
import { Grade } from '../../craft/Grade';
import { MixinApi } from '../../../api/mixin';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';

afterEach(() => StuffApi.clearAll());

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setName('steel');
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, '/obj/material/alloy/steel');
  return m;
}

describe('Armor — emergent composition', () => {
  it('composes the material + construction + graded + tool + wearable stack', () => {
    const a = makeStuff(() => new Armor());
    expect(MixinApi.isTangible(a)).toBe(true);
    expect(MixinApi.isConstructed(a)).toBe(true);
    expect(MixinApi.isGraded(a)).toBe(true);
    // A durable good (wears out), NOT a crafting tool.
    expect(MixinApi.isDurable(a)).toBe(true);
    expect(MixinApi.isTool(a)).toBe(false);
    expect(MixinApi.isWearable(a)).toBe(true);
    // No ArmorMixin — armor is the composition, nothing narrows on it.
    expect((MixinApi as unknown as { isArmor?: unknown }).isArmor).toBeUndefined();
  });

  it('carries material, construction, grade, and a wearing condition', () => {
    const a = makeStuff(() => new Armor());
    if (!MixinApi.isTangible(a)) throw new Error('tangible');
    if (!MixinApi.isGraded(a)) throw new Error('graded');
    a.setMaterial(steel());
    a.setConstruction(Construction.of('plate'));
    a.setGrade(Grade.of('fine'));

    expect(a.getMaterial()!.getName()).toBe('steel');
    expect(a.getConstruction()!.getForm()).toBe('plate');
    expect(a.getGrade().getBand()).toBe('fine');

    expect(a.getCondition()).toBe(1);
    a.wear(0.3);
    expect(a.getCondition()).toBeCloseTo(0.7, 5);
  });
});

describe('Weapon — delivery half', () => {
  it('composes material + construction + graded + durable + wieldable (not tool, not worn)', () => {
    const w = makeStuff(() => new Weapon());
    expect(MixinApi.isTangible(w)).toBe(true);
    expect(MixinApi.isConstructed(w)).toBe(true);
    expect(MixinApi.isGraded(w)).toBe(true);
    // A durable good, NOT a crafting tool.
    expect(MixinApi.isDurable(w)).toBe(true);
    expect(MixinApi.isTool(w)).toBe(false);
    // Held, not worn — Wieldable (hand slot) yes, Wearable (body slot) no.
    expect(MixinApi.isWieldable(w)).toBe(true);
    expect(MixinApi.isWearable(w)).toBe(false);
  });

  it('renders per-channel pips on the long description (author + player)', () => {
    const viewer = makeStuff(() => new Thing()) as unknown as Stuff;
    const steelMat = steel(); // one singleton — shared by both pieces

    const breastplate = makeStuff(() => new Armor());
    breastplate.setMaterial(steelMat);
    breastplate.setConstruction(Construction.of('plate'));
    const armorOut = breastplate.getMarkupLong(viewer);
    expect(armorOut).toContain('Protection');
    expect(armorOut).toContain('edge');
    expect(armorOut).toContain('●'); // at least some filled pips

    const dagger = makeStuff(() => new Weapon());
    dagger.setMaterial(steelMat);
    dagger.setConstruction(Construction.of('bladed'));
    const weaponOut = dagger.getMarkupLong(viewer);
    expect(weaponOut).toContain('Delivery');
    expect(weaponOut).toContain('blunt ○○○○'); // a blade delivers no blunt
  });

  it('can be wielded into a body-plan hand slot', () => {
    const planPath = '/obj/species/BodyPlan/wield-test';
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('wield-test');
    plan.setSlots([
      { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand' },
    ]);
    plan.setBodyParts([{ key: 'body.hand', parent: null, tissues: [] }]);
    stampTemplatePathForTest(plan, planPath);
    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/obj/species/test/wielder');
    const wielder = makeStuff(() => new Creature());
    wielder.setSpecies(species);

    const dagger = makeStuff(() => new Weapon());
    dagger.setConstruction(Construction.of('bladed'));
    dagger.setSlotClaim(planPath, ['hand:right']);

    expect(dagger.fitsSlot(wielder, 'hand:right')).toBe(true);
    (wielder as unknown as { occupy(x: unknown, s: string): void }).occupy(
      dagger,
      'hand:right',
    );
    expect(wielder.getOccupant('hand:right')).toBe(dagger);
  });

  it('a dagger delivers edge/point; a mace delivers blunt', () => {
    const dagger = makeStuff(() => new Weapon());
    dagger.setConstruction(Construction.of('bladed'));
    expect(dagger.getConstruction()!.deliveredChannels()).toEqual([
      'edge',
      'point',
    ]);

    const mace = makeStuff(() => new Weapon());
    mace.setConstruction(Construction.of('hafted'));
    expect(mace.getConstruction()!.deliveredChannels()).toEqual(['blunt']);
    expect(mace.getConstruction()!.primaryChannel()).toBe('blunt');
  });
});

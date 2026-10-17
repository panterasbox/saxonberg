/**
 * ⭐ Stretch — within a garment's give, being tight costs nothing and being
 * loose is taken up (rubber build, D16).
 *
 * The give is `elasticity × the worn fraction × the form's stretch`, read
 * off the WAIST detail's material when one is set. A half-orc (92 kg,
 * 1.88 m) on the human plan average (70 kg, 1.75 m) is the drive's body:
 * tight in a plain stock pair, not tight in an elastic one.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WearableMixin } from '../Wearable';
import { SlottableMixin } from '../Slottable';
import { ConstructedMixin } from '../../material/Constructed';
import { ContainableMixin } from '../../spatial/Containable';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import { Construction } from '../../material/Construction';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestGarment extends WearableMixin(
  SlottableMixin(ContainableMixin(ConstructedMixin(Good))),
) {}

let seq = 0;
let planPath = '';
let plan: BodyPlan;

function material(name: string, elasticityPct: number): Material {
  const m = makeStuff(() => new Material());
  m.setName(name);
  m.setDensity(Quantity.of(1200, 'kg/m³'));
  m.setThermalConductivity(Quantity.of(0.05, 'W/(m·K)'));
  m.setElasticity(Quantity.of(elasticityPct, '%'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/stretch-${name}-${seq++}`);
  return m;
}

function wearer(massKg: number, statureM: number): Creature {
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  species.setBaseMass(massKg);
  species.setStature(statureM);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/stretch-${seq++}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function trousers(cloth: Material, form = 'woven', waist?: Material): TestGarment {
  const g = makeStuff(() => new TestGarment());
  g.setMaterial(cloth);
  if (waist) g.setMaterial(waist, 'waist');
  g.setMass(Quantity.of(0.5, 'kg'));
  g.setConstructionForm(form);
  g.setSlotClaim(planPath, ['torso']);
  return g;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  for (const [key, loft, stretch] of [
    ['woven', 0.1, undefined],
    ['knit', 0.45, 1.45],
    ['felted', 0.6, 0],
  ] as const) {
    Construction.registerFabric({ key, layerBand: 0, loft, weaveDensity: 0.5, drape: 0.5, stretch });
  }
  plan = makeStuff(() => new BodyPlan());
  plan.setName(`stretch-biped-${seq}`);
  plan.setBaseMass(70);
  plan.setBaseStature(1.75);
  plan.setSlots([{ name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] }]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', share: 1 }] },
  ]);
  planPath = `/stuff/idea/species/BodyPlan/stretch-${seq++}`;
  stampTemplatePathForTest(plan, planPath);
});
afterEach(() => {
  Construction.clearFabrics();
  StuffApi.clearAll();
});

describe('⭐ stretch takes up a misfit', () => {
  it('a half-orc is tight in plain stock linen and not in an elastic waist', () => {
    const halfOrc = wearer(92, 1.88);
    const linen = material('linen', 3);
    const rubber = material('rubber', 500);
    const plain = trousers(linen).fitOn(halfOrc);
    const elastic = trousers(linen, 'woven', rubber).fitOn(halfOrc);
    expect(plain.tightness).toBeGreaterThan(0.05);
    expect(elastic.tightness).toBeLessThan(0.05);
    expect(elastic.distance).toBeLessThan(plain.distance);
  });

  it('⚠ the give is round the body, not along it: a tall thin body is still short in the leg', () => {
    const tall = wearer(76, 2.05);
    const rubber = material('rubber', 500);
    const fit = trousers(material('linen', 3), 'woven', rubber).fitOn(tall);
    // Stature alone is 17 % over the cut; the band does nothing for it.
    expect(fit.tightness).toBeGreaterThan(0.05);
  });

  it('an elastic waist takes up looseness too: a gnome-thin body is held, not swamped', () => {
    const slight = wearer(55, 1.75);
    const linen = material('linen', 3);
    const plain = trousers(linen).fitOn(slight);
    const elastic = trousers(linen, 'woven', material('rubber', 500)).fitOn(slight);
    expect(plain.looseness).toBeGreaterThan(0.05);
    expect(elastic.looseness).toBe(0);
  });

  it('the form decides how far the fibre gives: knit more than woven, felt nothing', () => {
    const wool = material('wool', 30);
    const knit = trousers(wool, 'knit').stretchAllowance();
    const woven = trousers(wool, 'woven').stretchAllowance();
    const felt = trousers(wool, 'felted').stretchAllowance();
    expect(knit).toBeGreaterThan(woven);
    expect(woven).toBeCloseTo(0.3 * 0.04, 6);
    expect(felt).toBe(0);
  });

  it('a rigid garment gives nothing: no elasticity, no allowance', () => {
    expect(trousers(material('plate', 0)).stretchAllowance()).toBe(0);
  });
});

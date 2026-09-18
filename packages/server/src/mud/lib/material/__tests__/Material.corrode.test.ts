/**
 * ⭐⭐ `Material.corrodeOnContact` — the substance-contact corrosion seam.
 *
 * Before this, corrosion reached a body through exactly one thing: the
 * lime-seep hazard on traversal. A caustic SUBSTANCE — a spilled vial, a
 * thrown flask, a conjured acid — did nothing, because contact with a
 * caustic material had no path to `ConditionApi.inflict`. This proves the
 * general primitive: a caustic material, in contact with a body, leaves
 * the same `caustic` wound the hazard does, through the one injury door;
 * a non-caustic material is a no-op.
 */
import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import Material from '../Material';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Trauma } from '../../../platform/idea/Condition';

let seq = 0;

function caustic(corrosiveTo: string[]): Material {
  const m = makeStuff(() => new Material());
  m.setTags(['caustic']);
  (m as unknown as { corrosiveTo: string[] }).corrosiveTo = corrosiveTo;
  stampTemplatePathForTest(m, `/stuff/idea/material/test/cr-${seq++}`);
  return m;
}

function inert(): Material {
  const m = makeStuff(() => new Material());
  m.setTags(['liquid']);
  stampTemplatePathForTest(m, `/stuff/idea/material/test/in-${seq++}`);
  return m;
}

function bodied(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('cr-biped');
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/cr-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/cr-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

const woundOf = (c: Creature): Trauma | undefined =>
  c.getConditions().find((x): x is Trauma => x.kind === 'trauma');

describe('Material.corrodeOnContact — substance-contact corrosion', () => {
  it('a caustic material burns a body and leaves an ACTIVE caustic wound', () => {
    const body = bodied();
    const acid = caustic(['organic', 'tissue', 'leather', 'textile']);
    const attempted = acid.corrodeOnContact(body, { energy: 2 });
    expect(attempted).toBe(true);
    const w = woundOf(body)!;
    expect(w).toBeDefined();
    expect(w.type).toBe('caustic');
    // ⭐ still eating — the same thing that makes corrosion different in kind.
    expect(w.agentActive).toBe(true);
  });

  it('a non-caustic material is a no-op — returns false, no wound', () => {
    const body = bodied();
    const water = inert();
    expect(water.corrodeOnContact(body, { energy: 2 })).toBe(false);
    expect(woundOf(body)).toBeUndefined();
  });

  it('a non-organism target is refused — a wall does not bleed', () => {
    const acid = caustic(['metal']);
    const rock = inert(); // any non-organism Stuff
    expect(acid.corrodeOnContact(rock, { energy: 2 })).toBe(false);
  });

  it("the agent's own corrosiveTo rides the spec — an acid that eats METAL", () => {
    // The whole of the chemistry is the list: this one attacks metal,
    // which lime never does. The fold reads it off the material.
    const body = bodied();
    const vitriol = caustic(['metal', 'organic', 'tissue']);
    expect(vitriol.corrodeOnContact(body, { energy: 2 })).toBe(true);
    expect(woundOf(body)!.type).toBe('caustic');
  });
});

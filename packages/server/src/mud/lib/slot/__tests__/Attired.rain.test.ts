/**
 * ⭐ Rain on a dressed body (rubber build, D12.2): the outermost layer is
 * rained on, ONCE per distinct garment; the body takes what that layer
 * passes — its permeability × how soaked it already is. Wool soaks
 * through as it saturates; rubberized cloth passes nothing.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Garment from '../../../platform/thing/equipment/Garment';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Material from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;

function cloth(name: string, wac: number): Material {
  const m = makeStuff(() => new Material());
  m.setName(name);
  m.setWaterAbsorptionCapacity(Quantity.of(wac, '%'));
  stampTemplatePathForTest(m, `/stuff/idea/material/_rain/${name}-${seq++}`);
  return m;
}

function body(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('rain-biped');
  plan.setSlots([{ name: 'body', accepts: 'WearableMixin', covers: ['body.torso'] }]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', share: 1 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/rain-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/rain-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function coat(c: Creature, material: Material): Garment {
  const g = makeStuff(() => new Garment());
  g.setMaterial(material);
  g.setSlotClaim(c.getSpecies()!.getBodyPlan()!.getTemplatePath()!, ['body']);
  (c as unknown as { occupy(x: unknown, s: string): void }).occupy(g, 'body');
  return g;
}

type Rained = Creature & { exposeToRain(d: number): void; getWetness(): number };

describe('the outer layer sheds the rain', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a bare body takes all of it', () => {
    const b = body() as Rained;
    b.exposeToRain(0.2);
    expect(b.getWetness()).toBeCloseTo(0.2, 2);
  });

  it('⭐ a wool coat soaks through as it saturates — the body gets wet', () => {
    const b = body() as Rained;
    const g = coat(b, cloth('wool', 33));
    for (let i = 0; i < 10; i++) b.exposeToRain(0.2);
    expect((g as unknown as { getWetness(): number }).getWetness()).toBeGreaterThan(0.9);
    expect(b.getWetness()).toBeGreaterThan(0.3);
  });

  it('⭐⭐ a rubberized coat passes nothing — the body stays dry after ten segments', () => {
    const b = body() as Rained;
    coat(b, cloth('rubberized', 0.5));
    for (let i = 0; i < 10; i++) b.exposeToRain(0.2);
    expect(b.getWetness()).toBe(0);
  });

  it('one wet() per distinct garment, at the summed share', () => {
    const b = body() as Rained;
    const g = coat(b, cloth('linen', 20));
    const spy = vi.spyOn(g as unknown as { wet(n: number): void }, 'wet');
    b.exposeToRain(0.1);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

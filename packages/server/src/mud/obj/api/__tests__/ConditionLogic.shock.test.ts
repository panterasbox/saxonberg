/**
 * Phase 3 — the `inflict` shock branch. A `{mechanism:'shock', current}`
 * insult lands a local contact `burn` WITHOUT running the covering-stack
 * attenuate fold (the path resistance was resolved upstream). The proof is
 * behavioural: a shock burns a plate-armored body exactly as it burns a
 * bare one (an edge, by contrast, is deflected by the plate), and the
 * mechanical response functions are never touched on the shock path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConditionApi } from '../../../api/condition';
import { MaterialApi } from '../../../api/material';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../lib/species/Species';
import BodyPlan from '../../../lib/species/BodyPlan';
import Armor from '../../../lib/equipment/Armor';
import Material from '../../../lib/material/Material';
import { Construction } from '../../../lib/material/Construction';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../lib/vitals/Condition';

let seq = 0;

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  m.setElectricalConductivity(Quantity.of(6.0e6, 'S/m'));
  stampTemplatePathForTest(m, `/lib/material/test/steel-${seq++}`);
  return m;
}

function bodied(): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 2, covers: ['body.torso'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [
        { tissuePath: '/lib/material/tissue/bone', mass: 8 },
        { tissuePath: '/lib/material/tissue/flesh', mass: 20 },
      ],
    },
  ]);
  stampTemplatePathForTest(plan, `/lib/body-plans/test-shock-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/test/shock-${id}`);

  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  return c;
}

function planPathOf(c: Creature): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

function wearPlate(c: Creature): Armor {
  const a = makeStuff(() => new Armor());
  a.setMaterial(steel());
  a.setConstruction(Construction.of('plate'));
  a.setSlotClaim(planPathOf(c), ['torso']);
  (c as unknown as { occupy(x: unknown, s: string): void }).occupy(a, 'torso');
  return a;
}

function traumaOf(c: Creature): Trauma | undefined {
  return c.getConditions().find((x) => x.kind === 'trauma') as
    | Trauma
    | undefined;
}

describe('inflict — the shock branch', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('a shock lands a burn trauma with mechanism "shock"', () => {
    const body = bodied();
    const out = ConditionApi.inflict(body, {
      mechanism: 'shock',
      site: 'body.torso',
      current: Quantity.of(0.12, 'A'),
    });
    expect(out.afflicted).toBe(true);
    expect(out.trauma.type).toBe('burn');
    expect(out.trauma.mechanism).toBe('shock');
    expect(out.trauma.severity).toBeGreaterThan(0);
    expect(traumaOf(body)?.type).toBe('burn');
  });

  it('a below-threshold current (tingle) afflicts nothing but records truthfully', () => {
    const body = bodied();
    const out = ConditionApi.inflict(body, {
      mechanism: 'shock',
      site: 'body.torso',
      current: Quantity.of(0.001, 'A'),
    });
    expect(out.afflicted).toBe(false);
    expect(out.trauma.mechanism).toBe('shock');
    expect(traumaOf(body)).toBeUndefined();
  });

  it('SKIPS the covering fold — a shock burns a plate-armored body like a bare one', () => {
    // The load-bearing proof. An EDGE is deflected by plate; a SHOCK is not
    // (metal armor does not resist a shock — its resistance is resolved by
    // the conduction walk upstream, never by this fold).
    const armored = bodied();
    wearPlate(armored);
    const edge = ConditionApi.inflict(armored, {
      mechanism: 'edge',
      site: 'body.torso',
      energy: 2,
    });
    expect(edge.afflicted).toBe(false); // plate turns the edge

    const shock = ConditionApi.inflict(armored, {
      mechanism: 'shock',
      site: 'body.torso',
      current: Quantity.of(0.12, 'A'),
    });
    expect(shock.afflicted).toBe(true); // plate does NOT turn the shock
    expect(shock.trauma.type).toBe('burn');

    const bare = bodied();
    const bareShock = ConditionApi.inflict(bare, {
      mechanism: 'shock',
      site: 'body.torso',
      current: Quantity.of(0.12, 'A'),
    });
    // Same current → same burn severity, armored or bare (the fold is skipped).
    expect(shock.trauma.severity).toBeCloseTo(bareShock.trauma.severity, 9);
  });

  it('never consults the mechanical response functions on the shock path', () => {
    const attenuate = vi.spyOn(MaterialApi, 'attenuate');
    const resolveTrauma = vi.spyOn(MaterialApi, 'resolveTrauma');
    const resolveShock = vi.spyOn(MaterialApi, 'resolveShock');
    const armored = bodied();
    wearPlate(armored);

    ConditionApi.inflict(armored, {
      mechanism: 'shock',
      site: 'body.torso',
      current: Quantity.of(0.12, 'A'),
    });

    expect(attenuate).not.toHaveBeenCalled();
    expect(resolveTrauma).not.toHaveBeenCalled();
    expect(resolveShock).toHaveBeenCalledTimes(1);
  });
});

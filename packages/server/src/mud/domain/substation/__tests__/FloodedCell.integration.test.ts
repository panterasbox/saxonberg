/**
 * FloodedCell — the electricity demonstrator, end-to-end. A body waded into
 * the cell (the `onEntered` hazard) is shocked when bridged through the pool;
 * rubber boots break the ground path (unharmed); two allied bodies are BOTH
 * shocked (faction-blind). Plus the stun baton's direct-contact shock.
 *
 * Drives the real `ElectricityApi.conduct` / `shockContact` through the room
 * class; fixtures constructed (no clone pipeline / world needed).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import FloodedCell from '../FloodedCell';
import StunBaton from '../../../lib/electricity/StunBaton';
import { Construction } from '../../../lib/material/Construction';
import Armor from '../../../lib/equipment/Armor';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../lib/species/Species';
import BodyPlan from '../../../lib/species/BodyPlan';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { ElectricityApi } from '../../../api/electricity';
import { Quantity } from '../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../lib/vitals/Condition';
import type { Stuff } from '../../../lib/stuff/Stuff';

let seq = 0;

function installSaltWater(): void {
  const m = makeStuff(() => new Material());
  m.setName('salt water');
  m.setElectricalConductivity(Quantity.of(5, 'S/m'));
  stampTemplatePathForTest(m, '/lib/material/bulk/salt-water');
}
function rubber(): Material {
  const m = makeStuff(() => new Material());
  m.setName('rubber');
  m.setElectricalConductivity(Quantity.of(1.0e-13, 'S/m'));
  stampTemplatePathForTest(m, `/lib/material/test/rubber-${seq++}`);
  return m;
}

async function makeCell(): Promise<FloodedCell> {
  const cell = await StuffApi.create(() => new FloodedCell());
  await cell.provisionHazard();
  return cell;
}

function makeBody(cell: FloodedCell): Creature {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    {
      name: 'feet',
      accepts: 'WearableMixin',
      covers: ['body.leg.left.foot', 'body.leg.right.foot'],
    },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.left.foot',
      parent: 'body.leg.left',
      tissues: [{ tissuePath: '/lib/material/tissue/flesh', mass: 0.5 }],
    },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.right.foot',
      parent: 'body.leg.right',
      tissues: [{ tissuePath: '/lib/material/tissue/flesh', mass: 0.5 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/lib/body-plans/cell-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/cell-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  ContainmentApi.move(c as never, cell as never);
  return c;
}

function bootUp(c: Creature, material: Material): void {
  const boots = makeStuff(() => new Armor());
  boots.setMaterial(material);
  boots.setSlotClaim(c.getSpecies()!.getBodyPlan()!.getTemplatePath()!, [
    'feet',
  ]);
  (c as unknown as { occupy(x: unknown, s: string): void }).occupy(boots, 'feet');
}

function shocked(c: Creature): boolean {
  return c
    .getConditions()
    .some((x): x is Trauma => x.kind === 'trauma' && x.type === 'burn');
}

describe('FloodedCell — the electricity demonstrator', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installSaltWater();
  });
  afterEach(() => StuffApi.clearAll());

  it('a barefoot body waded in is shocked', async () => {
    const cell = await makeCell();
    const body = makeBody(cell);
    cell.onEntered(body as unknown as Stuff, null);
    expect(shocked(body)).toBe(true);
  });

  it('rubber boots break the ground path — unharmed (counterplay)', async () => {
    const cell = await makeCell();
    const body = makeBody(cell);
    bootUp(body, rubber());
    cell.onEntered(body as unknown as Stuff, null);
    expect(shocked(body)).toBe(false);
  });

  it('two allied bodies in the pool are BOTH shocked (faction-blind)', async () => {
    const cell = await makeCell();
    const a = makeBody(cell);
    const b = makeBody(cell);
    cell.onEntered(a as unknown as Stuff, null);
    expect(shocked(a)).toBe(true);
    expect(shocked(b)).toBe(true); // the hazard hits everyone bridged
  });

  it('the stun baton delivers a direct-contact shock', async () => {
    const baton = makeStuff(() => new StunBaton());
    baton.setConstruction(Construction.of('hafted'));
    baton.setVoltage(Quantity.of(5000, 'V')); // contact stun → ~50 mA dry
    baton.switchOn();
    stampTemplatePathForTest(baton, `/obj/test-baton-${seq++}`);

    const cell = await makeCell();
    const target = makeBody(cell);
    const out = ElectricityApi.shockContact(
      baton as unknown as never,
      target as unknown as Stuff,
    );
    expect(out.length).toBe(1);
    expect(shocked(target)).toBe(true);
  });
});

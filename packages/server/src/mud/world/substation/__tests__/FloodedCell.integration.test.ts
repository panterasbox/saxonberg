/**
 * FloodedCell — the electricity demonstrator, end-to-end. A body waded into
 * the cell (the `onEntered` hazard) is shocked when bridged through the pool;
 * rubber boots break the ground path (unharmed); two allied bodies are BOTH
 * shocked (faction-blind). Plus the stun baton's direct-contact shock.
 *
 * Drives the real `ElectricityApi.conduct` / `shockContact` through the room
 * class. The hazard fixtures (the brine-pooled Floor + the LiveWire) are
 * authored templates the room's seed places declaratively (`adornments:` /
 * `props:`) at boot; this test stands the same fixtures up directly (the
 * seed clone pipeline needs a live world) so it exercises the room's real
 * `onEntered` → conduct behavior.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import FloodedCell from '../FloodedCell';
import LiveWire from '../../../platform/thing/LiveWire';
import Floor from '../../../platform/thing/Floor';
import StunBaton from '../../../platform/thing/equipment/StunBaton';
import { Construction } from '../../../lib/material/Construction';
import Garment from '../../../platform/thing/equipment/Garment';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
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
import type { Trauma } from '../../../platform/idea/Condition';
import type { Stuff } from '../../../lib/stuff/Stuff';

let seq = 0;

function installSaltWater(): void {
  const m = makeStuff(() => new Material());
  m.setName('salt water');
  m.setElectricalConductivity(Quantity.of(5, 'S/m'));
  stampTemplatePathForTest(m, '/stuff/idea/material/bulk/salt-water');
}
function rubber(): Material {
  const m = makeStuff(() => new Material());
  m.setName('rubber');
  m.setElectricalConductivity(Quantity.of(1.0e-13, 'S/m'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/rubber-${seq++}`);
  return m;
}

/**
 * Stand up the cell + its hazard fixtures the way the seed does declaratively
 * (`adornments:` a brine-pooled Floor, `props:` a LiveWire) — done
 * directly here since the faked-Mongo test has no clone pipeline.
 */
async function makeCell(): Promise<FloodedCell> {
  const cell = await StuffApi.create(() => new FloodedCell());

  const floor = makeStuff(() => new Floor());
  floor.surfaceBulk = true;
  floor.setBulkMaterial(
    'surface',
    StuffApi.findByTemplatePath<Material>('/stuff/idea/material/bulk/salt-water') ??
      null,
  );
  floor.setBulkAmount('surface', Quantity.of(40, 'L'));
  (cell as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);

  const wire = makeStuff(() => new LiveWire());
  wire.setVoltage(Quantity.of(120, 'V'));
  wire.switchOn();
  ContainmentApi.move(wire as never, cell as never);

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
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 0.5 }],
    },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.right.foot',
      parent: 'body.leg.right',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 0.5 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/cell-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/cell-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  ContainmentApi.move(c as never, cell as never);
  return c;
}

function bootUp(c: Creature, material: Material): void {
  const boots = makeStuff(() => new Garment());
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
    const out = (
      baton as unknown as { shockContact(v: Stuff): unknown[] }
    ).shockContact(target as unknown as Stuff);
    expect(out.length).toBe(1);
    expect(shocked(target)).toBe(true);
  });
});

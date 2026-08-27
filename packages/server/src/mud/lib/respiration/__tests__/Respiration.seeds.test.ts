/**
 * Smoke test for the respiration seed content shapes — the genuinely-new
 * hydration cases (the air tank's interior bulk + slot claims; the
 * asphyxiation condition). Locations reuse fully-tested seed patterns and
 * are validated at boot; this guards the new shapes against drift.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import AirTank from '../../../platform/thing/AirTank';
import Condition from '../../../platform/idea/Condition';
import Material from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

function seedData(rel: string): Record<string, unknown> {
  const doc = YAML.parse(
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8'),
  ) as { data: Record<string, unknown> };
  return doc.data;
}

function hydrator(): PersistentHydrator {
  return makeStuff(() => new PersistentHydrator());
}

describe('respiration seeds — new content shapes hydrate', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new Material(), '/stuff/idea/material/bulk/air').setName(
      'air',
    );
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('air-tank seed hydrates into a worn air-bulk tank', async () => {
    const data = seedData(
      '../../../../../../content/generic-objects/content/stuff/thing/gear/air-tank.yaml',
    );
    const tank = makeStuff(() => new AirTank());
    await hydrator().hydrate(tank, data);

    expect(tank.hasInteriorBulk()).toBe(true);
    const slot = tank.getBulk('interior');
    expect(slot.getCapacity()?.rawValue()).toBe(6);
    expect(slot.getAmount().rawValue()).toBe(6);
    expect(tank.getBulkMaterial('interior')?.getName()).toBe('air');
    expect(tank.getSlotClaims()['/stuff/idea/species/BodyPlan/biped']).toEqual(['torso']);
    expect(tank.getAirGauge()).toBe(1);
  });

  it('asphyxiation condition seed hydrates', async () => {
    const data = seedData(
      '../../../../../../content/platform/content/platform/idea/Condition/respiration/asphyxiation.yaml',
    );
    const cond = makeStuff(() => new Condition());
    await hydrator().hydrate(cond, data);
    expect(cond.getName()).toBe('asphyxiation');
  });
});

/**
 * ⭐ The prosthesis rows hydrate their `forParts` / `restores` / `slotClaims`
 * through the real field-setter path (recovery D16). A malformed field
 * would throw here, in the pack's own suite.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import Prosthesis from '../thing/Prosthesis';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

const CONTENT = fileURLToPath(new URL('../../content', import.meta.url));
const BIPED = '/stuff/idea/species/BodyPlan/biped';

function rowData(rel: string): Record<string, unknown> {
  const parsed = YAML.parse(
    readFileSync(join(CONTENT, rel), 'utf8'),
  ) as { data?: Record<string, unknown> };
  return parsed.data ?? {};
}

async function hydrate(rel: string): Promise<Prosthesis> {
  const item = makeStuff(() => new Prosthesis());
  const hydrator = makeStuff(() => new PersistentHydrator());
  await hydrator.hydrate(item as never, rowData(rel));
  return item;
}

beforeEach(() => installV1QuantityMarshallers());
afterEach(() => StuffApi.clearAll());

describe('the prosthesis rows hydrate', () => {
  it('⭐ the peg leg stands in for a leg at 0.6, claiming the legs slot', async () => {
    const peg = await hydrate('trade/medicine/thing/peg-leg.yaml');
    expect(peg.getForParts()).toContain('body.leg.left');
    expect(peg.getForParts()).toContain('body.leg.right');
    expect(peg.getRestores()).toBeCloseTo(0.6, 5);
    expect(peg.getSlotClaim(BIPED)).toContain('legs');
  });

  it('⭐ the hook hand stands in for a hand at 0.35, claiming the hands slot', async () => {
    const hook = await hydrate('trade/medicine/thing/hook-hand.yaml');
    expect(hook.getForParts()).toContain('body.arm.left.hand');
    expect(hook.getRestores()).toBeCloseTo(0.35, 5);
    expect(hook.getSlotClaim(BIPED)).toContain('hands');
  });
});

/**
 * ⭐ The signal bell (underwater C5) is rung with the platform's `ring` —
 * one verb per act — and answers it as a bell: loud, and heard as the
 * bell from nowhere, never as the hand that struck it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import SignalBell from '../thing/SignalBell';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

let seq = 0;
function bellOf(tags: string[]): SignalBell {
  seq += 1;
  const mat = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('bronze');
    m.setTags(tags);
    m.setDensity(Quantity.of(8800, 'kg/m³'));
    return m;
  }, `/stuff/idea/material/_signal/bronze-${seq}`) as unknown as Material;
  return makeStuff(() => {
    const b = new SignalBell();
    b.setMass(Quantity.of(0.3, 'kg'));
    b.setMaterial(mat);
    return b;
  });
}

beforeEach(() => installV1QuantityMarshallers());

describe('the signal bell', () => {
  it('⭐ rings loud, and what the others hear is the bell from nowhere', () => {
    const r = bellOf(['alloy', 'metal']).ringSound();
    expect(r.rings).toBe(true);
    expect(r.db).toBeGreaterThanOrEqual(90);
    expect(r.carries).toMatch(/bell rings out[^.]*nowhere/i);
  });

  it('a bell that will not ring is only knocked — no carrying note', () => {
    const r = bellOf(['wood']).ringSound();
    expect(r.rings).toBe(false);
    expect(r.carries).toBeUndefined();
  });
});

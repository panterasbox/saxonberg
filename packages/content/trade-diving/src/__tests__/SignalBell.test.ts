/**
 * ⭐ The signal bell (underwater C5) is rung with the platform's `ring` —
 * one verb per act — and answers it as a bell: loud, and heard as the
 * bell from nowhere, never as the hand that struck it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SignalBell from '../thing/SignalBell';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
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
afterEach(() => WorldClockApi._resetForTesting());

describe('the signal bell', () => {
  it('⭐ rings loud, and what the others hear is the bell from nowhere', () => {
    const r = bellOf(['alloy', 'metal']).ringSound();
    expect(r.rings).toBe(true);
    expect(r.db).toBeGreaterThanOrEqual(90);
    expect(r.description).toMatch(/bell rings out[^.]*nowhere/i);
  });

  it('a bell that will not ring is only knocked — no carrying note', () => {
    const r = bellOf(['wood']).ringSound();
    expect(r.rings).toBe(false);
    expect(r.description).not.toMatch(/bell rings out/i);
  });

  it('⭐ a ringable signal: struck by the platform `ring`, it remembers when (the ferryman reads it — river W16)', () => {
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 5_000);
    const b = bellOf(['alloy', 'metal']);
    expect(MixinApi.isRingable(b)).toBe(true);
    expect(MixinApi.isAudible(b)).toBe(true); // sounded through the audible system (R2-D4)
    expect(b.getLastRungAtS()).toBe(Number.NEGATIVE_INFINITY);
    b.struck();
    expect(Number.isFinite(b.getLastRungAtS())).toBe(true);
  });
});

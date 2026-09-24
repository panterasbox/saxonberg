/**
 * ⭐ HygieneMixin (recovery D10) — a `washedAt` stamp that decays to dirty.
 * Clean hands treat a wound without infecting it (D11); dirty ones seed it.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { HYGIENE_SOIL_SEC } from '../Hygiene';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

beforeEach(() => {
  installV1QuantityMarshallers();
  atGameSeconds(10_000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('HygieneMixin', () => {
  it('⭐ a never-washed body reads fully dirty', () => {
    const c = makeStuff(() => new Creature());
    expect(c.getWashedAt()).toBeNull();
    expect(c.handsCleanliness()).toBe(0);
  });

  it('⭐ scrub reads clean, then decays to dirty over the soil window', () => {
    const c = makeStuff(() => new Creature());
    c.scrub();
    expect(c.handsCleanliness()).toBeCloseTo(1, 5);
    // Halfway through the window → about half clean.
    atGameSeconds(10_000 + HYGIENE_SOIL_SEC / 2);
    expect(c.handsCleanliness()).toBeCloseTo(0.5, 2);
    // Past the window → fully dirty again.
    atGameSeconds(10_000 + HYGIENE_SOIL_SEC + 100);
    expect(c.handsCleanliness()).toBe(0);
  });

  it('⭐ soil() dirties in one act (the Serviceable shape)', () => {
    const c = makeStuff(() => new Creature());
    c.scrub();
    expect(c.handsCleanliness()).toBeCloseTo(1, 5);
    c.soil();
    expect(c.getWashedAt()).toBeNull();
    expect(c.handsCleanliness()).toBe(0);
  });
});

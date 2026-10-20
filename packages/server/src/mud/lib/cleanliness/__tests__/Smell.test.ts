/**
 * ⭐ Dirt smells (cleanliness B57): a soiled thing's odour is derived from
 * what is on it (each kind's row `odour` × its load), a body smells of its
 * skin AND what it wears, and the description gives each line to its sense.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Garment from '../../../platform/thing/equipment/Garment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { soilBody, wear, installDirtKinds } from './soil-fixtures';
import type { Stuff } from '../../stuff/Stuff';
import type { SenseChannel } from '../../description/Perceiver';

const DIRT = [
  { key: 'sweat', adjective: 'sweat-stained', form: 'film', answersTo: ['surfactant'], odour: { identity: 'stale sweat', ppmPerLoad: 40 } },
  { key: 'mud', adjective: 'muddy', form: 'film', answersTo: ['surfactant'] },
];

beforeEach(() => {
  installV1QuantityMarshallers();
  installDirtKinds(DIRT as Record<string, unknown>[]);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

const describeFor = (host: Stuff, filter?: SenseChannel[]): string =>
  MixinApi.getAllMarkupAugmenters(
    (host as unknown as { constructor: never }).constructor,
  ).reduce((text, fn) => fn(text, host, host, filter ? { filter } : undefined), '');

describe('dirt smells', () => {
  it('⭐ a sweat-soaked shirt smells of stale sweat; mud has no nose', () => {
    const shirt = makeStuff(() => new Garment());
    shirt.soil('mud', 0.8, null);
    expect(shirt.soilOdour()).toBeNull();
    shirt.soil('sweat', 0.5, null);
    expect(shirt.soilOdour()).toEqual({ identity: 'stale sweat', ppm: 20 });
  });

  it('⭐ a body smells of what it wears', () => {
    const body = soilBody();
    const shirt = wear(body, 'torso');
    shirt.soil('sweat', 0.5, null);
    expect(body.soilOdour()?.identity).toBe('stale sweat');
    expect(body.soilOdour()?.ppm).toBeGreaterThanOrEqual(20);
  });

  it('⭐ each line to its sense: `smell` reads the sweat, never the marks', () => {
    const shirt = makeStuff(() => new Garment());
    shirt.soil('mud', 0.5, null);
    shirt.soil('sweat', 0.5, null);
    const smell = describeFor(shirt, ['smell']);
    expect(smell).toMatch(/smells of stale sweat/);
    expect(smell).not.toMatch(/muddy/);
    const look = describeFor(shirt, ['vision']);
    expect(look).toMatch(/muddy/);
    expect(look).not.toMatch(/stale sweat/);
  });
});

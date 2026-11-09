/**
 * ⭐ Dirt smells (cleanliness B57): a soiled thing's odor is derived from
 * what is on it (each kind's row `odor` × its load), and the description is
 * sight's alone; a nose reads dirt as a source.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Garment from '../../../platform/thing/equipment/Garment';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installDirtKinds } from './soil-fixtures';
import type { Stuff } from '../../stuff/Stuff';
import type { SenseChannel } from '../../description/Perceiver';

const DIRT = [
  { key: 'sweat', adjective: 'sweat-stained', form: 'film', answersTo: ['surfactant'], odor: { aroma: '/base-library/aromas/stale-sweat', ouPerLoad: 40 } },
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
    shirt.soil('/platform/dirt/mud', 0.8, null);
    expect(shirt.soilOdor()).toEqual([]);
    shirt.soil('/platform/dirt/sweat', 0.5, null);
    expect(shirt.soilOdor()).toEqual([{ aroma: '/base-library/aromas/stale-sweat', ou: 20 }]);
  });

  it('the description is for sight: `smell` adds nothing of the marks', () => {
    const shirt = makeStuff(() => new Garment());
    shirt.soil('/platform/dirt/mud', 0.5, null);
    shirt.soil('/platform/dirt/sweat', 0.5, null);
    const smell = describeFor(shirt, ['smell']);
    expect(smell).not.toMatch(/muddy/);
    expect(smell).not.toMatch(/stale sweat/);
    expect(describeFor(shirt, ['vision'])).toMatch(/muddy/);
  });
});

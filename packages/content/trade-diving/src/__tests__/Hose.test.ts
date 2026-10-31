/**
 * The air hose (underwater C3; cordage D2) — a LINE, not a rope: the tender
 * hauls on it and the diver tugs on it, and its free end is a hose's end, a
 * plain line end that no one climbs.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Hose from '../thing/Hose';
import LineEnd from '@saxonberg/server/mud/platform/thing/LineEnd';
import Rope from '@saxonberg/server/mud/platform/thing/Rope';
import Location from '@saxonberg/server/mud/platform/location/Location';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { makeStuff, makeStuffAtPath, seedKernelContentStore } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

class Body extends Character {}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  seedKernelContentStore();
  const realClone = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === '/platform/thing/line-end') return makeStuff(() => new LineEnd());
    return (realClone as (...a: unknown[]) => unknown)(path, ...rest);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the air hose (cordage D2)', () => {
  it('⭐ made fast to a diver, its end is a hose\'s end — and it is no rope', async () => {
    const quay = makeStuffAtPath(() => new Location(), '/test/diving/hose-quay');
    const tender = makeStuff(() => new Body());
    const diver = makeStuff(() => new Body());
    ContainmentApi.move(tender as never, quay as never);
    ContainmentApi.move(diver as never, quay as never);
    const hose = makeStuff(() => new Hose());
    ContainmentApi.move(hose as never, tender as never);
    await hose.makeFast(diver as unknown as Stuff);
    expect(hose.getOnEnd()).toBe(diver);
    const end = hose.getEnd()!;
    expect(end.getShortDescription()).toBe('end of an air hose');
    expect(MixinApi.hasMixin(end as unknown as Stuff, 'ClimbableMixin')).toBe(false);
    expect(hose instanceof Rope).toBe(false);
  });
});

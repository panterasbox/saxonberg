/**
 * The air pump (underwater C3): with nobody on its hose it refuses in its
 * own words; it speaks the kernel's `Pumpable` protocol.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import AirPump from '../thing/AirPump';
import Location from '@saxonberg/server/mud/platform/location/CartesianLocation';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

class Body extends Character {}

afterEach(() => StuffApi.clearAll());

describe('the air pump (C3)', () => {
  it('with nobody down on the hose, the pump wheezes', async () => {
    const quay = makeStuff(() => new Location());
    const pump = makeStuff(() => new AirPump());
    const hand = makeStuff(() => new Body());
    ContainmentApi.move(pump as never, quay as never);
    ContainmentApi.move(hand as never, quay as never);
    const plan = await pump.planPump(hand as unknown as Stuff);
    expect(plan).toMatchObject({ kind: 'refusal', reason: 'no-diver-on-hose' });
  });
});

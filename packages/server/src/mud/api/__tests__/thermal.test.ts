/**
 * ThermalApi.reachableHeatFor — the inert crafting seam ("hottest lit
 * Furnace in the caller's container"). The depositHeat suite moved to
 * lib/thermal/__tests__/depositHeat.test.ts with the method (the Api
 * OO sweep's B2 exemplar).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';
import Forge from '../../platform/thing/Forge';
import { ThermalApi } from '../thermal';
import { FireApi } from '../fire';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { Reserve } from '../../lib/reserve';
import { Quantity } from '../../lib/quantity';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class ReachRoom extends Location {}

describe('ThermalApi.reachableHeatFor — the inert crafting seam', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  function forge(heldK: number): Forge {
    return makeStuff(() => {
      const f = new Forge();
      f.setBurnTemperatureK(heldK);
      f.setReserve(
        new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
      );
      return f;
    });
  }

  it('returns the hottest lit furnace reachable from a position', () => {
    const room = makeStuff(() => new ReachRoom());
    const cool = forge(900);
    const hot = forge(1500);
    const maker = makeStuff(() => new Thing());
    ContainmentApi.move(cool, room);
    ContainmentApi.move(hot, room);
    ContainmentApi.move(maker, room);
    expect(ThermalApi.reachableHeatFor(maker)).toBe(1500);
  });

  it('returns 0 when no lit furnace is in reach', () => {
    const room = makeStuff(() => new ReachRoom());
    const maker = makeStuff(() => new Thing());
    ContainmentApi.move(maker, room);
    expect(ThermalApi.reachableHeatFor(maker)).toBe(0);

    // An unlit forge does not count.
    const f = forge(1500);
    FireApi.douse(f);
    ContainmentApi.move(f, room);
    expect(ThermalApi.reachableHeatFor(maker)).toBe(0);
  });
});

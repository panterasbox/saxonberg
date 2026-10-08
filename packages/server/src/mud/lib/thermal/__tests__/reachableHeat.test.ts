/**
 * Thermal.reachableHeatK — the inert crafting seam (on the mixin since the OO sweep) ("hottest lit
 * Burner in the caller's container"). The depositHeat suite moved to
 * lib/thermal/__tests__/depositHeat.test.ts with the method (the Api
 * OO sweep's B2 exemplar).
 */

import "../../../../test-bootstrap";
import type { Stuff } from '../../stuff/Stuff';
import { ThermalMixin } from '../Thermal';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import Location from '../../stuff/Location';
import Forge from '../../../platform/thing/Forge';
import { FireApi } from '../../../api/fire';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Reserve } from '../../reserve';
import { chargeHot } from '../../fire/__tests__/burner-fuel';
import type { Burner } from '../../fire/Burner';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class ReachRoom extends Location {}
class ThermalThing extends ThermalMixin(Good) {
  static _mixinName = 'ReachThermalThing';
}

describe('reachableHeatK — the inert crafting seam', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  function forge(heldK: number): Forge {
    return makeStuff(() => {
      const f = new Forge();
      f.setBurnTemperatureK(heldK);
      chargeHot(f as unknown as Stuff & Burner, 40);
      return f;
    });
  }

  it('returns the hottest lit furnace reachable from a position', () => {
    const room = makeStuff(() => new ReachRoom());
    const cool = forge(900);
    const hot = forge(1500);
    const maker = makeStuff(() => new ThermalThing());
    ContainmentApi.move(cool, room);
    ContainmentApi.move(hot, room);
    ContainmentApi.move(maker, room);
    expect(maker.reachableHeatK()).toBe(1500);
  });

  it('returns 0 when no lit furnace is in reach', () => {
    const room = makeStuff(() => new ReachRoom());
    const maker = makeStuff(() => new ThermalThing());
    ContainmentApi.move(maker, room);
    expect(maker.reachableHeatK()).toBe(0);

    // An unlit forge does not count.
    const f = forge(1500);
    f.douse();
    ContainmentApi.move(f, room);
    expect(maker.reachableHeatK()).toBe(0);
  });
});

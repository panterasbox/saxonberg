/**
 * ⭐ A thing IN a pot on the boil is held at the boil by the POT
 * (controllers-are-io D8c — `boil` was a temperature, not an act): the
 * vessel's own thermal reconcile credits each Soilable occupant's clock
 * since it went in, so a bandage left in a boiling pot comes out
 * disinfected with no verb run on it.
 *
 * ⚠ The two traps the survey named: the heat stamp is the whole hold since
 * entry (never summed into a hottest-single-hold record), and the kill runs
 * once over each increment (never re-run from zero every read).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Place from '../../stuff/Place';
import Water from '../../../platform/idea/material/Water';
import CraftVessel from '../../../platform/thing/CraftVessel';
import Bandage from '../../../platform/thing/Bandage';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestRoom extends Place {}

let seq = 0;
let realMs = 0;
const advanceGameS = (s: number): void => {
  const scale = WorldClockApi.getScale() || 1;
  realMs += (s * 1000) / scale;
};

function water(): Water {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Water();
    m.setName('water');
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
    return m;
  }, `/stuff/idea/material/_test/boil-occupants-${seq}`) as unknown as Water;
}

/** A pot of water held at `startK` in a room at `roomK`, and a bandage. */
function potAndBandage(startK: number, roomK: number): { pot: CraftVessel; bandage: Bandage } {
  const room = makeStuff(() => new TestRoom());
  const pot = makeStuff(() => new CraftVessel());
  pot.interiorBulk = true;
  pot.setInteriorCapacity(Quantity.of(4, 'L'));
  pot.setBulkMaterial('interior', water());
  pot.setBulkAmount('interior', Quantity.of(3, 'L'));
  ContainmentApi.move(pot, room);
  pot.setStampedTemperatureK(startK);
  pot.setLastAmbientK(roomK);
  pot.reconcileThermal(); // first touch — seeds the trajectory
  const bandage = makeStuff(() => new Bandage());
  ContainmentApi.move(bandage, room);
  return { pot, bandage };
}

describe('a pot on the boil holds what is in it at the boil (D8c)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    realMs = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => realMs);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('⭐ a bandage in a boiling pot is disinfected by the pot’s own reconcile', () => {
    const { pot, bandage } = potAndBandage(373, 400);
    expect(bandage.cleanTier()).toBe('presentable'); // raw: nobody made it clean
    ContainmentApi.move(bandage, pot);
    expect(bandage.getBathHold()).not.toBeNull();
    advanceGameS(400);
    pot.reconcileThermal();
    expect(bandage.getHeatStamp()?.heldS ?? 0).toBeGreaterThanOrEqual(300);
    expect(bandage.cleanTier()).toBe('disinfected');
  });

  it('the clock is the bandage’s since it went IN, read after read — summed, not the longest one', () => {
    const { pot, bandage } = potAndBandage(373, 400);
    advanceGameS(600); // the pot boils ten minutes with nothing in it
    pot.reconcileThermal();
    ContainmentApi.move(bandage, pot);
    advanceGameS(200);
    pot.reconcileThermal();
    const first = bandage.getHeatStamp()?.heldS ?? 0;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThanOrEqual(200 + 1); // never the pot's ten minutes before it went in
    expect(bandage.cleanTier()).not.toBe('disinfected');
    advanceGameS(200);
    pot.reconcileThermal();
    expect(bandage.getHeatStamp()?.heldS ?? 0).toBeGreaterThan(first + 150);
    expect(bandage.cleanTier()).toBe('disinfected');
  });

  it('a pot that is not boiling holds nothing at the boil', () => {
    const { pot, bandage } = potAndBandage(330, 340);
    ContainmentApi.move(bandage, pot);
    advanceGameS(1200);
    pot.reconcileThermal();
    expect(bandage.getHeatStamp()).toBeNull();
    expect(bandage.cleanTier()).toBe('presentable');
  });

  it('taken out, its bath clock stops', () => {
    const { pot, bandage } = potAndBandage(373, 400);
    ContainmentApi.move(bandage, pot);
    const room = pot.getContainer()!;
    ContainmentApi.move(bandage, room as never);
    expect(bandage.getBathHold()).toBeNull();
  });
});

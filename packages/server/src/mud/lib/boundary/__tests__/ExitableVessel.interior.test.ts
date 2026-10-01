/**
 * ⭐⭐ **A thing you can go inside is a place with air** — the
 * base-class narrowing build's claim, and the four behaviours that make
 * it true rather than merely declared.
 *
 * `AtmosphericMixin` composed on `Vessel` until this build, which gave a
 * backpack, a till, a jar, a rack, a footlocker, a handcart and a bank
 * counter each a temperature, a pressure, a humidity, a wind and a
 * biome of their own. Thirty-seven rows over fifteen composers, and not
 * one authored a single atmospheric field.
 *
 * Moving the mixin is the easy half. The hard half is that the envelope
 * **would not have run** on the class it moved to, for two separate
 * reasons the shipped predicates get wrong about a vehicle, and both are
 * asserted here.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ExitableVessel from '../ExitableVessel';
import { Vessel } from '../../stuff/Vessel';
import { SealableMixin } from '../../spatial/Sealable';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Biome from '../../biome/Biome';
import { SkyExposedBiome } from '../../../platform/idea/SkyExposedBiome';
import { Quantity } from '../../quantity';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
  seedKernelContentStore,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A coach: an enterable vessel that can be shut. */
class SealedVessel extends SealableMixin(ExitableVessel) {}

/** Somewhere to park one, under the open sky. */
async function street(): Promise<CartesianLocation> {
  const zone = makeStuff(() => new CartesianZone());
  const room = makeStuff(() => new CartesianLocation());
  zone.addLocation(room, 0, 0, 0);
  room.setBiome(
    makeStuffAtPath(
      () => new SkyExposedBiome(),
      '/stuff/idea/biome/outdoor/narrowing-street',
    ),
  );
  return room;
}

describe('⭐⭐ an enterable vessel is a place with air', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    seedKernelContentStore();
    makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultTemperature(Quantity.of(288, 'K'));
      b.setDefaultPressure(Quantity.of(101325, 'Pa'));
      b.setDefaultHumidity(Quantity.of(50, '%'));
      b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
      b.setDefaultWind(Quantity.of(0, 'm/s'));
      b.setDefaultAtmosphere('air');
      return b;
    }, '/stuff/idea/biome/universe');
  });
  afterEach(() => StuffApi.clearAll());

  it('the mixin is on ExitableVessel and NOT on Vessel', () => {
    expect(MixinApi.hasMixin(ExitableVessel, Mixins.Atmospheric)).toBe(true);
    expect(MixinApi.hasMixin(Vessel, Mixins.Atmospheric)).toBe(false);
  });

  it('⭐ an unset interiorVolume DECLINES an envelope — an open boat is not a cabin', async () => {
    const boat = await StuffApi.create(() => new ExitableVessel());
    expect(boat.getInteriorVolume()).toBeNull();
    expect(boat.getVolume()).toBeNull();
    expect(boat.envelopeApplies()).toBe(false);
  });

  it('⚠⚠ an authored interior is roofed BY DECLARATION, under the open sky', async () => {
    // The shipped `envelopeApplies` asks three questions and the third —
    // *am I open to the sky?* — walks outward to the nearest atmospheric
    // ancestor with a biome. A coach parked in a street inherits the
    // STREET's sky-exposed biome, so the shipped predicate answers false
    // and the envelope never runs, volume or no volume. A carriage under
    // the open sky still has a roof.
    const road = await street();
    const coach = await StuffApi.create(() => new ExitableVessel());
    coach.setInteriorVolume(Quantity.of(5, 'm³'));
    ContainmentApi.move(coach, road);

    expect(coach.getVolume()?.rawValue()).toBe(5);
    expect(coach.envelopeApplies()).toBe(true);
  });

  it('⭐ an authored _temperature still wins outright, as it does everywhere', async () => {
    const hold = await StuffApi.create(() => new ExitableVessel());
    hold.setInteriorVolume(Quantity.of(5, 'm³'));
    hold.setTemperature(Quantity.of(279, 'K'));
    expect(hold.envelopeApplies()).toBe(false);
  });

  it('⚠⚠ a SHUT vessel has no exterior opening — the seal IS the door', async () => {
    // The base counts obvious exits onto the sky whose door, if any,
    // stands open. A coach synthesizes one `out` exit and authors no
    // `door:` — it authors `open: false` on Sealable — so the base finds
    // a doorless exit onto a street and reads a shut carriage as
    // standing wide open. Whatever else is true of a shut box, it is not
    // ventilated.
    const road = await street();
    const coach = await StuffApi.create(() => new SealedVessel());
    coach.setInteriorVolume(Quantity.of(5, 'm³'));
    ContainmentApi.move(coach, road);

    coach.setOpen(false);
    expect(coach.openExteriorOpenings()).toBe(0);

    coach.setOpen(true);
    expect(coach.openExteriorOpenings()).toBeGreaterThan(0);
  });

  it('setInteriorVolume refuses a volume that is not one', async () => {
    const v = await StuffApi.create(() => new ExitableVessel());
    expect(() => v.setInteriorVolume(Quantity.of(0, 'm³'))).toThrow(RangeError);
    expect(() => v.setInteriorVolume(Quantity.of(-3, 'm³'))).toThrow(RangeError);
    // null is how a row declines one, and must stay legal.
    expect(() => v.setInteriorVolume(null)).not.toThrow();
  });
});

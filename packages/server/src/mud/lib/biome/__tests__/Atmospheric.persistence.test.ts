import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../stuff/Location';
import { Vessel } from '../../stuff/Vessel';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}
class TestVessel extends Vessel {}

describe('AtmosphericMixin — composition + storage', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Location composes AtmosphericMixin', () => {
    const room = makeStuff(() => new TestLocation());
    expect(MixinApi.hasMixin(room, Mixins.Atmospheric)).toBe(true);
  });

  it('⭐ Vessel does NOT compose AtmosphericMixin — a bag is not a place', () => {
    // It did, from the class's first commit, on the framing "matter from
    // the outside, a place from the inside". But *inside* is somewhere
    // you can only BE for a vessel you can go into, and that is
    // `ExitableVessel`. What the mixin bought every other vessel was a
    // temperature, a pressure, a humidity, a wind and a biome — thirty-
    // seven rows over fifteen composers, none authoring one field of it.
    const ship = makeStuff(() => new TestVessel());
    expect(MixinApi.hasMixin(ship, Mixins.Atmospheric)).toBe(false);
  });

  it('eleven persistent fields are declared', () => {
    const fields = MixinApi.getAllPersistentFields(TestLocation as never);
    const expected = [
      '_biomePath',
      '_temperature',
      '_pressure',
      '_humidity',
      '_gravity',
      '_atmosphere',
      '_detailTemperatures',
      '_detailPressures',
      '_detailHumidities',
      '_detailGravities',
      '_detailAtmospheres',
    ];
    for (const f of expected) {
      expect(fields).toContain(f);
    }
  });

  it('isAtmospheric narrows correctly', () => {
    const room = makeStuff(() => new TestLocation());
    if (MixinApi.isAtmospheric(room)) {
      expect(typeof room.getBiome).toBe('function');
    } else {
      throw new Error('expected isAtmospheric to narrow');
    }
  });
});

describe('AtmosphericMixin — setters', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('setTemperature stores at bulk scope', () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(295, 'K'));
    expect(room._temperature?.rawValue()).toBe(295);
  });

  it('setTemperature(null) clears bulk scope', () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(295, 'K'));
    room.setTemperature(null);
    expect(room._temperature).toBeNull();
  });

  it('setTemperature with detailKey writes the detail map', () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    expect(room._detailTemperatures['hearth']?.rawValue()).toBe(800);
  });

  it('setTemperature(null, detailKey) deletes the detail entry', () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    room.setTemperature(null, 'hearth');
    expect(room._detailTemperatures['hearth']).toBeUndefined();
  });

  it('setTemperature throws on wrong-unit Quantity', () => {
    const room = makeStuff(() => new TestLocation());
    expect(() =>
      room.setTemperature(
        Quantity.of(295, 'Pa') as unknown as Quantity<'K'>,
      ),
    ).toThrow(TypeError);
  });

  it('setPressure / setHumidity / setGravity strict-on-unit', () => {
    const room = makeStuff(() => new TestLocation());
    expect(() =>
      room.setPressure(Quantity.of(50, 'K') as unknown as Quantity<'Pa'>),
    ).toThrow(TypeError);
    expect(() =>
      room.setHumidity(Quantity.of(50, 'K') as unknown as Quantity<'%'>),
    ).toThrow(TypeError);
    expect(() =>
      room.setGravity(
        Quantity.of(9.81, 'K') as unknown as Quantity<'m/s²'>,
      ),
    ).toThrow(TypeError);
  });

  it('⭐ setAtmosphere REFUSES a tag the medium physics does not know', () => {
    const room = makeStuff(() => new TestLocation());
    // It used to take anything. The four per-tag tables that answer
    // density, conductivity, breathability and contaminant all THROW on
    // an unknown tag, so `atmosphere: mythium` installed fine and then
    // took the thermal read down at the first person to walk in. The row
    // fails its own hydration now, and the pack install names it.
    expect(() => room.setAtmosphere('mythium')).toThrow(TypeError);
    expect(room._atmosphere).toBeNull();
    // ⭐ And the shipped tags all still pass — including the ones a trade
    // writes (the mine's damps, a ferment's CO₂).
    for (const tag of ['air', 'water', 'vacuum', 'smoke', 'blackdamp', 'stinkdamp', 'carbon-dioxide']) {
      expect(() => room.setAtmosphere(tag)).not.toThrow();
    }
    room.setAtmosphere(null);
    expect(room._atmosphere).toBeNull();
  });
});

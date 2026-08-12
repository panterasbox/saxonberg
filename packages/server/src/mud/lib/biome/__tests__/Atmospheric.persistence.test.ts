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

  it('Vessel composes AtmosphericMixin', () => {
    const ship = makeStuff(() => new TestVessel());
    expect(MixinApi.hasMixin(ship, Mixins.Atmospheric)).toBe(true);
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

  it('setAtmosphere accepts arbitrary strings silently', () => {
    const room = makeStuff(() => new TestLocation());
    room.setAtmosphere('mythium');
    expect(room._atmosphere).toBe('mythium');
  });
});

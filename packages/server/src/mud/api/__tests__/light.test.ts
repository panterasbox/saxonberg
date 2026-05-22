import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LightApi, MAX_HOPS, EXIT_TAU } from '../light';
import { Light } from '../../lib/perception/Light';
import { CartesianLocation } from '../../lib/spatial/CartesianLocation';
import { CartesianZone } from '../../lib/spatial/CartesianZone';
import { SphericalLocation } from '../../lib/spatial/SphericalLocation';
import { SphericalZone } from '../../lib/spatial/SphericalZone';
import { Door } from '../../lib/boundary/Door';
import { AmbientLitMixin } from '../../lib/perception/AmbientLit';
import { StuffApi } from '../stuff';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}
class AmbientSphericalLocation extends AmbientLitMixin(SphericalLocation) {}

describe('LightApi.lightAt — propagation core', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('empty room with no ambient reads ZERO', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    expect(LightApi.lightAt(loc)).toBe(Light.ZERO);
    expect(LightApi.bandAt(loc)).toBe('pitch-black');
  });

  it('room with setAmbientFlux + setAmbientColorTemperature reflects the band and color', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    loc.setAmbientFlux(40);
    loc.setAmbientColorTemperature('warm');

    const total = LightApi.lightAt(loc);
    expect(total.intensity.rawValue()).toBe(40);
    expect(total.colorTemperature!.rawValue()).toBe(2700);
    expect(LightApi.bandAt(loc)).toBe('lit');
  });

  it('exits leak ambient light from neighbors', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    b.setAmbientFlux(60);

    const totalA = LightApi.lightAt(a);
    expect(totalA.intensity.rawValue()).toBe(60 * EXIT_TAU);
  });

  it('a closed door on an exit blocks light leakage', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    b.setAmbientFlux(60);

    const door = makeStuff(() => new Door());
    door.setShortDescription('oak door');
    door.setOpen(false);
    await a.addBidirectionalExit(b, 'north', { door });

    expect(LightApi.lightAt(a)).toBe(Light.ZERO);
    door.open();
    const totalA = LightApi.lightAt(a);
    expect(totalA.intensity.rawValue()).toBe(60);
  });

  it('MAX_HOPS truncates propagation past depth 2', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new CartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    const c = makeStuff(() => new CartesianLocation());
    const d = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    zone.addLocation(c, 0, 2, 0);
    zone.addLocation(d, 0, 3, 0);
    d.setAmbientFlux(100);

    expect(MAX_HOPS).toBe(2);
    expect(LightApi.lightAt(a)).toBe(Light.ZERO);
  });

  it('cycle: visited Set prevents infinite recursion', () => {
    const zone = makeStuff(() => new CartesianZone());
    const a = makeStuff(() => new AmbientCartesianLocation());
    const b = makeStuff(() => new CartesianLocation());
    zone.addLocation(a, 0, 0, 0);
    zone.addLocation(b, 0, 1, 0);
    a.setAmbientFlux(10);

    const total = LightApi.lightAt(a);
    expect(total.intensity.rawValue()).toBeGreaterThanOrEqual(10);
  });

  it('CartesianLocation.getSizeScale uses zone.cellSize', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    zone.setCellSize(2.0);
    loc.setAmbientFlux(40);

    zone.setCellSize(8.0);
    // flux 40 / sizeScale 8 → 5 lux → 'dim'.
    expect(LightApi.bandAt(loc)).toBe('dim');
  });

  it('SphericalLocation.getSizeScale uses radius', () => {
    const zone = makeStuff(() => new SphericalZone());
    const loc = makeStuff(() => new AmbientSphericalLocation());
    zone.addLocation(loc);
    loc.setRadius(8.0);
    loc.setAmbientFlux(40);

    expect(LightApi.bandAt(loc)).toBe('dim'); // 40/8 = 5
    loc.setRadius(2.0);
    expect(LightApi.bandAt(loc)).toBe('lit'); // 40/2 = 20
  });

  it('shadowsAt maps each band to a shadow tier', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    expect(LightApi.shadowsAt(loc)).toBe('absolute');
    loc.setAmbientFlux(2);
    expect(LightApi.shadowsAt(loc)).toBe('deep');
    loc.setAmbientFlux(10);
    expect(LightApi.shadowsAt(loc)).toBe('partial');
    loc.setAmbientFlux(40);
    expect(LightApi.shadowsAt(loc)).toBe('faint');
    loc.setAmbientFlux(100);
    expect(LightApi.shadowsAt(loc)).toBe('none');
  });
});

describe('LightApi — band / tag / mixing acceptance', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lightAt(loc).intensity.tag() matches bandAt(loc) across bands', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    const samples = [
      { flux: 0, expected: 'pitch-black' },
      { flux: 2, expected: 'very-dim' },
      { flux: 10, expected: 'dim' },
      { flux: 40, expected: 'lit' },
      { flux: 100, expected: 'bright' },
      { flux: 500, expected: 'blinding' },
    ];
    for (const { flux, expected } of samples) {
      loc.setAmbientFlux(flux);
      expect(LightApi.bandAt(loc)).toBe(expected);
      expect(LightApi.lightAt(loc).intensity.tag()).toBe(expected);
    }
  });

  it('flux/sizeScale → lux scales linearly', () => {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    zone.setCellSize(1);
    loc.setAmbientFlux(100);
    expect(LightApi.lightAt(loc).intensity.rawValue()).toBe(100);

    loc.setAmbientFlux(200);
    expect(LightApi.lightAt(loc).intensity.rawValue()).toBe(200);

    zone.setCellSize(2);
    loc.setAmbientFlux(100);
    expect(LightApi.lightAt(loc).intensity.rawValue()).toBe(50);
  });

  it('flux-weighted color mixing across two equal-flux sources', async () => {
    const { LightSourceMixin } = await import('../../lib/perception/LightSource');
    const { Thing } = await import('../../lib/stuff/Thing');
    const { ContainmentApi } = await import('../containment');
    class Lamp extends LightSourceMixin(Thing) {}

    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new AmbientCartesianLocation());
    zone.addLocation(loc, 0, 0, 0);

    // Ambient warm at 2700K, 50 lumens.
    loc.setAmbientFlux(50);
    loc.setAmbientColorTemperature('warm');

    // Lamp emits 50 lumens at cool=5000K.
    const lamp = makeStuff(() => new Lamp());
    lamp.setEmittedFlux(50);
    lamp.setEmittedColorTemperature('cool');
    ContainmentApi.move(lamp, loc);

    const total = LightApi.lightAt(loc);
    expect(total.intensity.rawValue()).toBe(100);
    // Flux-weighted average: (2700*50 + 5000*50) / 100 = 3850 K.
    expect(total.colorTemperature!.rawValue()).toBeCloseTo(3850, 5);
  });

  it('color tag round-trip via Quantity.fromTag', async () => {
    const { Quantity } = await import('../../lib/quantity');
    const tags = ['warm', 'neutral', 'cool', 'daylight', 'blue'];
    for (const tag of tags) {
      const q = Quantity.fromTag(tag, 'K');
      expect(q.tag()).toBe(tag);
    }
  });
});

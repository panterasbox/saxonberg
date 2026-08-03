import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LightSourceMixin } from '../LightSource';
import Thing from '../../stuff/Thing';
import CartesianLocation from '../../location/CartesianLocation';
import CartesianZone from '../../../obj/location/CartesianZone';
import { ContainmentApi } from '../../../api/containment';
import { VisionModality } from '../../../obj/modalities/VisionModality';
import { buildAllModalities } from '../modalities/__tests__/test-helpers';
import { AmbientLitMixin } from '../AmbientLit';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { ProxyApi } from '../../../api/proxy';
import PersistentHydrator from '../../../obj/persistence/PersistentHydrator';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityTagTables } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class Candle extends LightSourceMixin(Thing) {}
class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}

describe('LightSourceMixin', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('defaults to zero flux + null color and is detected by MixinApi', () => {
    const c = makeStuff(() => new Candle());
    expect(c.getEmittedFlux().rawValue()).toBe(0);
    expect(c.getEmittedColorTemperature()).toBeNull();
    expect(MixinApi.isLightSource(c)).toBe(true);
    expect(MixinApi.hasMixin(Candle, Mixins.LightSource)).toBe(true);
  });

  it('setEmittedFlux + setEmittedColorTemperature store the canonical values', () => {
    const c = makeStuff(() => new Candle());
    c.setEmittedFlux(Quantity.of(15, 'lumen'));
    c.setEmittedColorTemperature('warm');
    expect(c.getEmittedFlux().rawValue()).toBe(15);
    expect(c.getEmittedColorTemperature()!.rawValue()).toBe(2700);
  });

  it('setEmittedFlux accepts numeric (lumen-canonical)', () => {
    const c = makeStuff(() => new Candle());
    c.setEmittedFlux(50);
    expect(c.getEmittedFlux().rawValue()).toBe(50);
  });

  it('setEmittedFlux rejects negative values', () => {
    const c = makeStuff(() => new Candle());
    expect(() => c.setEmittedFlux(-1)).toThrow();
  });

  it('PersistentHydrator round-trips emittedIntensity + emittedColorTemperature', async () => {
    const c = makeStuff(() => new Candle());
    await makeStuff(() => new PersistentHydrator()).hydrate(c, {
      emittedIntensity: 30,
      emittedColorTemperature: 'warm',
    });
    expect(c.getEmittedFlux().rawValue()).toBe(30);
    expect(c.getEmittedColorTemperature()!.rawValue()).toBe(2700);
    const raw = ProxyApi.unwrap(c) as unknown as {
      emittedIntensity: number;
      emittedColorTemperature: number | null;
    };
    expect(raw.emittedIntensity).toBe(30);
    // Color storage is canonical Kelvin numeric.
    expect(raw.emittedColorTemperature).toBe(2700);
  });

  it('fires onLightSourceChanged on the immediate environment when flux changes', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const candle = makeStuff(() => new Candle());
    const hook = vi.fn();
    (room as unknown as { onLightSourceChanged: typeof hook }).onLightSourceChanged = hook;
    ContainmentApi.move(candle, room);

    candle.setEmittedFlux(10);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(hook.mock.calls[0]![0]).toBe(candle);
    expect((hook.mock.calls[0]![1] as Quantity<'lumen'>).rawValue()).toBe(0);
    expect((hook.mock.calls[0]![2] as Quantity<'lumen'>).rawValue()).toBe(10);
  });

  it('does not fire when flux is unchanged', () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const candle = makeStuff(() => new Candle());
    const hook = vi.fn();
    (room as unknown as { onLightSourceChanged: typeof hook }).onLightSourceChanged = hook;
    ContainmentApi.move(candle, room);

    candle.setEmittedFlux(10);
    expect(hook).toHaveBeenCalledTimes(1);
    candle.setEmittedFlux(10);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  describe('integration with VisionModality.lightAt', () => {
    it('a candle in a room contributes lux to the room', () => {
      const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
      const room = makeStuff(() => new CartesianLocation());
      zone.addLocation(room, 0, 0, 0);
      const candle = makeStuff(() => new Candle());
      candle.setEmittedFlux(10);
      candle.setEmittedColorTemperature('warm');
      ContainmentApi.move(candle, room);

      const total = VisionModality.lightAt(room);
      // Default sizeScale = 1 m² → 10 lumens / 1 m² = 10 lux.
      expect(total.intensity.rawValue()).toBe(10);
      expect(total.colorTemperature!.rawValue()).toBe(2700);
    });

    it('moving a LightSource between rooms updates each room lazily', () => {
      const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
      const a = makeStuff(() => new CartesianLocation());
      const b = makeStuff(() => new CartesianLocation());
      zone.addLocation(a, 0, 0, 0);
      zone.addLocation(b, 0, 5, 0);
      const candle = makeStuff(() => new Candle());
      candle.setEmittedFlux(10);

      ContainmentApi.move(candle, a);
      expect(VisionModality.lightAt(a).intensity.rawValue()).toBeGreaterThanOrEqual(10);
      expect(VisionModality.lightAt(b).intensity.rawValue()).toBe(0);

      ContainmentApi.move(candle, b);
      expect(VisionModality.lightAt(b).intensity.rawValue()).toBeGreaterThanOrEqual(10);
      expect(VisionModality.lightAt(a).intensity.rawValue()).toBe(0);
    });

    it('setEmittedFlux(0) zeroes the contribution', () => {
      const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
      const room = makeStuff(() => new AmbientCartesianLocation());
      zone.addLocation(room, 0, 0, 0);
      room.setAmbientFlux(5);
      const candle = makeStuff(() => new Candle());
      candle.setEmittedFlux(20);
      ContainmentApi.move(candle, room);

      expect(VisionModality.lightAt(room).intensity.rawValue()).toBe(25);
      candle.setEmittedFlux(0);
      expect(VisionModality.lightAt(room).intensity.rawValue()).toBe(5);
    });
  });
});

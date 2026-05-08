import { describe, it, expect, afterEach, vi } from 'vitest';
import { Light } from '../Light';
import { LightSourceMixin } from '../LightSource';
import { Thing } from '../../stuff/Thing';
import { CartesianLocation } from '../../spatial/CartesianLocation';
import { CartesianZone } from '../../spatial/CartesianZone';
import { ContainmentApi } from '../../../api/containment';
import { LightApi } from '../../../api/light';
import { AmbientLitMixin } from '../AmbientLit';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { ProxyApi } from '../../../api/proxy';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Candle extends LightSourceMixin(Thing) {}
class AmbientCartesianLocation extends AmbientLitMixin(CartesianLocation) {}

describe('LightSourceMixin', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('defaults to Light.ZERO and is detected by MixinApi', () => {
    const c = makeStuff(() => new Candle());
    expect(c.getEmittedLight()).toBe(Light.ZERO);
    expect(MixinApi.isLightSource(c)).toBe(true);
    expect(MixinApi.hasMixin(Candle, Mixins.LightSource)).toBe(true);
  });

  it('setEmittedLight stores a Light instance', () => {
    const c = makeStuff(() => new Candle());
    const l = Light.of(15, 'warm');
    c.setEmittedLight(l);
    expect(c.getEmittedLight()).toBe(l);
  });

  it('setEmittedLight coerces a LightDataShape via the setter', () => {
    const c = makeStuff(() => new Candle());
    c.setEmittedLight({ intensity: 25, color: 'warm' });
    const stored = c.getEmittedLight();
    expect(stored).toBeInstanceOf(Light);
    expect(stored.intensity).toBe(25);
  });

  it('PersistentHydrator round-trip via the setter', async () => {
    const c = makeStuff(() => new Candle());
    await makeStuff(() => new PersistentHydrator()).hydrate(c, {
      emittedLight: { intensity: 30, color: 'warm' },
    });
    expect(c.getEmittedLight()).toBeInstanceOf(Light);
    expect(c.getEmittedLight().intensity).toBe(30);
    const raw = ProxyApi.unwrap(c) as unknown as { emittedLight: Light };
    expect(raw.emittedLight).toBeInstanceOf(Light);
  });

  it('fires onLightSourceChanged on the immediate environment when emission changes', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const candle = makeStuff(() => new Candle());

    // Witness hook on the room.
    const hook = vi.fn();
    (room as unknown as { onLightSourceChanged: typeof hook }).onLightSourceChanged = hook;

    ContainmentApi.move(candle, room);

    candle.setEmittedLight(Light.of(10));
    expect(hook).toHaveBeenCalledTimes(1);
    expect(hook.mock.calls[0]![0]).toBe(candle);
    expect(hook.mock.calls[0]![1]).toBe(Light.ZERO);
    expect(hook.mock.calls[0]![2].intensity).toBe(10);
  });

  it('does not fire when the new value is the same Light instance', () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const candle = makeStuff(() => new Candle());
    const hook = vi.fn();
    (room as unknown as { onLightSourceChanged: typeof hook }).onLightSourceChanged = hook;
    ContainmentApi.move(candle, room);

    const l = Light.of(10);
    candle.setEmittedLight(l);
    candle.setEmittedLight(l);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  describe('integration with LightApi.lightAt', () => {
    it('a candle in a room contributes to the room band', () => {
      const zone = makeStuff(() => new CartesianZone());
      const room = makeStuff(() => new CartesianLocation());
      zone.addLocation(room, 0, 0, 0);
      const candle = makeStuff(() => new Candle());
      candle.setEmittedLight(Light.of(10, 'warm'));
      ContainmentApi.move(candle, room);

      const total = LightApi.lightAt(room);
      expect(total.intensity).toBe(10);
      expect(total.color).toBe('warm');
    });

    it('moving a LightSource between rooms updates each room lazily', () => {
      const zone = makeStuff(() => new CartesianZone());
      const a = makeStuff(() => new CartesianLocation());
      const b = makeStuff(() => new CartesianLocation());
      zone.addLocation(a, 0, 0, 0);
      zone.addLocation(b, 0, 5, 0); // far enough to not be cardinal-adjacent
      const candle = makeStuff(() => new Candle());
      candle.setEmittedLight(Light.of(10));

      ContainmentApi.move(candle, a);
      expect(LightApi.lightAt(a).intensity).toBeGreaterThanOrEqual(10);
      expect(LightApi.lightAt(b).intensity).toBe(0);

      ContainmentApi.move(candle, b);
      expect(LightApi.lightAt(b).intensity).toBeGreaterThanOrEqual(10);
      // a's contribution from candle is gone — only ambient (none) remains.
      expect(LightApi.lightAt(a).intensity).toBe(0);
    });

    it('setEmittedLight(Light.ZERO) zeroes the contribution', () => {
      const zone = makeStuff(() => new CartesianZone());
      const room = makeStuff(() => new AmbientCartesianLocation());
      zone.addLocation(room, 0, 0, 0);
      room.setAmbientLight(Light.of(5));
      const candle = makeStuff(() => new Candle());
      candle.setEmittedLight(Light.of(20));
      ContainmentApi.move(candle, room);

      expect(LightApi.lightAt(room).intensity).toBe(25);
      candle.setEmittedLight(Light.ZERO);
      expect(LightApi.lightAt(room).intensity).toBe(5);
    });
  });
});

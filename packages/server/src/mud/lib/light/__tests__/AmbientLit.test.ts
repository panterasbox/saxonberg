import { describe, it, expect } from 'vitest';
import { Light } from '../Light';
import { AmbientLitMixin } from '../AmbientLit';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { ProxyApi } from '../../../api/proxy';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { Mixins } from '../../mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestAmbient extends AmbientLitMixin(Idea) {}

describe('AmbientLitMixin', () => {
  it('defaults to Light.ZERO', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(t.getAmbientLight()).toBe(Light.ZERO);
  });

  it('setAmbientLight accepts a Light instance', () => {
    const t = makeStuff(() => new TestAmbient());
    const l = Light.of(10, 'warm');
    t.setAmbientLight(l);
    expect(t.getAmbientLight()).toBe(l);
  });

  it('setAmbientLight coerces a data-shape value into a Light', () => {
    const t = makeStuff(() => new TestAmbient());
    t.setAmbientLight({ intensity: 30, color: 'warm' });
    const stored = t.getAmbientLight();
    expect(stored).toBeInstanceOf(Light);
    expect(stored.intensity).toBe(30);
    expect(stored.color).toBe('warm');
  });

  it('MixinApi.isAmbientLit narrows correctly', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(MixinApi.isAmbientLit(t)).toBe(true);
    expect(MixinApi.hasMixin(TestAmbient, Mixins.AmbientLit)).toBe(true);
  });

  describe('persistence round-trip', () => {
    it('hydrates ambientLight via bracket-assign and the setter', async () => {
      const t = makeStuff(() => new TestAmbient());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        ambientLight: { intensity: 40, color: 'warm' },
      });
      const stored = t.getAmbientLight();
      expect(stored).toBeInstanceOf(Light);
      expect(stored.intensity).toBe(40);
      expect(stored.color).toBe('warm');
    });

    it('toDocument-shape bracket-read returns the Light value', async () => {
      const t = makeStuff(() => new TestAmbient());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        ambientLight: { intensity: 40, color: 'warm' },
      });
      const raw = ProxyApi.unwrap(t) as unknown as { ambientLight: Light };
      expect(raw.ambientLight).toBeInstanceOf(Light);
      expect(raw.ambientLight.intensity).toBe(40);
    });

    it('hydrating a malformed shape throws TypeError via the setter', async () => {
      const t = makeStuff(() => new TestAmbient());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(t, {
          ambientLight: { intensity: 'lots' } as unknown as object,
        })
      ).rejects.toThrow(TypeError);
    });
  });
});

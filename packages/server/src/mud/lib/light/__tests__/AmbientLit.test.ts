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
    const stored = t.getAmbientLight();
    expect(stored).toBeInstanceOf(Light);
    expect(stored.intensity).toBe(10);
    expect(stored.color).toBe('warm');
  });

  it('setAmbientLight rejects non-Light values with TypeError', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(() =>
      t.setAmbientLight({ intensity: 30, color: 'warm' } as unknown as Light)
    ).toThrow(TypeError);
  });

  it('MixinApi.isAmbientLit narrows correctly', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(MixinApi.isAmbientLit(t)).toBe(true);
    expect(MixinApi.hasMixin(TestAmbient, Mixins.AmbientLit)).toBe(true);
  });

  describe('persistence round-trip — scalar fields', () => {
    it('hydrates ambientIntensity + ambientColor as scalars', async () => {
      const t = makeStuff(() => new TestAmbient());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        ambientIntensity: 40,
        ambientColor: 'warm',
      });
      const stored = t.getAmbientLight();
      expect(stored).toBeInstanceOf(Light);
      expect(stored.intensity).toBe(40);
      expect(stored.color).toBe('warm');
    });

    it('toDocument-shape bracket-read returns the stored scalars', async () => {
      const t = makeStuff(() => new TestAmbient());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        ambientIntensity: 40,
        ambientColor: 'warm',
      });
      const raw = ProxyApi.unwrap(t) as unknown as {
        ambientIntensity: number;
        ambientColor: string | null;
      };
      expect(raw.ambientIntensity).toBe(40);
      expect(raw.ambientColor).toBe('warm');
    });

    it('round-trips through the runtime API', () => {
      const t = makeStuff(() => new TestAmbient());
      t.setAmbientLight(Light.of(25, 'cool'));
      const stored = t.getAmbientLight();
      expect(stored.intensity).toBe(25);
      expect(stored.color).toBe('cool');
    });

    it('default scalars round-trip back to Light.ZERO', () => {
      const t = makeStuff(() => new TestAmbient());
      // No setter call — defaults should produce Light.ZERO from getter.
      expect(t.getAmbientLight()).toBe(Light.ZERO);
    });

    it('hydrating a malformed intensity throws TypeError via the setter', async () => {
      const t = makeStuff(() => new TestAmbient());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(t, {
          ambientIntensity: 'lots' as unknown as number,
        })
      ).rejects.toThrow(TypeError);
    });

    it('hydrating a malformed color throws TypeError via the setter', async () => {
      const t = makeStuff(() => new TestAmbient());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(t, {
          ambientColor: 42 as unknown as string,
        })
      ).rejects.toThrow(TypeError);
    });

    it('hydrating a negative intensity throws TypeError via the setter', async () => {
      const t = makeStuff(() => new TestAmbient());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(t, {
          ambientIntensity: -1,
        })
      ).rejects.toThrow(TypeError);
    });
  });
});

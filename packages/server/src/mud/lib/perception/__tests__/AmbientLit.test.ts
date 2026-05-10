import { describe, it, expect } from 'vitest';
import { AmbientLitMixin } from '../AmbientLit';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { ProxyApi } from '../../../api/proxy';
import { PersistentHydrator } from '../../persistence/PersistentHydrator';
import { Mixins } from '../../mixin';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
// Trigger LightApi tag-table registrations (KELVIN_TAGS, LUMEN_TAGS,
// LUX_BAND_THRESHOLDS) so 'warm' / 'cool' string color tags resolve.
import '../../../api/light';

class TestAmbient extends AmbientLitMixin(Idea) {}

describe('AmbientLitMixin', () => {
  it('defaults to zero flux and null color', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(t.getAmbientFlux().rawValue()).toBe(0);
    expect(t.getAmbientColor()).toBeNull();
  });

  it('setAmbientFlux accepts a Quantity<lumen>', () => {
    const t = makeStuff(() => new TestAmbient());
    t.setAmbientFlux(Quantity.of(10, 'lumen'));
    expect(t.getAmbientFlux().rawValue()).toBe(10);
  });

  it('setAmbientFlux accepts a numeric (lumen-canonical)', () => {
    const t = makeStuff(() => new TestAmbient());
    t.setAmbientFlux(15);
    expect(t.getAmbientFlux().rawValue()).toBe(15);
  });

  it('setAmbientColor accepts a tag string and resolves to Quantity<K>', () => {
    const t = makeStuff(() => new TestAmbient());
    t.setAmbientColor('warm');
    const c = t.getAmbientColor();
    expect(c).not.toBeNull();
    expect(c!.unit).toBe('K');
    expect(c!.rawValue()).toBe(2700);
  });

  it('setAmbientFlux rejects non-finite values', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(() => t.setAmbientFlux(Number.NaN)).toThrow();
  });

  it('MixinApi.isAmbientLit narrows correctly', () => {
    const t = makeStuff(() => new TestAmbient());
    expect(MixinApi.isAmbientLit(t)).toBe(true);
    expect(MixinApi.hasMixin(TestAmbient, Mixins.AmbientLit)).toBe(true);
  });

  describe('persistence round-trip — scalar fields', () => {
    it('hydrates ambientIntensity + ambientColor as scalars (string color resolves via tag)', async () => {
      const t = makeStuff(() => new TestAmbient());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        ambientIntensity: 40,
        ambientColor: 'warm',
      });
      expect(t.getAmbientFlux().rawValue()).toBe(40);
      const c = t.getAmbientColor();
      expect(c).not.toBeNull();
      expect(c!.rawValue()).toBe(2700);
    });

    it('toDocument-shape bracket-read returns the stored scalars', async () => {
      const t = makeStuff(() => new TestAmbient());
      await makeStuff(() => new PersistentHydrator()).hydrate(t, {
        ambientIntensity: 40,
        ambientColor: 'warm',
      });
      const raw = ProxyApi.unwrap(t) as unknown as {
        ambientIntensity: number;
        ambientColor: number | null;
      };
      expect(raw.ambientIntensity).toBe(40);
      // Color storage is canonical Kelvin numeric.
      expect(raw.ambientColor).toBe(2700);
    });

    it('round-trips through the runtime API', () => {
      const t = makeStuff(() => new TestAmbient());
      t.setAmbientFlux(25);
      t.setAmbientColor('cool');
      expect(t.getAmbientFlux().rawValue()).toBe(25);
      expect(t.getAmbientColor()!.rawValue()).toBe(5000);
    });

    it('default scalars round-trip back to zero', () => {
      const t = makeStuff(() => new TestAmbient());
      expect(t.getAmbientFlux().rawValue()).toBe(0);
      expect(t.getAmbientColor()).toBeNull();
    });

    it('hydrating a malformed intensity throws TypeError via the setter', async () => {
      const t = makeStuff(() => new TestAmbient());
      await expect(
        makeStuff(() => new PersistentHydrator()).hydrate(t, {
          ambientIntensity: 'lots' as unknown as number,
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

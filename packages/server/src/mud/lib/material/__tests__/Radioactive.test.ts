import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RadioactiveMaterial } from '../RadioactiveMaterial';
import { Material } from '../Material';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

function withTemplatePath<T extends { templatePath: string | null }>(
  obj: T,
  path: string
): T {
  obj.templatePath = path;
  StuffApi.unregister(obj as never);
  StuffApi.register(obj as never);
  return obj;
}

describe('RadioactiveMixin / RadioactiveMaterial', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('extends Material — both class identities flow', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    expect(u).toBeInstanceOf(Material);
    expect(u).toBeInstanceOf(RadioactiveMaterial);
  });

  it('is detected by MixinApi.isRadioactive', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    expect(MixinApi.isRadioactive(u)).toBe(true);
    expect(MixinApi.hasMixin(u, Mixins.Radioactive)).toBe(true);
  });

  it('plain Material is NOT detected as radioactive', () => {
    const m = makeStuff(() => new Material());
    expect(MixinApi.isRadioactive(m)).toBe(false);
  });

  it('round-trips halfLife and decayMode', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    u.setHalfLife(4.468e9);
    u.setDecayMode('alpha');
    expect(u.getHalfLife()).toBe(4.468e9);
    expect(u.getDecayMode()).toBe('alpha');
  });

  it('decayProduct cross-reference resolves lazily', () => {
    const thorium = withTemplatePath(
      makeStuff(() => new RadioactiveMaterial()),
      '/lib/material/element/thorium'
    );
    thorium.setName('thorium');

    const uranium = makeStuff(() => new RadioactiveMaterial());
    uranium.setHalfLife(4.468e9);
    uranium.setDecayMode('alpha');
    uranium.setDecayProduct(thorium);

    expect(uranium._decayProductPath).toBe('/lib/material/element/thorium');
    expect(uranium.getDecayProduct()).toBe(thorium);
  });

  it('getDecayProduct returns null when path is unset', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    expect(u.getDecayProduct()).toBeNull();
  });

  it('setDecayProduct(null) clears the path', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    const product = withTemplatePath(
      makeStuff(() => new RadioactiveMaterial()),
      '/lib/material/element/thorium'
    );
    u.setDecayProduct(product);
    u.setDecayProduct(null);
    expect(u._decayProductPath).toBeNull();
    expect(u.getDecayProduct()).toBeNull();
  });

  it('inherits the full Material surface (tags, composition, chemistry)', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    u.setName('uranium');
    u.setDensity(19050);
    u.setTags(['element', 'metal', 'actinide', 'radioactive']);
    u.setChemistry({ symbol: 'U', atomicNumber: 92, molarMass: 238.029 });

    expect(u.getName()).toBe('uranium');
    expect(u.getDensity().rawValue()).toBe(19050);
    expect(u.hasTag('radioactive')).toBe(true);
    expect(u.getChemistry()?.symbol).toBe('U');
  });
});

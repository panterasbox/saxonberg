import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RadioactiveMaterial } from '../../../obj/material/RadioactiveMaterial';
import Material from '../Material';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
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
      '/obj/material/element/thorium'
    );
    thorium.setName('thorium');

    const uranium = makeStuff(() => new RadioactiveMaterial());
    uranium.setHalfLife(4.468e9);
    uranium.setDecayMode('alpha');
    uranium.setDecayProduct(thorium);

    expect(uranium._decayProductPath).toBe('/obj/material/element/thorium');
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
      '/obj/material/element/thorium'
    );
    u.setDecayProduct(product);
    u.setDecayProduct(null);
    expect(u._decayProductPath).toBeNull();
    expect(u.getDecayProduct()).toBeNull();
  });

  it('inherits the full Material surface (tags, composition, chemistry)', () => {
    const u = makeStuff(() => new RadioactiveMaterial());
    u.setName('uranium');
    u.setDensity(Quantity.of(19050, 'kg/m³'));
    u.setTags(['element', 'metal', 'actinide', 'radioactive']);
    u.setChemistry({
      symbol: 'U',
      atomicNumber: 92,
      molarMass: Quantity.of(238.029, 'g/mol'),
    });

    expect(u.getName()).toBe('uranium');
    expect(u.getDensity().rawValue()).toBe(19050);
    expect(u.hasTag('radioactive')).toBe(true);
    expect(u.getChemistry()?.symbol).toBe('U');
  });
});

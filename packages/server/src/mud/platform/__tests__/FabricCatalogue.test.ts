/**
 * FabricCatalogue — the self-warming roster behind `Construction`'s
 * second covering source.
 *
 * ⚠⚠ The wiring assertion here is not ceremony. The
 * reference-Ideas-inert-at-boot rule has bitten three times, and here
 * the failure is worse than silent: a garment row authoring
 * `constructionForm: woven` **throws at hydration** when the roster is
 * cold, because `Constructed.setConstructionForm` validates against the
 * vocabulary. So the eager-boot line is part of the contract.
 */

import '../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import FabricCatalogue from '../idea/FabricCatalogue';
import Fabric from '../idea/material/Fabric';
import Material from '../../lib/material/Material';
import { Construction } from '../../lib/material/Construction';
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

afterEach(() => {
  vi.restoreAllMocks();
  Construction.clearFabrics();
  StuffApi.clearAll();
});

function row(key: string, layerBand: number): Fabric {
  return makeStuff(() => {
    const f = new Fabric();
    f.setKey(key);
    f.setLayerBand(layerBand);
    f.setLoft(0.2);
    f.setWeaveDensity(0.5);
    f.setDrape(0.5);
    return f;
  });
}

describe('the fabric roster warm', () => {
  it('stands up Fabric rows, skips foreign classes, and registers the forms', async () => {
    vi.spyOn(Template, 'findByPathInfix').mockResolvedValue([
      { path: '/stuff/idea/fabric/woven', class: '/platform/idea/material/Fabric' },
      { path: '/stuff/idea/fabric/not-a-fabric', class: '/platform/idea/material/ConsumableMaterial' },
    ] as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async (p: string) =>
        p === '/platform/idea/material/Fabric'
          ? (Fabric as never)
          : (Material as never),
    );
    const stood: string[] = [];
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      stood.push(p);
      return row('woven', 0) as never;
    });

    const catalogue = makeStuff(() => new FabricCatalogue());
    await catalogue.postRegister();

    expect(stood).toEqual(['/stuff/idea/fabric/woven']);
    expect(Template.findByPathInfix).toHaveBeenCalledWith('/idea/fabric/');
    // ⭐ The point of the warm: the form is now in the vocabulary, so a
    // garment can be hydrated with it.
    expect(Construction.isForm('woven')).toBe(true);
    expect(Construction.of('woven').getLayerDepth()).toBe(0);
  });

  it('a re-warm rebuilds the registry wholesale (a pack go-live)', async () => {
    Construction.registerFabric({
      key: 'stale',
      layerBand: 0,
      loft: 0,
      weaveDensity: 0,
      drape: 0,
    });
    vi.spyOn(Template, 'findByPathInfix').mockResolvedValue([
      { path: '/stuff/idea/fabric/knit', class: '/platform/idea/material/Fabric' },
    ] as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(Fabric as never);
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(row('knit', 0) as never);

    const catalogue = makeStuff(() => new FabricCatalogue());
    await catalogue.warm();

    expect(Construction.fabricKeys()).toEqual(['knit']);
    expect(Construction.isForm('stale')).toBe(false);
  });

  it('⚠ the platform pack boots it eagerly (the wiring assert)', () => {
    const src = readFileSync(
      fileURLToPath(
        new URL('../../../../../content/platform/pack.yaml', import.meta.url),
      ),
      'utf-8',
    );
    expect(src).toMatch(/template: \/platform\/idea\/FabricCatalogue/);
  });

  it('the catalogue and its rows both veto eviction', () => {
    const catalogue = makeStuff(() => new FabricCatalogue());
    expect(catalogue.canEvict({} as never).ok).toBe(false);
    expect(row('woven', 0).canEvict({} as never).ok).toBe(false);
  });
});

describe('Fabric rows validate what the depth ladder depends on', () => {
  it('refuses a band outside the 0..4 covering ladder', () => {
    const f = makeStuff(() => new Fabric());
    expect(() => f.setLayerBand(5)).toThrow(RangeError);
    expect(() => f.setLayerBand(-1)).toThrow(RangeError);
    expect(() => f.setLayerBand(2.5)).toThrow(RangeError);
    f.setLayerBand(4);
    expect(f.getLayerBand()).toBe(4);
  });

  it('refuses a fraction outside 0..1 and a non-kebab key', () => {
    const f = makeStuff(() => new Fabric());
    expect(() => f.setLoft(1.2)).toThrow(RangeError);
    expect(() => f.setWeaveDensity(-0.1)).toThrow(RangeError);
    expect(() => f.setKey('Woven Cloth')).toThrow(RangeError);
  });
});

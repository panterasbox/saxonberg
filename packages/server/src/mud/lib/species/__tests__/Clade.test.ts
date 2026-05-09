import { describe, it, expect } from 'vitest';
import { Clade } from '../Clade';
import { Zone } from '../../spatial/Zone';
import { SpatialZone } from '../../spatial/SpatialZone';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('Clade', () => {
  it('extends bare Zone but NOT SpatialZone', () => {
    const clade = makeStuff(() => new Clade());
    expect(clade).toBeInstanceOf(Zone);
    expect(clade instanceof SpatialZone).toBe(false);
  });

  it('composes SingletonMixin', () => {
    const clade = makeStuff(() => new Clade());
    expect(MixinApi.hasMixin(clade, Mixins.Singleton)).toBe(true);
  });

  it('round-trips name + rank', () => {
    const clade = makeStuff(() => new Clade());
    clade.setName('Animalia');
    clade.setRank('kingdom');
    expect(clade.getName()).toBe('Animalia');
    expect(clade.getRank()).toBe('kingdom');
  });

  it('addSpecies / removeSpecies / getSpecies round-trips', async () => {
    const clade = makeStuff(() => new Clade());
    // Stand-in member: any Stuff with a getTemplatePath shape works
    // for the runtime-only Set; full Species lands in Item 4.
    const fake = await StuffApi.create(() => new Clade());
    clade.addSpecies(fake as unknown as never);
    expect(clade.getSpecies().has(fake as unknown as never)).toBe(true);
    expect(clade.removeSpecies(fake as unknown as never)).toBe(true);
    expect(clade.getSpecies().size).toBe(0);
  });

  it('canDestruct vetoes destruction when species are still attached', async () => {
    const clade = makeStuff(() => new Clade());
    const fake = await StuffApi.create(() => new Clade());
    clade.addSpecies(fake as unknown as never);
    expect(() => StuffApi.destruct(clade)).toThrow(/live species/i);
  });
});

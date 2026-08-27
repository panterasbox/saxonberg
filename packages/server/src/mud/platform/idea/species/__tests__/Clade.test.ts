import "../../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import Clade from '../Clade';
import { Zone } from '../../../../lib/zone/Zone';
import { SpatialZone } from '../../../../lib/zone/SpatialZone';
import { MixinApi } from '../../../../api/mixin';
import { Mixins } from '../../../../lib/mixin';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

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

  it('canDestruct vetoes destruction unconditionally (system singleton)', async () => {
    // Clades are bootstrap-pinned because `SpeciesApi.getKingdom` /
    // `isAnimate` resolve them sync via `findByTemplatePath`; a
    // mid-session destruct silently breaks every `requiresAnimate`-
    // gated verb. Veto fires whether or not species are attached.
    const empty = makeStuff(() => new Clade());
    expect(() => StuffApi.destruct(empty)).toThrow(/system singleton/i);

    const withMembers = makeStuff(() => new Clade());
    const fake = await StuffApi.create(() => new Clade());
    withMembers.addSpecies(fake as unknown as never);
    expect(() => StuffApi.destruct(withMembers)).toThrow(/system singleton/i);
  });
});

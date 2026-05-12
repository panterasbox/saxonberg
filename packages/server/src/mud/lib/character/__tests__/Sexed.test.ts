import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SexedMixin } from '../Sexed';
import { OrganismMixin } from '../../species/Organism';
import { Species } from '../../species/Species';
import { Thing } from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

const SexedOrganismThingBase = SexedMixin(OrganismMixin(Thing));
class SexedOrganismThing extends SexedOrganismThingBase {}

const SexedOnlyBase = SexedMixin(Thing);
class SexedOnlyThing extends SexedOnlyBase {}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function setupSpecies(
  system: string,
  path: string = '/lib/species/test'
): Species {
  const species = withTemplatePath(makeStuff(() => new Species()), path);
  species.setSexDeterminationSystem(system);
  return species;
}

describe('SexedMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('is detected by MixinApi.isSexed', () => {
    const obj = makeStuff(() => new SexedOrganismThing());
    expect(MixinApi.isSexed(obj)).toBe(true);
    expect(MixinApi.hasMixin(obj, Mixins.Sexed)).toBe(true);
  });

  it('reads valid sex set from species sex-determination system', () => {
    const sapiens = setupSpecies('xy');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(sapiens);
    expect(organism.getValidSexSet()).toEqual([
      'male',
      'female',
      'intersex',
    ]);
  });

  it('setSex accepts a value in the valid set', () => {
    const sapiens = setupSpecies('xy');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(sapiens);
    organism.setSex('female');
    expect(organism.getSex()).toBe('female');
  });

  it('setSex rejects a value outside the valid set', () => {
    const sapiens = setupSpecies('xy');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(sapiens);
    expect(() => organism.setSex('queen')).toThrow(/not in valid set/);
  });

  it('setSex(null) always succeeds (clears the value)', () => {
    const sapiens = setupSpecies('xy');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(sapiens);
    organism.setSex('male');
    organism.setSex(null);
    expect(organism.getSex()).toBeNull();
  });

  it('setSex rejects all values when species sex-determination system is "none"', () => {
    const robot = setupSpecies('none');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(robot);
    expect(() => organism.setSex('male')).toThrow(/rejects all sex values/);
  });

  it('hermaphroditic-simultaneous declares only "hermaphrodite"', () => {
    const snail = setupSpecies('hermaphroditic-simultaneous');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(snail);
    expect(organism.getValidSexSet()).toEqual(['hermaphrodite']);
    organism.setSex('hermaphrodite');
    expect(organism.getSex()).toBe('hermaphrodite');
    expect(() => organism.setSex('male')).toThrow();
  });

  it('SexedMixin without OrganismMixin yields empty valid set', () => {
    const obj = makeStuff(() => new SexedOnlyThing());
    expect(obj.getValidSexSet()).toEqual([]);
  });

  it('OrganismMixin.getSex delegates to SexedMixin via override chain', () => {
    const sapiens = setupSpecies('xy');
    const organism = makeStuff(() => new SexedOrganismThing());
    organism.setSpecies(sapiens);
    organism.setSex('male');
    // Calling getSex on the host runs the most-derived override, which
    // is SexedMixin's. OrganismMixin's null default is shadowed.
    expect(organism.getSex()).toBe('male');
  });
});

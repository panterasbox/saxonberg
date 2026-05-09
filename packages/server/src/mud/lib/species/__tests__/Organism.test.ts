import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrganismMixin } from '../Organism';
import { Species } from '../Species';
import { Idea } from '../../stuff/Idea';
import { Thing } from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

const OrganismThingBase = OrganismMixin(Thing);
class OrganismThing extends OrganismThingBase {}

describe('OrganismMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('composes onto Thing; Idea is not Organism', () => {
    const organism = makeStuff(() => new OrganismThing());
    const idea = makeStuff(() => new Idea());
    expect(MixinApi.isOrganism(organism)).toBe(true);
    expect(MixinApi.isOrganism(idea)).toBe(false);
    expect(MixinApi.hasMixin(organism, Mixins.Organism)).toBe(true);
  });

  it('lazy species resolution via templatePath', () => {
    const sapiens = makeStuff(() => new Species());
    sapiens.setBinomial('Homo sapiens');
    sapiens.templatePath =
      '/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';
    StuffApi.unregister(sapiens);
    StuffApi.register(sapiens);

    const organism = makeStuff(() => new OrganismThing());
    organism.setSpecies(sapiens);
    expect(organism._speciesPath).toBe(
      '/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens'
    );
    expect(organism.getSpecies()).toBe(sapiens);
  });

  it('age + lifecycleState round-trip', () => {
    const organism = makeStuff(() => new OrganismThing());
    organism.setAge(42);
    organism.setLifecycleState('alive');
    expect(organism.getAge()).toBe(42);
    expect(organism.getLifecycleState()).toBe('alive');
  });

  it('getSex returns null when SexedMixin is not composed', () => {
    const organism = makeStuff(() => new OrganismThing());
    expect(organism.getSex()).toBeNull();
  });

  it('getSpecies returns null when path is unset', () => {
    const organism = makeStuff(() => new OrganismThing());
    expect(organism.getSpecies()).toBeNull();
  });
});

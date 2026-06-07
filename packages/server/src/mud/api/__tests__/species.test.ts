import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpeciesApi } from '../species';
import { StuffApi } from '../stuff';
import { Species } from '../../lib/species/Species';
import { BodyPlan } from '../../lib/species/BodyPlan';
import { Clade } from '../../lib/species/Clade';
import { OrganismMixin } from '../../lib/species/Organism';
import { Thing } from '../../lib/stuff/Thing';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

const OrganismThingBase = OrganismMixin(Thing);
class OrganismThing extends OrganismThingBase {}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function setupAnimaliaOrganism(): {
  organism: InstanceType<typeof OrganismThing>;
  animalia: Clade;
} {
  const animalia = withTemplatePath(
    makeStuff(() => new Clade()),
    '/lib/species/animalia'
  );
  animalia.setName('Animalia');
  animalia.setRank('kingdom');

  const sapiens = withTemplatePath(
    makeStuff(() => new Species()),
    '/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens'
  );

  const organism = makeStuff(() => new OrganismThing());
  organism.setSpecies(sapiens);
  return { organism, animalia };
}

function setupConstructaOrganism(): InstanceType<typeof OrganismThing> {
  const constructa = withTemplatePath(
    makeStuff(() => new Clade()),
    '/lib/species/constructa'
  );
  constructa.setName('Constructa');
  constructa.setRank('kingdom');

  const robot = withTemplatePath(
    makeStuff(() => new Species()),
    '/lib/species/constructa/metallica/tutor-bot/mk-iv'
  );

  const organism = makeStuff(() => new OrganismThing());
  organism.setSpecies(robot);
  return organism;
}

describe('SpeciesApi', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  describe('getKingdom / isInKingdom', () => {
    it('walks the species template path to find the kingdom Clade', () => {
      const { organism, animalia } = setupAnimaliaOrganism();
      expect(SpeciesApi.getKingdom(organism)).toBe(animalia);
      expect(SpeciesApi.isInKingdom(organism, 'Animalia')).toBe(true);
      expect(SpeciesApi.isInKingdom(organism, 'Plantae')).toBe(false);
    });

    it('returns null when species is unset', () => {
      const organism = makeStuff(() => new OrganismThing());
      expect(SpeciesApi.getKingdom(organism)).toBeNull();
    });
  });

  describe('lifecycle predicates', () => {
    it('isAlive / isDead / isUndead', () => {
      const organism = makeStuff(() => new OrganismThing());
      organism.setLifecycleState('alive');
      expect(SpeciesApi.isAlive(organism)).toBe(true);
      expect(SpeciesApi.isDead(organism)).toBe(false);

      organism.setLifecycleState('dead');
      expect(SpeciesApi.isAlive(organism)).toBe(false);
      expect(SpeciesApi.isDead(organism)).toBe(true);

      organism.setLifecycleState('undead');
      expect(SpeciesApi.isUndead(organism)).toBe(true);
    });

    it('isPowered / isDestroyed', () => {
      const organism = makeStuff(() => new OrganismThing());
      organism.setLifecycleState('powered');
      expect(SpeciesApi.isPowered(organism)).toBe(true);
      organism.setLifecycleState('destroyed');
      expect(SpeciesApi.isDestroyed(organism)).toBe(true);
    });
  });

  describe('isAnimate dispatch table', () => {
    it('Animalia: alive → true, dead → false, undead → true', () => {
      const { organism } = setupAnimaliaOrganism();
      organism.setLifecycleState('alive');
      expect(SpeciesApi.isAnimate(organism)).toBe(true);
      organism.setLifecycleState('dead');
      expect(SpeciesApi.isAnimate(organism)).toBe(false);
      organism.setLifecycleState('undead');
      expect(SpeciesApi.isAnimate(organism)).toBe(true);
    });

    it('Constructa: powered → true, unpowered → false, destroyed → false', () => {
      const organism = setupConstructaOrganism();
      organism.setLifecycleState('powered');
      expect(SpeciesApi.isAnimate(organism)).toBe(true);
      organism.setLifecycleState('unpowered');
      expect(SpeciesApi.isAnimate(organism)).toBe(false);
      organism.setLifecycleState('destroyed');
      expect(SpeciesApi.isAnimate(organism)).toBe(false);
    });

    it('Plantae: never animate (no Agent surface in v1)', () => {
      const plantae = withTemplatePath(
        makeStuff(() => new Clade()),
        '/lib/species/plantae'
      );
      plantae.setName('Plantae');
      plantae.setRank('kingdom');
      const peace = withTemplatePath(
        makeStuff(() => new Species()),
        '/lib/species/plantae/.../wallisii'
      );
      const plant = makeStuff(() => new OrganismThing());
      plant.setSpecies(peace);
      plant.setLifecycleState('alive');
      expect(SpeciesApi.isAnimate(plant)).toBe(false);
    });

    it('non-Organism: never animate', () => {
      const idea = makeStuff(() => new Idea());
      expect(SpeciesApi.isAnimate(idea)).toBe(false);
    });

    it('Organism with no species: never animate', () => {
      const organism = makeStuff(() => new OrganismThing());
      organism.setLifecycleState('alive');
      expect(SpeciesApi.isAnimate(organism)).toBe(false);
    });
  });

  describe('deriveSensorium (senses build)', () => {
    it('walks viewer → species → bodyPlan → getModalities; AC #18', () => {
      const biped = withTemplatePath(
        makeStuff(() => new BodyPlan()),
        '/lib/body-plans/biped',
      );
      biped.setSensoryPorts([
        { modality: 'vision', count: 2, position: 'frontal' },
        { modality: 'hearing', count: 2, position: 'lateral' },
      ]);
      const sapiens = withTemplatePath(
        makeStuff(() => new Species()),
        '/lib/species/animalia/homo-sapiens',
      );
      sapiens.setBodyPlan(biped);

      const actor = makeStuff(() => new OrganismThing());
      actor.setSpecies(sapiens);

      expect(SpeciesApi.deriveSensorium(actor)).toEqual(['vision', 'hearing']);
    });

    it('returns [] for non-Organism viewer (test fixture)', () => {
      const fixture = makeStuff(() => new Thing());
      expect(SpeciesApi.deriveSensorium(fixture)).toEqual([]);
    });

    it('returns [] for Organism without a Species', () => {
      const actor = makeStuff(() => new OrganismThing());
      expect(SpeciesApi.deriveSensorium(actor)).toEqual([]);
    });

    it('returns [] for Organism whose Species lacks a BodyPlan', () => {
      const orphan = withTemplatePath(
        makeStuff(() => new Species()),
        '/lib/species/animalia/orphan',
      );
      const actor = makeStuff(() => new OrganismThing());
      actor.setSpecies(orphan);
      expect(SpeciesApi.deriveSensorium(actor)).toEqual([]);
    });

    it('returns [] for sessile body plan (no ports)', () => {
      const sessile = withTemplatePath(
        makeStuff(() => new BodyPlan()),
        '/lib/body-plans/sessile',
      );
      const moss = withTemplatePath(
        makeStuff(() => new Species()),
        '/lib/species/plantae/moss',
      );
      moss.setBodyPlan(sessile);
      const actor = makeStuff(() => new OrganismThing());
      actor.setSpecies(moss);
      expect(SpeciesApi.deriveSensorium(actor)).toEqual([]);
    });
  });
});

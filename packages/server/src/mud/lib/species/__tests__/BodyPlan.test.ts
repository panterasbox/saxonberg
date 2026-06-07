import { describe, it, expect } from 'vitest';
import { BodyPlan, deriveSensorium } from '../BodyPlan';
import { Species } from '../Species';
import { Idea } from '../../stuff/Idea';
import { Thing } from '../../stuff/Thing';
import { OrganismMixin } from '../Organism';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

class OrganismThing extends OrganismMixin(Thing) {
  static persistentFields: string[] = [];
}

describe('BodyPlan', () => {
  it('extends Idea via SingletonMixin', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(bp).toBeInstanceOf(Idea);
    expect(MixinApi.hasMixin(bp, Mixins.Singleton)).toBe(true);
  });

  it('round-trips fields', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setName('biped');
    bp.setSlots([
      { name: 'head', accepts: 'WearableMixin' },
      { name: 'torso', accepts: 'WearableMixin' },
      { name: 'hand:left', accepts: 'WieldableMixin' },
      { name: 'hand:right', accepts: 'WieldableMixin' },
    ]);
    bp.setLocomotionModes(['walk']);
    bp.setSensoryPorts([
      { modality: 'vision', count: 2, position: 'frontal' },
    ]);
    expect(bp.getName()).toBe('biped');
    expect(bp.getSlots()).toEqual([
      { name: 'head', accepts: 'WearableMixin' },
      { name: 'torso', accepts: 'WearableMixin' },
      { name: 'hand:left', accepts: 'WieldableMixin' },
      { name: 'hand:right', accepts: 'WieldableMixin' },
    ]);
    expect(bp.getLocomotionModes()).toEqual(['walk']);
    expect(bp.getSensoryPorts()).toEqual([
      { modality: 'vision', count: 2, position: 'frontal' },
    ]);
  });

  it('sessile body plan can be all-empty', () => {
    const bp = makeStuff(() => new BodyPlan());
    bp.setName('sessile');
    expect(bp.getSlots()).toEqual([]);
    expect(bp.getLocomotionModes()).toEqual([]);
    expect(bp.getSensoryPorts()).toEqual([]);
  });

  it('setSlots rejects spec missing name', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(() =>
      bp.setSlots([
        // @ts-expect-error — deliberately invalid
        { accepts: 'WearableMixin' },
      ])
    ).toThrow(/missing 'name'/);
  });

  it('setSlots rejects spec missing accepts', () => {
    const bp = makeStuff(() => new BodyPlan());
    expect(() =>
      bp.setSlots([
        // @ts-expect-error — deliberately invalid
        { name: 'head' },
      ])
    ).toThrow(/missing 'accepts'/);
  });

  it('preserves slot ordering', () => {
    const bp = makeStuff(() => new BodyPlan());
    const ordered = [
      { name: 'a', accepts: 'WearableMixin' },
      { name: 'b', accepts: 'WearableMixin' },
      { name: 'c', accepts: 'WearableMixin' },
    ];
    bp.setSlots(ordered);
    expect(bp.getSlots().map(s => s.name)).toEqual(['a', 'b', 'c']);
  });

  describe('getModalities (senses build)', () => {
    it('returns deduped channel list from sensoryPorts; AC #16', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setSensoryPorts([
        { modality: 'vision', count: 2, position: 'frontal' },
        { modality: 'hearing', count: 2, position: 'lateral' },
        { modality: 'smell', count: 1, position: 'forward' },
        { modality: 'taste', count: 1, position: 'forward' },
        { modality: 'touch', count: 1, position: 'circumferential' },
      ]);
      // Insertion-order preservation via Set.
      expect(bp.getModalities()).toEqual([
        'vision',
        'hearing',
        'smell',
        'taste',
        'touch',
      ]);
    });

    it('returns [] for a sessile body plan with no ports; AC #17', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setName('sessile');
      expect(bp.getModalities()).toEqual([]);
    });

    it('dedupes when one channel has multiple ports', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setSensoryPorts([
        { modality: 'vision', count: 2, position: 'frontal' },
        { modality: 'vision', count: 2, position: 'dorsal' },
        { modality: 'hearing', count: 2, position: 'lateral' },
      ]);
      expect(bp.getModalities()).toEqual(['vision', 'hearing']);
    });
  });

  describe('deriveSensorium (senses build)', () => {
    it('walks viewer → species → bodyPlan → getModalities; AC #18', () => {
      StuffApi.clearAll();
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

      expect(deriveSensorium(actor)).toEqual(['vision', 'hearing']);
    });

    it('returns [] for non-Organism viewer (test fixture)', () => {
      const fixture = makeStuff(() => new Thing());
      expect(deriveSensorium(fixture)).toEqual([]);
    });

    it('returns [] for Organism without a Species', () => {
      StuffApi.clearAll();
      const actor = makeStuff(() => new OrganismThing());
      expect(deriveSensorium(actor)).toEqual([]);
    });

    it('returns [] for Organism whose Species lacks a BodyPlan', () => {
      StuffApi.clearAll();
      const orphan = withTemplatePath(
        makeStuff(() => new Species()),
        '/lib/species/animalia/orphan',
      );
      const actor = makeStuff(() => new OrganismThing());
      actor.setSpecies(orphan);
      expect(deriveSensorium(actor)).toEqual([]);
    });

    it('returns [] for sessile body plan (no ports)', () => {
      StuffApi.clearAll();
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
      expect(deriveSensorium(actor)).toEqual([]);
    });
  });

  describe('defaultLocomotionMode', () => {
    it('defaults to null', () => {
      const bp = makeStuff(() => new BodyPlan());
      expect(bp.getDefaultLocomotionMode()).toBeNull();
    });

    it('round-trips a non-empty string', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setDefaultLocomotionMode('fly');
      expect(bp.getDefaultLocomotionMode()).toBe('fly');
    });

    it('round-trips null', () => {
      const bp = makeStuff(() => new BodyPlan());
      bp.setDefaultLocomotionMode('walk');
      bp.setDefaultLocomotionMode(null);
      expect(bp.getDefaultLocomotionMode()).toBeNull();
    });

    it('throws on empty string', () => {
      const bp = makeStuff(() => new BodyPlan());
      expect(() => bp.setDefaultLocomotionMode('')).toThrow(TypeError);
    });
  });
});

/**
 * PerceptionApi — substrate-level coverage. Per-modality propagation
 * walks live with their modality subclasses
 * (`lib/perception/modalities/__tests__/`); this file covers the Api's
 * dispatch contracts:
 *   - `modalityByName` / `modalityByOrganKey` resolution.
 *   - `sensorium` walk (innate organs → modality singletons).
 *   - `canPerceive` predicate.
 *   - Defensive behavior (non-Organism, missing species, missing
 *     bodyplan, sessile).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { PerceptionApi } from '../perception';
import { PerceptionLogic } from '../../platform/idea/api/PerceptionLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import { OrganismMixin } from '../../lib/species/Organism';
import Thing from '../../lib/stuff/Thing';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  buildAllModalities,
  buildModality,
} from '../../lib/perception/modalities/__tests__/test-helpers';
import { VisionModality } from '../../platform/idea/modalities/VisionModality';
import { SoundModality } from '../../platform/idea/modalities/SoundModality';
import { SmellModality } from '../../platform/idea/modalities/SmellModality';

const OrganismThingBase = OrganismMixin(Thing);
class OrganismThing extends OrganismThingBase {}

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

function makeBipedSapiens(): Stuff {
  const biped = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    '/stuff/idea/species/BodyPlan/biped',
  );
  biped.setSensoryPorts([
    { modality: 'vision', count: 2, position: 'frontal' },
    { modality: 'hearing', count: 2, position: 'lateral' },
    { modality: 'smell', count: 1, position: 'frontal' },
  ]);
  const sapiens = withTemplatePath(
    makeStuff(() => new Species()),
    '/stuff/idea/species/animalia/homo-sapiens',
  );
  sapiens.setBodyPlan(biped);
  const actor = makeStuff(() => new OrganismThing());
  actor.setSpecies(sapiens);
  return actor;
}

function makePeaceLily(): Stuff {
  const sessile = withTemplatePath(
    makeStuff(() => new BodyPlan()),
    '/stuff/idea/species/BodyPlan/sessile',
  );
  // No sensoryPorts — sessile body plans have empty perception.
  const lily = withTemplatePath(
    makeStuff(() => new Species()),
    '/stuff/idea/species/plantae/peace-lily',
  );
  lily.setBodyPlan(sessile);
  const actor = makeStuff(() => new OrganismThing());
  actor.setSpecies(lily);
  return actor;
}

describe('PerceptionApi', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    buildAllModalities();
  });

  describe('modalityByName', () => {
    it('resolves each v1 modality singleton by name', () => {
      const names = [
        'vision',
        'smell',
        'sound',
        'touch',
        'taste',
        'verbal-esp',
        'emotive-esp',
      ];
      for (const name of names) {
        const modality = PerceptionApi.modalityByName(name);
        expect(modality.getName()).toBe(name);
      }
    });

    it('throws for an unknown modality name', () => {
      expect(() => PerceptionApi.modalityByName('xenoreception')).toThrow();
    });

    it('returns the typed subclass singleton', () => {
      expect(PerceptionApi.modalityByName('vision')).toBeInstanceOf(
        VisionModality,
      );
      expect(PerceptionApi.modalityByName('sound')).toBeInstanceOf(
        SoundModality,
      );
      expect(PerceptionApi.modalityByName('smell')).toBeInstanceOf(
        SmellModality,
      );
    });
  });

  describe('modalityByOrganKey', () => {
    it('resolves the sound modality from organ key "hearing"', () => {
      const modality = PerceptionApi.modalityByOrganKey('hearing');
      expect(modality?.getName()).toBe('sound');
    });

    it('returns null for an unknown organ key', () => {
      expect(PerceptionApi.modalityByOrganKey('echo')).toBeNull();
    });
  });

  describe('sensorium', () => {
    it('walks the BodyPlan organs of a homo sapiens', () => {
      const actor = makeBipedSapiens();
      const sensorium = PerceptionApi.sensorium(actor);
      const names = sensorium.map((m) => m.getName()).sort();
      expect(names).toEqual(['smell', 'sound', 'vision']);
    });

    it('returns [] for a non-Organism viewer', () => {
      const fixture = makeStuff(() => new Thing());
      expect(PerceptionApi.sensorium(fixture)).toEqual([]);
    });

    it('returns [] for an Organism without a Species', () => {
      const actor = makeStuff(() => new OrganismThing());
      expect(PerceptionApi.sensorium(actor)).toEqual([]);
    });

    it('returns [] for a Species without a BodyPlan', () => {
      const orphan = withTemplatePath(
        makeStuff(() => new Species()),
        '/stuff/idea/species/animalia/orphan',
      );
      const actor = makeStuff(() => new OrganismThing());
      actor.setSpecies(orphan);
      expect(PerceptionApi.sensorium(actor)).toEqual([]);
    });

    it('returns [] for a sessile body plan (peace lily)', () => {
      const actor = makePeaceLily();
      expect(PerceptionApi.sensorium(actor)).toEqual([]);
    });

    it('dedupes when the same organ key appears multiple times', () => {
      const biped = withTemplatePath(
        makeStuff(() => new BodyPlan()),
        '/stuff/idea/species/BodyPlan/duplicate',
      );
      biped.setSensoryPorts([
        { modality: 'vision', count: 2, position: 'frontal' },
        { modality: 'vision', count: 0, position: 'dorsal' },
      ]);
      const species = withTemplatePath(
        makeStuff(() => new Species()),
        '/stuff/idea/species/test/duplicate',
      );
      species.setBodyPlan(biped);
      const actor = makeStuff(() => new OrganismThing());
      actor.setSpecies(species);

      // BodyPlan.getModalities already dedupes; the Api walk preserves
      // that and adds its own dedup pass for the augment side.
      const sensorium = PerceptionApi.sensorium(actor);
      expect(sensorium).toHaveLength(1);
      expect(sensorium[0]!.getName()).toBe('vision');
    });
  });

  describe('canPerceive', () => {
    it('returns true when the modality is in the viewer\'s sensorium', () => {
      const actor = makeBipedSapiens();
      expect(
        PerceptionApi.canPerceive(actor, PerceptionApi.modalityByName('vision')),
      ).toBe(true);
      expect(
        PerceptionApi.canPerceive(actor, PerceptionApi.modalityByName('sound')),
      ).toBe(true);
    });

    it('returns false when the modality is not in the sensorium', () => {
      const actor = makeBipedSapiens();
      expect(
        PerceptionApi.canPerceive(actor, PerceptionApi.modalityByName('taste')),
      ).toBe(false);
      expect(
        PerceptionApi.canPerceive(
          actor,
          PerceptionApi.modalityByName('verbal-esp'),
        ),
      ).toBe(false);
    });

    it('returns false for sessile viewers', () => {
      const actor = makePeaceLily();
      expect(
        PerceptionApi.canPerceive(actor, PerceptionApi.modalityByName('vision')),
      ).toBe(false);
    });
  });

  describe('signalAt / perceiveAt — default null behavior', () => {
    it('returns null from contact/network modalities by default', () => {
      // Touch / taste / ESP modalities inherit the null default until
      // Phases 5 (touch) and 6+ (ESP physics) fill the bodies. The
      // base-class default ignores its loc argument, so passing a
      // bare Thing through `unknown` cast is enough — we're testing
      // the dispatch path, not the contents traversal.
      const loc = makeStuff(
        () => new Thing()
      ) as unknown as Parameters<typeof taste.signalAt>[0];
      const taste = PerceptionApi.modalityByName('taste');
      // signalAt is the modality's own method (no thin Api wrapper).
      expect(taste.signalAt(loc)).toBeNull();
    });
  });

  describe('buildModality singleton replacement', () => {
    it('replaces a re-built modality cleanly (HMR-shaped)', () => {
      const first = PerceptionApi.modalityByName('vision');
      buildModality('vision');
      const second = PerceptionApi.modalityByName('vision');
      // After buildModality, the cache invalidates and re-resolves to
      // the new singleton — the substrate's HMR shape.
      expect(second).not.toBe(first);
      expect(second.getName()).toBe('vision');
    });
  });
});

describe('PerceptionLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-PerceptionApi caller', () => {
    // A facade call lazily creates the logic singleton.
    PerceptionApi.sensorium(makeStuff(() => new Thing()));
    const logic = StuffApi.findByTemplatePath<PerceptionLogic>(
      '/platform/idea/api/perception'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/perception#PerceptionApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() =>
      logic!.sensorium(makeStuff(() => new Thing()))
    ).toThrow(SecurityError);
  });
});

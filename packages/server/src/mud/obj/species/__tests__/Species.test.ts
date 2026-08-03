import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Species from '../Species';
import BodyPlan from '../BodyPlan';
import Clade from '../Clade';
import Material from '../../../lib/material/Material';
import { Idea } from '../../../lib/stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';

function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
  stampTemplatePathForTest(obj, path);
  return obj;
}

describe('Species', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('extends Idea via SingletonMixin', () => {
    const s = makeStuff(() => new Species());
    expect(s).toBeInstanceOf(Idea);
    expect(MixinApi.hasMixin(s, Mixins.Singleton)).toBe(true);
  });

  it('round-trips scalar fields', () => {
    const s = makeStuff(() => new Species());
    s.setBinomial('Homo sapiens');
    s.setCommonNames(['human', 'man']);
    s.setLifecycleStates(['alive', 'dead', 'undead']);
    s.setSexDeterminationSystem('xy');
    s.setReproductiveMode('sexual');
    s.setLifespanMin(0);
    s.setLifespanMax(120);
    s.setCircadianBand('diurnal');
    s.setDiet('omnivore');
    expect(s.getBinomial()).toBe('Homo sapiens');
    expect(s.getCommonNames()).toEqual(['human', 'man']);
    expect(s.getLifecycleStates()).toEqual(['alive', 'dead', 'undead']);
    expect(s.getSexDeterminationSystem()).toBe('xy');
    expect(s.getReproductiveMode()).toBe('sexual');
    expect(s.getLifespanMin()).toBe(0);
    expect(s.getLifespanMax()).toBe(120);
    expect(s.getCircadianBand()).toBe('diurnal');
    expect(s.getDiet()).toBe('omnivore');
  });

  it('cross-references resolve lazily via templatePath', () => {
    const biped = withTemplatePath(
      makeStuff(() => new BodyPlan()),
      '/obj/species/BodyPlan/biped'
    );
    const animalia = withTemplatePath(
      makeStuff(() => new Clade()),
      '/obj/species/animalia'
    );
    const flesh = withTemplatePath(
      makeStuff(() => new Material()),
      '/obj/material/tissue/flesh'
    );

    const sapiens = makeStuff(() => new Species());
    sapiens.setBodyPlan(biped);
    sapiens.setParentClade(animalia);
    sapiens.setDefaultMaterial(flesh);
    expect(sapiens._bodyPlanPath).toBe('/obj/species/BodyPlan/biped');
    expect(sapiens._parentCladePath).toBe('/obj/species/animalia');
    expect(sapiens._defaultMaterialPath).toBe('/obj/material/tissue/flesh');
    expect(sapiens.getBodyPlan()).toBe(biped);
    expect(sapiens.getParentClade()).toBe(animalia);
    expect(sapiens.getDefaultMaterial()).toBe(flesh);
  });

  it('cross-reference setters accept null', () => {
    const sapiens = makeStuff(() => new Species());
    sapiens.setBodyPlan(null);
    expect(sapiens.getBodyPlan()).toBeNull();
  });

  it('visionProfile round-trips as a flat 3-scalar object', () => {
    const s = makeStuff(() => new Species());
    s.setVisionProfile({
      scotopicMin: 'pitch-black',
      photopicMax: 'blinding',
      bandShift: -1,
    });
    expect(s.getVisionProfile()).toEqual({
      scotopicMin: 'pitch-black',
      photopicMax: 'blinding',
      bandShift: -1,
    });
  });

  describe('olfactoryProfile (senses build)', () => {
    it('round-trips a valid profile', () => {
      const s = makeStuff(() => new Species());
      s.setOlfactoryProfile({ acuity: 'keen' });
      expect(s.getOlfactoryProfile()).toEqual({ acuity: 'keen' });
    });

    it('round-trips null', () => {
      const s = makeStuff(() => new Species());
      s.setOlfactoryProfile({ acuity: 'normal' });
      s.setOlfactoryProfile(null);
      expect(s.getOlfactoryProfile()).toBeNull();
    });

    it('defaults to null on construction', () => {
      const s = makeStuff(() => new Species());
      expect(s.getOlfactoryProfile()).toBeNull();
    });

    it('observable presence vs absence', () => {
      const dog = makeStuff(() => new Species());
      dog.setOlfactoryProfile({ acuity: 'keen' });
      const rock = makeStuff(() => new Species());
      // null indicates "no smell" for a species (a rock); a non-null
      // value indicates the species has a smell sense.
      expect(dog.getOlfactoryProfile()).not.toBeNull();
      expect(rock.getOlfactoryProfile()).toBeNull();
    });

    it('rejects unknown acuity value; per-field invariant', () => {
      const s = makeStuff(() => new Species());
      expect(() =>
        s.setOlfactoryProfile({
          // @ts-expect-error deliberately invalid value
          acuity: 'bionic',
        }),
      ).toThrow(/acuity must be one of/);
    });

    it('rejects non-object profile', () => {
      const s = makeStuff(() => new Species());
      expect(() =>
        // @ts-expect-error deliberately invalid value
        s.setOlfactoryProfile('keen'),
      ).toThrow(/must be null or a profile object/);
    });
  });

  // ────────────────────────────────────────────────────────────
  // R2.4 cleanup on destruct (OPEN-4 resolution).
  // ────────────────────────────────────────────────────────────
  //
  // Species is a concrete leaf class (no `_mixinName`), so the
  // mixin-registry cleanup dispatcher doesn't reach it. Instead
  // `Species.onDestruct` chains via `super.onDestruct()` and
  // unhooks from its parent Clade's `species` set. The
  // production wire-up (Clade.addSpecies at template hydrate) is
  // pending; the test seeds the relationship explicitly.
  it('destruct unhooks Species from its parent Clade.species set', () => {
    const animalia = withTemplatePath(
      makeStuff(() => new Clade()),
      '/obj/species/animalia'
    );
    const sapiens = makeStuff(() => new Species());
    sapiens.setParentClade(animalia);
    animalia.addSpecies(sapiens);
    expect(animalia.getSpecies().has(sapiens)).toBe(true);

    StuffApi.destruct(sapiens);

    expect(animalia.getSpecies().has(sapiens)).toBe(false);
    expect(sapiens.isDestroyed()).toBe(true);
  });
});

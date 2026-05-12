import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Species } from '../Species';
import { BodyPlan } from '../BodyPlan';
import { Clade } from '../Clade';
import { Material } from '../../material/Material';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

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
      '/lib/body-plans/biped'
    );
    const animalia = withTemplatePath(
      makeStuff(() => new Clade()),
      '/lib/species/animalia'
    );
    const flesh = withTemplatePath(
      makeStuff(() => new Material()),
      '/lib/material/tissue/flesh'
    );

    const sapiens = makeStuff(() => new Species());
    sapiens.setBodyPlan(biped);
    sapiens.setParentClade(animalia);
    sapiens.setDefaultMaterial(flesh);
    expect(sapiens._bodyPlanPath).toBe('/lib/body-plans/biped');
    expect(sapiens._parentCladePath).toBe('/lib/species/animalia');
    expect(sapiens._defaultMaterialPath).toBe('/lib/material/tissue/flesh');
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
      '/lib/species/animalia'
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Species } from '../Species';
import { BodyPlan } from '../BodyPlan';
import { Clade } from '../Clade';
import { Material } from '../../stuff/Material';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

function withTemplatePath<T extends { templatePath: string | null }>(
  obj: T,
  path: string
): T {
  obj.templatePath = path;
  StuffApi.unregister(obj as never);
  StuffApi.register(obj as never);
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
      '/obj/body-plans/biped'
    );
    const animalia = withTemplatePath(
      makeStuff(() => new Clade()),
      '/obj/species/animalia'
    );
    const flesh = withTemplatePath(
      makeStuff(() => new Material()),
      '/domain/material/flesh'
    );

    const sapiens = makeStuff(() => new Species());
    sapiens.setBodyPlan(biped);
    sapiens.setParentClade(animalia);
    sapiens.setDefaultMaterial(flesh);
    expect(sapiens._bodyPlanPath).toBe('/obj/body-plans/biped');
    expect(sapiens._parentCladePath).toBe('/obj/species/animalia');
    expect(sapiens._defaultMaterialPath).toBe('/domain/material/flesh');
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
});

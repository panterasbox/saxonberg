import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Material } from '../Material';
import { Thing } from '../../stuff/Thing';
import { Location } from '../../stuff/Location';
import { Vessel } from '../../stuff/Vessel';
import { Agent } from '../../stuff/Agent';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

describe('TangibleMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Thing/Location/Vessel/Agent compose Tangible; Idea does not', () => {
    const thing = makeStuff(() => new Thing());
    const location = makeStuff(() => new Location());
    const vessel = makeStuff(() => new Vessel());
    const agent = makeStuff(() => new Agent());
    const idea = makeStuff(() => new Idea());
    expect(MixinApi.isTangible(thing)).toBe(true);
    expect(MixinApi.isTangible(location)).toBe(true);
    expect(MixinApi.isTangible(vessel)).toBe(true);
    expect(MixinApi.isTangible(agent)).toBe(true);
    expect(MixinApi.isTangible(idea)).toBe(false);
  });

  it('getMaterial returns null when unset', () => {
    const thing = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(thing)) throw new Error('expected tangible');
    expect(thing.getMaterial()).toBeNull();
  });

  it('setMaterial stores the path; getMaterial resolves lazily', () => {
    const iron = makeStuff(() => new Material());
    // Pretend the singleton is registered at this template path (the
    // makeStuff helper doesn't stamp templatePath; do it via the public
    // index seam).
    iron.templatePath = '/material/element/iron';
    StuffApi.unregister(iron);
    StuffApi.register(iron);

    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    expect(sword._materialPath).toBe('/material/element/iron');
    expect(sword.getMaterial()).toBe(iron);
  });

  it('setMaterial(null) clears the path', () => {
    const iron = makeStuff(() => new Material());
    iron.templatePath = '/material/element/iron';
    StuffApi.unregister(iron);
    StuffApi.register(iron);
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    sword.setMaterial(null);
    expect(sword._materialPath).toBeNull();
    expect(sword.getMaterial()).toBeNull();
  });

  describe('per-Detail materials', () => {
    function withTemplatePath<T extends { templatePath: string | null }>(
      obj: T,
      path: string
    ): T {
      obj.templatePath = path;
      StuffApi.unregister(obj as never);
      StuffApi.register(obj as never);
      return obj;
    }

    it('per-Detail override wins over bulk default at that key', () => {
      const oak = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/element/iron'
      );
      const axe = makeStuff(() => new Thing());
      if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
      axe.setMaterial(oak);
      axe.setMaterial(iron, 'head');

      expect(axe.getMaterial()).toBe(oak);
      expect(axe.getMaterial('head')).toBe(iron);
    });

    it('unknown detail keys fall through to the bulk default', () => {
      const oak = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/wood/oak'
      );
      const axe = makeStuff(() => new Thing());
      if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
      axe.setMaterial(oak);

      expect(axe.getMaterial('haft')).toBe(oak);
      expect(axe.getMaterial('imaginary')).toBe(oak);
    });

    it('setMaterial(null, key) removes the override; reads fall through again', () => {
      const oak = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/element/iron'
      );
      const axe = makeStuff(() => new Thing());
      if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
      axe.setMaterial(oak);
      axe.setMaterial(iron, 'head');
      expect(axe.getMaterial('head')).toBe(iron);

      axe.setMaterial(null, 'head');
      expect(axe.getMaterial('head')).toBe(oak);
      expect(axe._detailMaterialPaths).toEqual({});
    });

    it('setMaterial(null) clears overrides too', () => {
      const oak = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/element/iron'
      );
      const axe = makeStuff(() => new Thing());
      if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
      axe.setMaterial(oak);
      axe.setMaterial(iron, 'head');
      axe.setMaterial(null);

      expect(axe.getMaterial()).toBeNull();
      expect(axe.getMaterial('head')).toBeNull();
      expect(axe._detailMaterialPaths).toEqual({});
    });

    it('multiple Details each carry their own material', () => {
      const oak = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/element/iron'
      );
      const flesh = withTemplatePath(
        makeStuff(() => new Material()),
        '/material/tissue/flesh'
      );
      const golem = makeStuff(() => new Thing());
      if (!MixinApi.isTangible(golem)) throw new Error('expected tangible');
      golem.setMaterial(oak);
      golem.setMaterial(iron, 'head');
      golem.setMaterial(flesh, 'heart');

      expect(golem.getMaterial('head')).toBe(iron);
      expect(golem.getMaterial('heart')).toBe(flesh);
      expect(golem.getMaterial()).toBe(oak);
    });
  });
});

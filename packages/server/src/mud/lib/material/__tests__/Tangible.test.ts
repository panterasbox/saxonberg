import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Material from '../Material';
import Thing from '../../stuff/Thing';
import Location from '../../stuff/Location';
import { Vessel } from '../../stuff/Vessel';
import { Agent } from '../../stuff/Agent';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

describe('TangibleMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('Thing/Vessel/Agent compose Tangible (matter); Location + Idea do not', () => {
    const thing = makeStuff(() => new Thing());
    const location = makeStuff(() => new Location());
    const vessel = makeStuff(() => new Vessel());
    const agent = makeStuff(() => new Agent());
    const idea = makeStuff(() => new Idea());
    expect(MixinApi.isTangible(thing)).toBe(true);
    expect(MixinApi.isTangible(vessel)).toBe(true);
    expect(MixinApi.isTangible(agent)).toBe(true);
    // A Location represents *space*, not *matter* — not Tangible.
    expect(MixinApi.isTangible(location)).toBe(false);
    expect(MixinApi.isTangible(idea)).toBe(false);
  });

  it('getMaterial returns null when unset', () => {
    const thing = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(thing)) throw new Error('expected tangible');
    expect(thing.getMaterial()).toBeNull();
  });

  it('setMaterial stores the path; getMaterial resolves lazily', () => {
    const iron = makeStuff(() => new Material());
    // Pretend the singleton is registered at this template path
    // (the `#templatePath` slot is locked; the test seam handles
    // the unregister-stamp-register dance).
    stampTemplatePathForTest(iron, '/lib/material/element/iron');

    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    expect(sword._materialPath).toBe('/lib/material/element/iron');
    expect(sword.getMaterial()).toBe(iron);
  });

  it('setMaterial(null) clears the path', () => {
    const iron = makeStuff(() => new Material());
    stampTemplatePathForTest(iron, '/lib/material/element/iron');
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    sword.setMaterial(null);
    expect(sword._materialPath).toBeNull();
    expect(sword.getMaterial()).toBeNull();
  });

  describe('per-Detail materials', () => {
    function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
      stampTemplatePathForTest(obj, path);
      return obj;
    }

    it('per-Detail override wins over bulk default at that key', () => {
      const oak = withTemplatePath(
        makeStuff(() => new Material()),
        '/lib/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/lib/material/element/iron'
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
        '/lib/material/wood/oak'
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
        '/lib/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/lib/material/element/iron'
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
        '/lib/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/lib/material/element/iron'
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
        '/lib/material/wood/oak'
      );
      const iron = withTemplatePath(
        makeStuff(() => new Material()),
        '/lib/material/element/iron'
      );
      const flesh = withTemplatePath(
        makeStuff(() => new Material()),
        '/lib/material/tissue/flesh'
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

    describe('dotted-prefix inheritance', () => {
      function withTemplatePath<T extends Stuff>(obj: T, path: string): T {
        stampTemplatePathForTest(obj, path);
        return obj;
      }

      it('sub-detail without an override inherits its ancestor override', () => {
        const oak = withTemplatePath(
          makeStuff(() => new Material()),
          '/lib/material/wood/oak'
        );
        const iron = withTemplatePath(
          makeStuff(() => new Material()),
          '/lib/material/element/iron'
        );
        const axe = makeStuff(() => new Thing());
        if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
        axe.setMaterial(oak); // bulk = oak
        axe.setMaterial(iron, 'head'); // override on 'head'

        // 'head.spine' has no exact override → inherits 'head' = iron.
        expect(axe.getMaterial('head.spine')).toBe(iron);
        // 'head.edge.tip' (deeper) inherits 'head' too.
        expect(axe.getMaterial('head.edge.tip')).toBe(iron);
      });

      it('exact override wins over the ancestor', () => {
        const oak = withTemplatePath(
          makeStuff(() => new Material()),
          '/lib/material/wood/oak'
        );
        const iron = withTemplatePath(
          makeStuff(() => new Material()),
          '/lib/material/element/iron'
        );
        const steel = withTemplatePath(
          makeStuff(() => new Material()),
          '/lib/material/alloy/steel'
        );
        const axe = makeStuff(() => new Thing());
        if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
        axe.setMaterial(oak);
        axe.setMaterial(iron, 'head');
        axe.setMaterial(steel, 'head.edge');

        expect(axe.getMaterial('head')).toBe(iron);
        expect(axe.getMaterial('head.edge')).toBe(steel);
        // Sub-detail of the steel edge inherits steel.
        expect(axe.getMaterial('head.edge.tip')).toBe(steel);
        // Other branch under 'head' still inherits iron.
        expect(axe.getMaterial('head.spine')).toBe(iron);
      });

      it('falls all the way through to the bulk default when no prefix matches', () => {
        const oak = withTemplatePath(
          makeStuff(() => new Material()),
          '/lib/material/wood/oak'
        );
        const axe = makeStuff(() => new Thing());
        if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
        axe.setMaterial(oak);
        expect(axe.getMaterial('handle.grip.wrap')).toBe(oak);
      });
    });
  });
});

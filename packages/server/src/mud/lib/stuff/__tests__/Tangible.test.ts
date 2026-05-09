import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Material } from '../Material';
import { Thing } from '../Thing';
import { Location } from '../Location';
import { Vessel } from '../Vessel';
import { Agent } from '../Agent';
import { Idea } from '../Idea';
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
    iron.templatePath = '/domain/material/iron';
    StuffApi.unregister(iron);
    StuffApi.register(iron);

    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    expect(sword._materialPath).toBe('/domain/material/iron');
    expect(sword.getMaterial()).toBe(iron);
  });

  it('setMaterial(null) clears the path', () => {
    const iron = makeStuff(() => new Material());
    iron.templatePath = '/domain/material/iron';
    StuffApi.unregister(iron);
    StuffApi.register(iron);
    const sword = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(sword)) throw new Error('expected tangible');
    sword.setMaterial(iron);
    sword.setMaterial(null);
    expect(sword._materialPath).toBeNull();
    expect(sword.getMaterial()).toBeNull();
  });
});

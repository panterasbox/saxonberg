import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialApi } from '../material';
import { StuffApi } from '../stuff';
import { Material } from '../../lib/material/Material';
import { Thing } from '../../lib/stuff/Thing';
import { Idea } from '../../lib/stuff/Idea';
import { MixinApi } from '../mixin';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('MaterialApi.materialOf', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
  });

  it('returns null for non-Tangible Stuff', () => {
    const idea = makeStuff(() => new Idea());
    expect(MaterialApi.materialOf(idea)).toBeNull();
  });

  it('returns null for Tangible Stuff with no material set', () => {
    const thing = makeStuff(() => new Thing());
    expect(MaterialApi.materialOf(thing)).toBeNull();
  });

  it('returns the Material singleton for a Tangible Stuff with a path set', () => {
    const oak = makeStuff(() => new Material());
    oak.setName('oak');
    oak.templatePath = '/material/oak';
    StuffApi.unregister(oak);
    StuffApi.register(oak);

    const log = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(log)) throw new Error('expected tangible');
    log.setMaterial(oak);

    expect(MaterialApi.materialOf(log)).toBe(oak);
  });

  it('reads per-Detail overrides when detailKey is supplied', () => {
    const oak = makeStuff(() => new Material());
    oak.templatePath = '/material/oak';
    StuffApi.unregister(oak);
    StuffApi.register(oak);
    const iron = makeStuff(() => new Material());
    iron.templatePath = '/material/iron';
    StuffApi.unregister(iron);
    StuffApi.register(iron);

    const axe = makeStuff(() => new Thing());
    if (!MixinApi.isTangible(axe)) throw new Error('expected tangible');
    axe.setMaterial(oak);
    axe.setMaterial(iron, 'head');

    expect(MaterialApi.materialOf(axe)).toBe(oak);
    expect(MaterialApi.materialOf(axe, 'head')).toBe(iron);
    // Unknown key falls through to bulk default.
    expect(MaterialApi.materialOf(axe, 'haft')).toBe(oak);
  });
});

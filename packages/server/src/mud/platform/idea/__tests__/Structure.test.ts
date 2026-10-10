import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Structure from '../Structure';
import StructureCatalogue from '../StructureCatalogue';
import { Template } from '../../../lib/stuff/Template';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

/**
 * The Structure (maritime D4): membership by extent prefix, sparse, and
 * a position that is simply a field — null for a building ashore.
 */
describe('Structure', () => {
  beforeEach(() => StuffApi.clearAll());
  afterEach(() => vi.restoreAllMocks());

  it('a member is any room under the extent, on a segment boundary', () => {
    const s = makeStuff(() => new Structure());
    s.setExtent('/test/ship/');
    expect(s.hasMember('/test/ship/deck')).toBe(true);
    expect(s.hasMember('/test/ship')).toBe(true);
    expect(s.hasMember('/test/shipyard/slip')).toBe(false);
  });

  it('a building is a Structure whose position is null; a ship is one whose position is set', () => {
    const s = makeStuff(() => new Structure());
    expect(MixinApi.isPositioned(s)).toBe(true);
    expect(MixinApi.isPersistable(s)).toBe(true);
    expect(s.getExpansePosition()).toBeNull();
    s.setExpansePosition({ latDeg: 50, lonDeg: -4 });
    expect(s.getExpansePosition()!.latDeg).toBe(50);
  });

  it('the catalogue answers the structure a place is in by the longest extent', async () => {
    vi.spyOn(Template, 'findByClass').mockResolvedValue([
      { path: '/test/a/structure', data: { extent: '/test/a' } },
      { path: '/test/a/wing/structure', data: { extent: '/test/a/wing' } },
    ] as unknown as Template[]);
    const cat = makeStuff(() => new StructureCatalogue());
    expect((await cat.structureOf('/test/a/wing/attic'))?.path).toBe('/test/a/wing/structure');
    expect((await cat.structureOf('/test/a/hall'))?.path).toBe('/test/a/structure');
    expect(await cat.structureOf('/test/elsewhere')).toBeNull();
  });
});

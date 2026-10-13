/**
 * ⭐ The structure catalogue answers by KEY (maritime review, 2026-10-13):
 * *which building is this room in* walks the room's own path up its
 * segments (O(depth)); *what stands in this zone* is one lookup. The
 * horizon and the water's weather lean ask it — never the registry.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import StructureCatalogue from '../StructureCatalogue';
import { Template } from '../../../lib/stuff/Template';
import { StuffApi } from '../../../api/stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

const ROWS = [
  { path: '/w/t/terminal/structure', data: { extent: '/w/t/terminal', heightM: 25 } },
  { path: '/w/t/hesper/structure', data: { extent: '/w/t/hesper/', heightM: 18 } },
  { path: '/w/t/terminal/annex/structure', data: { extent: '/w/t/terminal/annex', heightM: 5 } },
  { path: '/w/loose', data: {} },
];

let cat: StructureCatalogue;
beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(Template, 'findByClass').mockResolvedValue(ROWS as unknown as Template[]);
  cat = makeStuffAtPath(() => new StructureCatalogue(), '/platform/idea/StructureCatalogue');
});
afterEach(() => vi.restoreAllMocks());

describe('which building is this room in', () => {
  it('before the rows load it says nothing — and starts the load', async () => {
    expect(cat.peekStructureOf('/w/t/terminal/hall')).toBeNull();
    await cat.all();
    expect(cat.peekStructureOf('/w/t/terminal/hall')?.path).toBe('/w/t/terminal/structure');
  });

  it('⭐ the longest extent wins; a sibling path is not a member; a trailing slash is the same extent', async () => {
    await cat.all();
    expect(cat.peekStructureOf('/w/t/terminal/annex/stair')?.path).toBe('/w/t/terminal/annex/structure');
    expect(cat.peekStructureOf('/w/t/terminal')?.path).toBe('/w/t/terminal/structure');
    expect(cat.peekStructureOf('/w/t/terminalia/x')).toBeNull();
    expect(cat.peekStructureOf('/w/t/hesper/deck')?.path).toBe('/w/t/hesper/structure');
    expect(cat.peekStructureOf('/w/elsewhere')).toBeNull();
  });

  it('the async form answers the same', async () => {
    expect((await cat.structureOf('/w/t/hesper/hold'))?.path).toBe('/w/t/hesper/structure');
  });
});

describe('what stands in a zone', () => {
  it('⭐ every structure whose extent is the zone or under it', async () => {
    await cat.all();
    const paths = (z: string) => cat.peekStructuresWithin(z).map((r) => r.path).sort();
    expect(paths('/w/t')).toEqual([
      '/w/t/hesper/structure',
      '/w/t/terminal/annex/structure',
      '/w/t/terminal/structure',
    ]);
    expect(paths('/w/t/terminal')).toEqual(['/w/t/terminal/annex/structure', '/w/t/terminal/structure']);
    expect(paths('/w/nowhere')).toEqual([]);
  });
});

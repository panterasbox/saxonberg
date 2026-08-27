/**
 * CreditRouting — the producer-credit routing seam. Covers: a released zone
 * with a recorded author yields one full-weight share; the released gate
 * zeros `/home/…` and `/obj/…` content; a missing covering zone, or a zone
 * with no author, yields no shares.
 *
 * `ZoneApi.resolveZoneForPath` and `ProvenanceApi.authorOf` are stubbed — the
 * resolver is pure routing over them.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { CreditRouting } from '../CreditRouting';
import { ZoneApi } from '../../../api/zone';
import { ProvenanceApi } from '../../../api/provenance';
import type { SpatialZone } from '../../zone/SpatialZone';

afterEach(() => vi.restoreAllMocks());

/** A minimal stand-in zone exposing only its template path. */
function zoneAt(path: string | null): SpatialZone | null {
  if (path === null) return null;
  return { getTemplatePath: () => path } as unknown as SpatialZone;
}

const AUTHOR = '/platform/agent/Avatar/maker';
const LOC = '/world/gallery/room';

describe('CreditRouting.isReleased', () => {
  it('treats only the personal homedir as unreleased; domain + obj are released', () => {
    expect(CreditRouting.isReleased('/world/gallery')).toBe(true);
    expect(CreditRouting.isReleased('/platform/idea/SoulCatalogue')).toBe(true); // obj is released core content
    expect(CreditRouting.isReleased('/home/alice/studio')).toBe(false);
  });
});

describe('CreditRouting.resolve', () => {
  it('credits the covering zone author at full weight for released content', async () => {
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(
      zoneAt('/world/gallery')
    );
    vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue(AUTHOR);

    const shares = await CreditRouting.resolve(LOC);
    expect(shares).toEqual([{ author: AUTHOR, weight: 1 }]);
  });

  it('earns nothing for unreleased (home) content, without reading the ledger', async () => {
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(
      zoneAt('/home/alice/studio')
    );
    const authorOf = vi.spyOn(ProvenanceApi, 'authorOf');

    expect(await CreditRouting.resolve('/home/alice/studio/room')).toEqual([]);
    expect(authorOf).not.toHaveBeenCalled(); // gated before the ledger read
  });

  it('credits released /obj (core) content with a recorded author', async () => {
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(
      zoneAt('/obj/EngineZone')
    );
    vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue(AUTHOR);
    expect(await CreditRouting.resolve('/obj/EngineZone/loc')).toEqual([
      { author: AUTHOR, weight: 1 },
    ]);
  });

  it('earns nothing when no zone covers the path', async () => {
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(zoneAt(null));
    expect(await CreditRouting.resolve(LOC)).toEqual([]);
  });

  it('earns nothing when the released zone has no recorded author', async () => {
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue(
      zoneAt('/world/gallery')
    );
    vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue(null);
    expect(await CreditRouting.resolve(LOC)).toEqual([]);
  });
});

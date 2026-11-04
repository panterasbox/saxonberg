/**
 * A holding's LAYOUT as data (tracts build D27, D31; harbors review 3):
 * the open ground its tracts share is the parcel's workable area less the
 * ground its BLUEPRINT's buildings cover (the Structure's `footprintM2`).
 * A tract's share is the tract row's own field (trade-farming's
 * tract-sizing suite); a mirrored copy's ways and cells are the kernel's
 * (`FloorplanWarren.test`).
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import HoldingWarren from '../idea/HoldingWarren';
import { Blueprint } from '@saxonberg/server/mud/lib/location/Blueprint';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

function farm(): HoldingWarren {
  vi.spyOn(Blueprint.prototype, 'load').mockResolvedValue({
    path: '/world/_t/farmstead-blueprint',
    extent: '/world/_t/farmstead',
    entrance: '/world/_t/farmstead/yard',
    footprintM2: 550,
    rooms: [],
    buildings: [],
  });
  const h = makeStuffAtPath(() => new HoldingWarren(), '/world/_t/farmstead');
  h.setBlueprint('/world/_t/farmstead-blueprint');
  h.setPersistenceKey('/world/_t/valley/lots/lot-2', true);
  return h;
}

describe('a holding\'s layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ open ground is the workable area less the blueprint\'s footprint', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(16000);
    expect(await farm().openGroundM2()).toBe(16000 - 550);
  });

  it('unmeasured ground has no open ground to share', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(0);
    expect(await farm().openGroundM2()).toBe(0);
  });

  it('a mirror axis outside the two is none', () => {
    const h = farm();
    h.setMirrorAxis('east-west');
    expect(h.getMirrorAxis()).toBe('east-west');
    h.setMirrorAxis(null);
    expect(h.getMirrorAxis()).toBe('');
  });
});

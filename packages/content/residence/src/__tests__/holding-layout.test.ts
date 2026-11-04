/**
 * A holding's LAYOUT as data (tracts build D27, D31; harbors review 3):
 * the open ground its tracts share is the parcel's workable area less the
 * ground its plan's buildings cover (the programme's own `footprintM2` —
 * no blueprint row).
 * A tract's share is the tract row's own field (trade-farming's
 * tract-sizing suite); a mirrored copy's ways and cells are the kernel's
 * (`FloorplanWarren.test`).
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import HoldingWarren from '../idea/HoldingWarren';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

function farm(): HoldingWarren {
  const h = makeStuffAtPath(() => new HoldingWarren(), '/world/_t/farmstead');
  h.setExtent('/world/_t/farmstead');
  h.setEntrance('/world/_t/farmstead/yard');
  h.setFootprintM2(550);
  h.setPersistenceKey('/world/_t/valley/lots/lot-2', true);
  return h;
}

describe('a holding\'s layout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ open ground is the workable area less the plan\'s footprint', async () => {
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

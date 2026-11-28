/**
 * ⭐ Under the ice (river D16): a patch carried into a frozen stretch has
 * the sheet over the head of whoever is in it — no air, and no way up.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import ReachPatch from '../ReachPatch';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

afterEach(() => vi.restoreAllMocks());

function patchWithIce(thicknessM: number): ReachPatch {
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(1000, 's'));
  const cat = {
    lineOfSync: () => ({ stretchAt: () => ({ id: 'kestrel:5', kind: 'pool', flow: 'pool', banks: {} }) }),
    iceAtSync: () => ({ thicknessM }),
  };
  vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((p: string) =>
    p.endsWith('WatercourseCatalogue') ? cat : null) as never);
  const patch = makeStuff(() => new ReachPatch());
  patch.placeOnLine('/stuff/idea/Watercourse/kestrel', { course: 'kestrel', km: 5, across: 20 });
  return patch;
}

describe('a patch under the ice (river D16)', () => {
  it('⭐ the sheet is over your head: no air, and no way up', () => {
    const p = patchWithIce(0.12);
    const body = { stuffId: 'b' } as unknown as Stuff;
    expect(p.headOutAt(body)).toBe(false);
    expect(p.mediumFor(body).atSurface).toBe(false);
    const up = p.wayUp();
    expect('reason' in up && up.reason).toBe('under-ice');
  });

  it('open water: your head is out', () => {
    const p = patchWithIce(0);
    expect(p.headOutAt({} as Stuff)).toBe(true);
  });
});

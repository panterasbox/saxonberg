/**
 * Moving water's zones are copies (zone-instancing B2, D13): a reach
 * patch's zone is a copy of its kind's zone row, minted by the reach
 * warren under the row, declared by the row's `mintedBy`, joined to a
 * FRAME — so it is put to sleep with its place and never recorded in the
 * location graph.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuffAtPath, seedKernelContentStore } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import ReachWarren from '../idea/ReachWarren';

const WARREN = '/system/water/idea/ReachWarren';
const PATCH_ZONE = '/system/water/location/reach/patch';

function seed(mintedBy: string = WARREN): void {
  seedKernelContentStore([
    { path: '/system', class: '/platform/idea/FolderZone', data: {} },
    { path: WARREN, class: WARREN, data: { zoneNaming: 'under-row', joins: 'frame' } },
    { path: PATCH_ZONE, class: '/system/water/location/ReachZone', data: { name: 'the river', cellSize: 100, mintedBy } },
  ]);
}

function warren(): ReachWarren {
  const w = makeStuffAtPath(() => new ReachWarren(), WARREN);
  w.setZoneNaming('under-row');
  w.setJoins('frame');
  return w;
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('moving water: a patch’s zone is a copy (zone-instancing B2)', () => {
  it('⭐ minted under its kind’s row, a moving zone, declared by the row', async () => {
    seed();
    const w = warren();
    const zone = await w.wakeCopyZone(PATCH_ZONE, 'kestrel/1');
    expect(zone.getIdentityPath()).toBe(`${PATCH_ZONE}/kestrel/1`);
    expect(zone.getTemplatePath()).toBe(PATCH_ZONE);
    expect(zone.isCopy()).toBe(true);
    expect(MixinApi.isMovingZone(zone)).toBe(true);
    // Two patches, two zones.
    const other = await w.wakeCopyZone(PATCH_ZONE, 'kestrel/2');
    expect(other).not.toBe(zone);
  });

  it('put to sleep with its place: no zone is left', async () => {
    seed();
    const w = warren();
    const zone = await w.wakeCopyZone(PATCH_ZONE, 'kestrel/3');
    w.sleepCopyZone(zone);
    expect(zone.isDestroyed()).toBe(true);
    expect(StuffApi.findByIdentityPath(`${PATCH_ZONE}/kestrel/3`).filter((s) => !s.isDestroyed())).toHaveLength(0);
  });

  it('⭐ a frame copy is never recorded in the location graph', async () => {
    seed();
    const record = vi.spyOn(NavigationApi, 'recordCopy');
    const w = warren();
    const zone = await w.wakeCopyZone(PATCH_ZONE, 'kestrel/4');
    await w.recordCopy(zone, [{ identity: 'x', template: 'y', coords: null, address: '', exits: {} }]);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a zone row its warren does not declare', async () => {
    seed('/system/water/idea/SeaWarren');
    const w = warren();
    await expect(w.wakeCopyZone(PATCH_ZONE, 'kestrel/5')).rejects.toThrow(/copied by '\/system\/water\/idea\/SeaWarren'/);
  });
});

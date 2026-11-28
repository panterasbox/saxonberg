/**
 * MintedZone — a zone row whose instances are copies (zone-instancing
 * A0: D2, D4). A copy is minted under an identity of its own; it reads its
 * own fields from its row and inherits from WHERE ITS IDENTITY IS FILED;
 * the resolver finds a live copy before any row; the row's own instance
 * holds no rooms.
 */
import '../../../../../test-bootstrap';
import { withSaveMany } from '../../../../lib/persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ZoneApi } from '../../../../api/zone';
import { PersistenceManager, Collections } from '../../../../../backend/PersistenceManager';
import MintedZone from '../MintedZone';
import Location from '../../../place/Location';
import type { Zone } from '../../../../lib/zone/Zone';
import type { EvictionContext } from '../../../../lib/stuff/Stuff';
import { makeStuff, EXIT_KIND_TEST_ROWS } from '../../../../lib/security/__tests__/test-setup';

type Doc = Record<string, unknown> & { _id?: string; path: string; class: string; data: Record<string, unknown> };

const PROGRAMME = '/realm/plan/idea/programme';

function installRows(): void {
  const store: Doc[] = [
    ...(EXIT_KIND_TEST_ROWS as unknown as Doc[]),
    { path: '/realm', class: '/platform/idea/FolderZone', data: {} },
    // Where the copies stand: a plat of lots.
    { path: '/realm/plat', class: '/platform/idea/place/CartesianZone', data: {} },
    // Where the plan is FILED — its parents must never be inherited by a
    // copy standing in the world.
    { path: '/realm/plan', class: '/platform/idea/FolderZone', data: {} },
    {
      path: '/realm/plan/house',
      class: '/platform/idea/place/MintedZone',
      data: { name: 'the house', cellSize: 6, mintedBy: PROGRAMME },
    },
  ].map((d, i) => ({ ...d, _id: String(i + 1) }));
  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    if (typeof query.path === 'string') return store.filter((d) => d.path === query.path);
    return store.slice();
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(withSaveMany({
    save: vi.fn(async () => 'x'),
    find,
  }) as unknown as PersistenceManager);
}

async function mintCopy(identity: string): Promise<MintedZone> {
  return StuffApi.clone<MintedZone>('/realm/plan/house', undefined, { asIdentityPath: identity });
}

beforeEach(() => {
  StuffApi.clearAll();
  installRows();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('MintedZone — a copy is a zone of its own (zone-instancing A0)', () => {
  it('hydrates its own fields from its row and knows it is a copy', async () => {
    const copy = await mintCopy('/realm/plat/lot-7');
    expect(copy).toBeInstanceOf(MintedZone);
    expect(copy.isCopy()).toBe(true);
    expect(copy.getIdentityPath()).toBe('/realm/plat/lot-7');
    expect(copy.getTemplatePath()).toBe('/realm/plan/house');
    expect(copy.getCellSize()).toBe(6);
    expect(copy.getMintedBy()).toBe(PROGRAMME);
    const row = await StuffApi.singleton<MintedZone>('/realm/plan/house');
    expect(row.isCopy()).toBe(false);
    expect(row).not.toBe(copy);
  });

  it('⭐ a copy filed in the world inherits from where it stands, never from its row’s parents', async () => {
    const plat = await StuffApi.singleton<Zone>('/realm/plat');
    (plat as unknown as Record<string, unknown>).biome = 'the lot’s';
    const plan = await StuffApi.singleton<Zone>('/realm/plan');
    (plan as unknown as Record<string, unknown>).biome = 'the plan folder’s';
    const copy = await mintCopy('/realm/plat/lot-7');
    expect(await copy.lookupField<string>('biome')).toBe('the lot’s');
    expect(copy.peekField<string>('biome')).toBe('the lot’s');
  });

  it('a copy filed under its row inherits the row’s chain (a ship’s own settings come from her kind)', async () => {
    const plan = await StuffApi.singleton<Zone>('/realm/plan');
    (plan as unknown as Record<string, unknown>).biome = 'the kind’s';
    await StuffApi.singleton<MintedZone>('/realm/plan/house');
    const copy = await mintCopy('/realm/plan/house/serial-1');
    expect(await copy.lookupField<string>('biome')).toBe('the kind’s');
    expect(copy.peekField<string>('biome')).toBe('the kind’s');
  });

  it('⭐ the resolver finds a live copy beneath its identity, and the row zone once it is gone', async () => {
    const copy = await mintCopy('/realm/plat/lot-7');
    expect(await ZoneApi.resolveZoneForPath('/realm/plat/lot-7/yard')).toBe(copy);
    expect(await ZoneApi.resolveZoneForPath('/realm/plat/lot-7')).toBeNull();
    expect(await ZoneApi.resolveEnclosingZoneForPath('/realm/plat/lot-7')).toBe(copy);
    await StuffApi.destruct(copy);
    const plat = await StuffApi.singleton<Zone>('/realm/plat');
    expect(await ZoneApi.resolveZoneForPath('/realm/plat/lot-7/yard')).toBe(plat);
  });

  it('two copies of one row are two zones', async () => {
    const a = await mintCopy('/realm/plat/lot-7');
    const b = await mintCopy('/realm/plat/lot-8');
    expect(a).not.toBe(b);
    expect(await ZoneApi.resolveZoneForPath('/realm/plat/lot-7/yard')).toBe(a);
    expect(await ZoneApi.resolveZoneForPath('/realm/plat/lot-8/yard')).toBe(b);
  });

  it('⭐ the row’s own instance refuses a room; a copy takes one and is kept while it holds it', async () => {
    const row = await StuffApi.singleton<MintedZone>('/realm/plan/house');
    const copy = await mintCopy('/realm/plat/lot-7');
    const room = makeStuff(() => new Location()) as Location;
    expect(() => row.addLocation(room, 0, 0, 0)).toThrow(/copied by '\/realm\/plan\/idea\/programme'.*never the row/);
    copy.addLocation(room, 1, 2, 0);
    expect(room.getZone()).toBe(copy);
    expect(copy.hasRoomAt(1, 2, 0, room)).toBe(true);
    expect(copy.canEvict({} as EvictionContext).ok).toBe(false);
    copy.removeLocation(room);
    expect(copy.canEvict({} as EvictionContext).ok).toBe(true);
  });
});

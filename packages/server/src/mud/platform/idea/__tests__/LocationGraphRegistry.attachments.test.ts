/**
 * ⭐⭐ What is ATTACHED to a place (the scan sweep, 2026-10-14) — derived by
 * the location graph's projection from references the content already
 * authors, pointing AT the place, and read as a map lookup up the place's
 * ancestry. Nothing is written twice (`stands:` retired) and nothing is
 * searched at read time.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { NavigationApi } from '../../../api/navigation';
import { ParcelApi } from '../../../api/parcel';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import LocationGraphRegistry from '../LocationGraphRegistry';
import { makeStuffAtPath, seedKernelContentStore } from '../../../lib/security/__tests__/test-setup';

const T = '/test/att';

beforeEach(() => {
  StuffApi.clearAll();
  seedKernelContentStore([
    { path: T, class: '/platform/idea/location/CartesianZone', data: {} },
    // A shop: the house names its COUNTER; the room props the counter.
    { path: `${T}/shop`, class: '/platform/location/SingletonCartesianLocation', data: { props: [`${T}/counter`] } },
    { path: `${T}/counter`, class: '/platform/thing/Thing', data: {} },
    { path: `${T}/idea/house`, class: '/platform/idea/Business', data: { operatingLocations: [`${T}/counter`] } },
    // A yard the house names directly.
    { path: `${T}/yard`, class: '/platform/location/SingletonCartesianLocation', data: {} },
    { path: `${T}/idea/farm`, class: '/platform/idea/Business', data: { operatingLocations: [`${T}/yard`] } },
    // A tower over the district, a ship on a sea.
    { path: `${T}/tower`, class: '/platform/idea/Structure', data: { extent: T } },
    { path: `${T}/ship`, class: '/platform/idea/Ship', data: { extent: `${T}/ship`, expanse: '/test/sea' } },
    // An institution over an extent.
    { path: `${T}/idea/warren`, class: '/platform/idea/Business', data: { parentExtent: `${T}/lots` } },
    // A fixture that seats itself in a warren a ROOM names.
    { path: `${T}/lounge`, class: '/platform/location/SingletonCartesianLocation', data: { warren: `${T}/idea/lounge-warren` } },
    { path: `${T}/idea/lounge-warren`, class: '/platform/idea/Business', data: {} },
    { path: `${T}/rack`, class: '/platform/thing/Thing', data: { seatIn: `${T}/idea/lounge-warren` } },
    // A guard cast in the yard, standing for an institution.
    { path: `${T}/guard`, class: '/platform/agent/Extra', data: { institution: `${T}/idea/watch` } },
    { path: `${T}/gate`, class: '/platform/location/SingletonCartesianLocation', data: { cast: [`${T}/guard`] } },
  ]);
  const real = PersistenceManager.get() as unknown as {
    save(c: string, d: Record<string, unknown>): Promise<string>;
    find(c: string, q: Record<string, unknown>, o?: unknown): Promise<Array<Record<string, unknown>>>;
    findById(c: string, id: string): Promise<unknown>;
    delete(c: string, id: string): Promise<void>;
  };
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    save: async (c: string, d: Record<string, unknown>) => (c === 'location_graph' ? 'id' : real.save(c, d)),
    find: async (c: string, q: Record<string, unknown>, o?: unknown) => (c === 'location_graph' ? [] : real.find(c, q, o)),
    findById: async (c: string, id: string) => real.findById(c, id),
    delete: async (c: string, id: string) => (c === 'location_graph' ? undefined : real.delete(c, id)),
  } as unknown as PersistenceManager);
  vi.spyOn(ParcelApi, 'coveringParcelOfSync').mockReturnValue(null);
  makeStuffAtPath(() => new LocationGraphRegistry(), '/platform/idea/LocationGraphRegistry');
});

afterEach(() => vi.restoreAllMocks());

describe('the location graph attaches what belongs with a place', () => {
  it('⭐⭐ loadPlaced loads a counter BY ITS ROOM — one counter, never a second the room mints later', async () => {
    const counter = await NavigationApi.loadPlaced(`${T}/counter`);
    expect(counter).not.toBeNull();
    expect(StuffApi.findByTemplatePath(`${T}/shop`)).toBeTruthy();
    // Again, and the room again: the same counter, and the path still
    // resolves to exactly one (findByTemplatePath throws on two).
    expect(await NavigationApi.loadPlaced(`${T}/counter`)).toBe(counter);
    await StuffApi.singleton(`${T}/shop`);
    expect(StuffApi.findByTemplatePath(`${T}/counter`)).toBe(counter);
  });

  it('⚠ the defect it prevents: a counter cloned on its own, then its room, is TWO counters', async () => {
    await StuffApi.singleton(`${T}/counter`);
    await StuffApi.singleton(`${T}/shop`);
    expect(() => StuffApi.findByTemplatePath(`${T}/counter`)).toThrow();
  });

  it('a thing nothing places is stood up on its own', async () => {
    expect(await NavigationApi.loadPlaced(`${T}/idea/farm`)).not.toBeNull();
  });

  it('⭐ a house is attached to the ROOM its counter stands in — the house named the counter, nobody named the house', async () => {
    expect(await NavigationApi.attachedTo(`${T}/shop`, 'house')).toEqual([`${T}/idea/house`]);
    expect(await NavigationApi.attachedTo(`${T}/yard`, 'house')).toEqual([`${T}/idea/farm`]);
  });

  it('⭐ a structure is attached at its extent, so every room under it reads it', async () => {
    expect(await NavigationApi.attachedTo(`${T}/shop`, 'structure')).toContain(`${T}/tower`);
    expect(await NavigationApi.attachedWithin(T, 'structure')).toEqual(
      expect.arrayContaining([`${T}/tower`, `${T}/ship`]),
    );
  });

  it('a ship is attached to its sea as craft', async () => {
    expect(await NavigationApi.attachedTo('/test/sea', 'craft')).toEqual([`${T}/ship`]);
  });

  it('an institution is attached at its parent extent, read up a key\'s ancestry', async () => {
    expect(await NavigationApi.attachedTo(`${T}/lots/lot-1/yard`, 'institution')).toEqual([`${T}/idea/warren`]);
  });

  it('⭐ a fixture that seats in a warren is attached to the room that names the warren', async () => {
    expect(await NavigationApi.attachedTo(`${T}/lounge`, 'fixture')).toEqual([`${T}/rack`]);
  });

  it('an agent\'s institution is attached to the room the agent is cast in', async () => {
    expect(await NavigationApi.attachedTo(`${T}/gate`, 'institution')).toEqual([`${T}/idea/watch`]);
  });

  it('a place nothing points at has nothing attached — and the sync read agrees once derived', async () => {
    expect(await NavigationApi.attachedTo('/test/elsewhere')).toEqual([]);
    expect(NavigationApi.attachedNow(`${T}/yard`, 'house')).toEqual([`${T}/idea/farm`]);
  });
});

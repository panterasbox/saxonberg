/**
 * ⭐ A farm's tract is one copy of a layout (tracts build D27, D28): its
 * holding wakes it, and it sizes itself as its share of the holding's
 * open ground, on a spot of the soil field of its own.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Tract from '../location/Tract';
import HoldingWarren from '@saxonberg/content-residence/src/idea/HoldingWarren';
import { Blueprint } from '@saxonberg/server/mud/lib/location/Blueprint';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import GroundCharacter from '@saxonberg/content-ground/src/idea/GroundCharacter';
import { SOIL_MOISTURE_RESERVE_KEY } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';

const LOT = '/world/_t/valley/lots/lot-1';

function holding(): HoldingWarren {
  const h = makeStuffAtPath(() => new HoldingWarren(), '/world/_t/farmstead');
  // ⭐ Its blueprint (harbors review 3): the yard's 400 m² is the
  // Structure's footprint; the tract's share is its own row's field.
  vi.spyOn(Blueprint.prototype, 'load').mockResolvedValue({
    path: '/world/_t/farmstead-blueprint',
    extent: '/world/_t/farm',
    entrance: '/world/_t/farm/yard',
    footprintM2: 400,
    rooms: [],
    buildings: [],
  });
  h.setBlueprint('/world/_t/farmstead-blueprint');
  h.setPersistenceKey(LOT, true);
  return h;
}

function copyOn(h: HoldingWarren, lot = LOT): Tract {
  const t = makeStuffAtPath(() => new Tract(), '/trade/farming/location/tract');
  h.addMember(t as never);
  t.setPersistenceKey(`${lot}/bench`, true);
  t.setShare(0.3);
  return t;
}

describe('a tract woken by its holding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ is its share of the open ground, with soil of its own', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(16000);
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    vi.spyOn(GroundCharacter, 'forZone').mockResolvedValue(null);
    const t = copyOn(holding());
    await t.onWarrenWake();
    expect(t.getAreaM2()).toBeCloseTo(0.3 * 15600, 6);
    expect(t.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(true);
    expect(t.getFields()).toHaveLength(0);
  });

  it('two copies of one layout stand on two different spots', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(16000);
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    vi.spyOn(GroundCharacter, 'forZone').mockResolvedValue(null);
    const a = copyOn(holding());
    await a.onWarrenWake();
    const spotA = a.getGroundSpot();
    StuffApi.clearAll();
    const b = copyOn(holding(), '/world/_t/valley/lots/lot-2');
    await b.onWarrenWake();
    expect(b.getGroundSpot()).not.toEqual(spotA);
  });

  it('unmeasured ground gives a tract of nothing', async () => {
    vi.spyOn(ParcelApi, 'workableAreaOf').mockResolvedValue(0);
    vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
    vi.spyOn(GroundCharacter, 'forZone').mockResolvedValue(null);
    const t = copyOn(holding());
    await t.onWarrenWake();
    expect(t.getAreaM2()).toBe(0);
    expect(t.hasReserve(SOIL_MOISTURE_RESERVE_KEY)).toBe(false);
  });
});

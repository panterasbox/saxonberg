/**
 * WaterStore — the household's water between fills (water-supply D5/D25).
 *
 * ⭐ Its level IS its interior bulk; it fills from the rain on its roof over
 * any gap on the next read (an unresolved place never reads as a dry month);
 * a draw takes from the level; a premises may cite it as a supply.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaterStore from '../WaterStore';
import Location from '../../location/Location';
import Material from '../../../lib/material/Material';
import { StuffApi } from '../../../api/stuff';
import { WeatherApi } from '../../../api/weather';
import { AddressApi } from '../../../api/address';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

const DAY = 86_400;
let now = 100 * DAY;

function butt(): WaterStore {
  const water = makeStuffAtPath(() => {
    const m = new Material();
    m.setName('water');
    return m;
  }, '/stuff/idea/material/bulk/water') as unknown as Material;
  const s = makeStuff(() => {
    const b = new WaterStore();
    b.interiorBulk = true;
    b.setBulkMaterial('interior', water);
    (b as unknown as { interiorCapacity: unknown }).interiorCapacity = Quantity.of(200, 'L');
    b.setFillsFrom('rain');
    b.setCatchmentM2(10);
    b.setInitialLevelL(50);
    return b;
  });
  const room = makeStuffAtPath(() => new Location(), '/test/place/yard') as Location;
  ContainmentApi.move(s, room);
  return s;
}

beforeEach(() => {
  StuffApi.clearAll();
  now = 100 * DAY;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  vi.spyOn(AddressApi, 'resolveLocalityFor').mockResolvedValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function rain(mm: number): void {
  vi.spyOn(WeatherApi, 'precipitationBetween').mockReturnValue({
    liquid: Quantity.of(mm, 'mm'),
    frozen: Quantity.of(0, 'mm'),
  } as never);
}

describe('⭐ a rain store fills from its roof', () => {
  it('the first read stands it at its authored level', async () => {
    rain(0);
    const b = butt();
    await b.settleBulk('interior');
    expect(b.levelL()).toBe(50);
  });

  it('mm of rain × m² of roof = litres, over the gap nobody watched', async () => {
    rain(0);
    const b = butt();
    await b.settleBulk('interior');
    rain(6);
    now += 3 * DAY;
    await b.settleBulk('interior');
    expect(b.levelL()).toBe(50 + 60);
  });

  it('it brims and spills — never above its capacity', async () => {
    rain(0);
    const b = butt();
    await b.settleBulk('interior');
    rain(100);
    now += DAY;
    await b.settleBulk('interior');
    expect(b.levelL()).toBe(200);
  });
});

describe('a store as a supply', () => {
  it('a draw takes from the level, and an empty store reads dry', async () => {
    rain(0);
    const b = butt();
    await b.settleBulk('interior');
    expect(b.drawL(30)).toBe(30);
    expect(b.availableL()).toBe(20);
    expect(b.drawL(30)).toBe(20);
    expect(b.supplyStateNow()).toBe('dry');
    expect(await b.shareFor('residential')).toBe(1);
  });

  it('the report says what fills it', async () => {
    rain(0);
    const report = await butt().supplyReport(now);
    expect(report.lines.join(' ')).toContain('fills from the rain on 10 m² of roof');
  });
});

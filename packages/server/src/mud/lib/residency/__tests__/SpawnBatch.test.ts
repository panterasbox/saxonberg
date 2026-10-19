/**
 * **One sweep stands a region at target** (libations 1f).
 *
 * The shipped sweep drew ONE item per region per sweep — a trickle that
 * could never stand a producer's floor at target on a fresh boot. This
 * covers the two changes that make it a faucet: the per-region
 * draw-until-decline loop (capped by `residency.spawn.perRegionCap`),
 * and the TEMPLATE-derived candidate set — a row with an authored
 * `censusKey` + home `container:` is drawable before any instance of it
 * exists, and is drawn only for the region its container lives in.
 *
 * Drives the real `ResidencyApi.spawnNow()` with the world's edges
 * stubbed: the mode + cap dials, the template query, the clone, the
 * class-composition check and the zone lookup.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResidencyApi } from '../../../api/residency';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { AppApi } from '../../../api/app';
import { ZoneApi } from '../../../api/zone';
import { ContainmentApi } from '../../../api/containment';
import { AppSettingKeys } from '../../config/AppSettings';
import { Template } from '../../stuff/Template';
import { CirculatingMixin } from '../Circulating';
import Good from '../../stuff/Good';
import Locale from '../../../platform/location/Locale';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestGood extends CirculatingMixin(Good) {}

const REGION = '/test/spawn/spawn-batch-zone';
const STOCK = '/test/spawn/spawn-batch-zone/thing/stock';

let room: Locale;
let settings: Record<string, string>;

/**
 * A row that says it appears from nothing: authored key and target, no
 * live instance. (A row no longer names a home — `container:` is
 * runtime-only since the scan sweep's review.)
 */
function row(path: string, censusKey: string, regionTarget: number) {
  return {
    path,
    class: '/platform/thing/TestGood',
    data: { censusKey, regionTarget },
  } as unknown as Template;
}

describe('the spawn sweep — draw until the region declines', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    settings = {
      [AppSettingKeys.residencySpawnMode]: 'enforce',
      [AppSettingKeys.residencySpawnPerRegionCap]: '64',
    };
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) => settings[key] ?? '');
    // The "stock counter" the rows name — a live room the mints land in,
    // so the census counts them in the row's own region.
    room = makeStuff(() => new Locale());
    stampTemplatePathForTest(room, STOCK);
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue({
      getTemplatePath: () => REGION,
      lookupField: async () => undefined,
    } as never);
    vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(TestGood);
    // The region exists because something circulates in it: the census
    // is taken over live stock, and a region nothing stands in is never
    // drawn for. One seed good, its own target already met.
    const seed = makeStuff(() => new TestGood());
    stampTemplatePathForTest(seed, '/test/spawn/thing/seed');
    seed.setCensusKey('seed');
    seed.regionTarget = 0;
    ContainmentApi.move(seed as never, room as never);
    vi.spyOn(Template, 'findWhereDataHas').mockResolvedValue([
      row('/test/spawn/thing/ale', 'keg:ale', 2),
      row('/test/spawn/thing/gin', 'spirit:gin', 3),
      row('/test/spawn/thing/volk', 'spirit:vodka', 4),
    ]);
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      const g = makeStuff(() => new TestGood());
      stampTemplatePathForTest(g, path);
      const key =
        { ale: 'keg:ale', gin: 'spirit:gin', volk: 'spirit:vodka', stray: 'stray' }[
          path.split('/').pop()!
        ] ?? path;
      g.setCensusKey(key);
      g.regionTarget = 99;
      // Placed by the test, so the census counts it in the region: the
      // sweep itself places nothing.
      ContainmentApi.move(g as never, room as never);
      return g as unknown as Stuff;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  function countOf(key: string): number {
    return (room.getContents() as Stuff[]).filter(
      (s) => (s as TestGood).getCensusKey() === key,
    ).length;
  }

  it('a fresh world reaches every row’s target in ONE sweep, and places nothing on the next', async () => {
    const first = await ResidencyApi.spawnNow();
    expect(first.placed).toBe(2 + 3 + 4);
    expect(countOf('keg:ale')).toBe(2);
    expect(countOf('spirit:gin')).toBe(3);
    expect(countOf('spirit:vodka')).toBe(4);
    // The region declined exactly once — at the end of its loop.
    expect(first.declined).toBe(1);

    const second = await ResidencyApi.spawnNow();
    expect(second.placed).toBe(0);
    expect(second.declined).toBe(1);
  });

  it('the per-region cap holds', async () => {
    settings[AppSettingKeys.residencySpawnPerRegionCap] = '5';
    const report = await ResidencyApi.spawnNow();
    expect(report.placed).toBe(5);
    // Capped, not declined: the region still wants more.
    expect(report.declined).toBe(0);
  });

  it('observe mode reports and places nothing', async () => {
    settings[AppSettingKeys.residencySpawnMode] = 'observe';
    const report = await ResidencyApi.spawnNow();
    expect(report.placed).toBe(0);
    expect(room.getContents().length).toBe(1); // the seed alone
  });
});

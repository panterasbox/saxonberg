/**
 * **The spawn sweep stamps a band on what it mints.**
 *
 * The unit behaviour lives in `magic/__tests__/BlessingOdds.test.ts`;
 * this covers the two lines of *wiring* in `ResidencyLogic` that a unit
 * test cannot see — that the sweep calls the roll on the freshly cloned
 * object at all, and that it hands over the zone's table rather than the
 * item's when the place declares one.
 *
 * Drives the real `ResidencyApi.spawnNow()`, with the world's edges
 * stubbed: the mode dial (which fails safe to `observe`), the clone, and
 * the zone lookup.
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
import { CirculatingMixin } from '../Circulating';
import { BlessableMixin } from '../../magic/Blessable';
import { ArcaneMixin } from '../../magic/Arcane';
import Thing from '../../stuff/Thing';
import Room from '../../../obj/location/Room';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** The wand shape: circulating, blessable, with an effect axis. */
class TestWand extends CirculatingMixin(
  BlessableMixin(ArcaneMixin(Thing)),
) {}

const WAND_PATH = '/obj/test/spawn-wand';

let seq = 0;
let minted: TestWand[] = [];

/** A seed instance so `collectSpawnCandidates` has something to find. */
function seedCirculatingWand(): TestWand {
  const w = makeStuffAtPath(() => new TestWand(), WAND_PATH);
  w.setCensusKey('wand');
  w.setMaterialTags(['wood']);
  w.setCarriedSpellPath('/obj/magic/Spell/firebolt');
  // Below target, so the table always has something eligible to place.
  w.regionTarget = 99;
  w.setBlessingOdds({ blessed: 1 });
  return w;
}

describe('the spawn sweep stamps a BUC band on what it mints', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    minted = [];
    // The sweep fails safe to `observe` and places nothing; this is the
    // only way to see the mint path at all.
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === AppSettingKeys.residencySpawnMode ? 'enforce' : '',
    );
    // Every clone hands back a fresh wand we keep a handle on.
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => {
      const w = makeStuff(() => new TestWand());
      stampTemplatePathForTest(w, `${WAND_PATH}-minted-${seq++}`);
      w.setCensusKey('wand');
      w.setBlessingOdds({ blessed: 1 });
      minted.push(w);
      return w as unknown as Stuff;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  /** A live room so the census has a region to count in. */
  function worldWithAWand(): void {
    const room = makeStuff(() => new Room());
    stampTemplatePathForTest(room, `/world/test/spawn-room-${seq++}`);
    const wand = seedCirculatingWand();
    ContainmentApi.move(wand as never, room as never);
  }

  it('rolls the ITEM’s odds when the place declares none', async () => {
    worldWithAWand();
    // A zone that exists (so the census has a real region) but declares
    // no fields — the un-authored place, which must leave every item on
    // its own baseline.
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue({
      getTemplatePath: () => '/obj/zone/test-region',
      lookupField: async () => undefined,
    } as never);

    const report = await ResidencyApi.spawnNow();
    expect(report.placed).toBeGreaterThan(0);
    expect(minted.length).toBeGreaterThan(0);
    // `{blessed: 1}` is the item's own table, so every mint is blessed —
    // proving the sweep calls the roll at all rather than leaving the
    // clone at its authored default.
    for (const w of minted) expect(w.getBlessingBand()).toBe('blessed');
  });

  it('a ZONE’s table overrides the item’s, world-wide in that place', async () => {
    worldWithAWand();
    // "This place is like that" — the delve that curses what it spawns.
    vi.spyOn(ZoneApi, 'resolveZoneForPath').mockResolvedValue({
      // ⚠ `getTemplatePath` is load-bearing: `Census.regionOf` reads it
      // to name the region, and without it the region is UNPLACED and
      // `regionStockFor` never consults the zone at all — which is how
      // the first draft of this test silently passed the wrong thing.
      getTemplatePath: () => '/obj/zone/test-region',
      lookupField: async (name: string) =>
        name === 'blessingOdds' ? { cursed: 1 } : undefined,
    } as never);

    const report = await ResidencyApi.spawnNow();
    expect(report.placed).toBeGreaterThan(0);
    // The item declares `{blessed: 1}`; the zone wins wholesale.
    for (const w of minted) expect(w.getBlessingBand()).toBe('cursed');
  });
});

/**
 * check-location-classes' pure decision core: two enumerated rosters over
 * the shipped rows' `class:`.
 *
 * The `FurnishableRoom` half asks *does a player furnish this?* — that
 * class carries a persistence record, so a room nobody furnishes was
 * getting `holder_snapshots` writes nothing read back.
 *
 * The `CartesianLocation` half is the cross-branch trap: the name used to
 * be `Room` and used to carry `SingletonMixin`, so the same string means
 * opposite things depending on which branch a row came from, and a
 * textually clean merge would strip the singleton guard in silence.
 */

import { describe, it, expect } from 'vitest';
import {
  classify,
  classifyMinted,
  orphanedZones,
  sameZoneNamedExits,
  unzonedCoords,
  type Row,
} from '../check-location-classes';

const FURNISHABLE = '/platform/location/FurnishableRoom';
const MINTED = '/platform/location/CartesianLocation';
const SINGLETON = '/platform/location/SingletonCartesianLocation';

/** The real roster entries the script ships, used as the "listed" cases. */
const A_FURNISHED = 'generic-objects/content/stuff/location/room/bedroom.yaml';
const A_MINTED = 'platform/content/platform/location/venue.yaml';

const r = (file: string, cls: string): Row => ({
  file,
  cls,
  coords: false,
  exits: [],
});

describe('check-location-classes.classify (FurnishableRoom)', () => {
  it('a rostered row passes', () => {
    const out = classify([r(A_FURNISHED, FURNISHABLE)]);
    expect(out.unexpected).toEqual([]);
  });

  it('an unrostered row on FurnishableRoom is unexpected', () => {
    const out = classify([
      r(A_FURNISHED, FURNISHABLE),
      r('trade-distilling/content/trade/distilling/location/warehouse.yaml', FURNISHABLE),
    ]);
    expect(out.unexpected).toEqual([
      'trade-distilling/content/trade/distilling/location/warehouse.yaml',
    ]);
  });

  it('a rostered row that moved off the class is stale', () => {
    const out = classify([r(A_FURNISHED, SINGLETON)]);
    expect(out.missing).toContain(A_FURNISHED);
  });

  it('ignores rows on every other class', () => {
    const out = classify([r('x.yaml', SINGLETON), r('y.yaml', MINTED)]);
    expect(out.unexpected).toEqual([]);
  });
});

describe('check-location-classes.classifyMinted (the cross-branch trap)', () => {
  it('a rostered KIND passes', () => {
    expect(classifyMinted([r(A_MINTED, MINTED)]).unexpected).toEqual([]);
  });

  /**
   * The case this roster exists for. An authored place arriving from a
   * branch where the class was `Room` + `SingletonMixin` merges cleanly
   * by text and loses its guard; only an enumerated roster notices.
   */
  it('an authored place landing on the permissive class is caught', () => {
    const out = classifyMinted([
      r(A_MINTED, MINTED),
      // Synthetic stand-ins for the real shape: an authored PLACE (a
      // hub, a smithy) arriving on the permissive class. Synthetic
      // rather than the real rows because a kernel test proves the
      // kernel over /test/** fixtures — lint:test-content enforces it.
      r('p/content/test/village/hub.yaml', MINTED),
      r('p/content/test/village/smithy.yaml', MINTED),
    ]);
    expect(out.unexpected).toEqual([
      'p/content/test/village/hub.yaml',
      'p/content/test/village/smithy.yaml',
    ]);
  });

  it('the same places on the SINGLETON class are fine', () => {
    const out = classifyMinted([
      r(A_MINTED, MINTED),
      r('p/content/test/village/hub.yaml', SINGLETON),
    ]);
    expect(out.unexpected).toEqual([]);
  });

  it('a rostered KIND that moved off the class is stale', () => {
    expect(classifyMinted([r(A_MINTED, SINGLETON)]).missing).toContain(A_MINTED);
  });
});

/**
 * A zone governs the sibling directory that shares its name, because
 * `resolveZoneForPath` walks template ancestry. Move that directory and
 * the row survives as a perfectly valid zone over an empty path — while
 * every room that was inside it silently falls back to the enclosing
 * zone, re-arming the non-cardinal throw those boundaries exist to
 * prevent. It happened to `seznick-house/rooms.yaml` when the branch
 * sort moved its rooms to `location/`.
 */
describe('check-location-classes.orphanedZones', () => {
  const ZONE = '/platform/idea/location/CartesianZone';
  const ROOM = '/platform/location/FurnishableRoom';

  it('a zone with rows under it is fine', () => {
    const files = ['p/seznick-house/location.yaml', 'p/seznick-house/location/hall.yaml'];
    const rows = [r('p/seznick-house/location.yaml', ZONE), r('p/seznick-house/location/hall.yaml', ROOM)];
    expect(orphanedZones(rows, files)).toEqual([]);
  });

  it('⭐ a zone whose directory moved out from under it is caught', () => {
    const files = ['p/seznick-house/rooms.yaml', 'p/seznick-house/location/hall.yaml'];
    const rows = [r('p/seznick-house/rooms.yaml', ZONE), r('p/seznick-house/location/hall.yaml', ROOM)];
    expect(orphanedZones(rows, files)).toEqual(['p/seznick-house/rooms']);
  });

  it('a zone governs its whole SUBTREE, not just direct children', () => {
    // The locality zones are all like this after the branch sort: no
    // .yaml sits directly in `duncan-hall/`, only in its branch dirs.
    const files = ['p/w/duncan-hall.yaml', 'p/w/duncan-hall/location/lobby.yaml'];
    const rows = [r('p/w/duncan-hall.yaml', ZONE), r('p/w/duncan-hall/location/lobby.yaml', ROOM)];
    expect(orphanedZones(rows, files)).toEqual([]);
  });

  it('ignores rows that are not zones', () => {
    expect(orphanedZones([r('p/x.yaml', ROOM)], ['p/x.yaml'])).toEqual([]);
  });
});

/**
 * ⭐⭐ The two gates the metal-chain drive added, and — more importantly —
 * **the derivation underneath them.**
 *
 * ⚠⚠ Both checks shipped BROKEN in their first cut, in three separate
 * ways, and every one of them failed the same direction: **silently
 * passing.** A gate that never fires reads exactly like a gate that
 * passes, which is why these tests assert that each one FIRES on a
 * known-bad shape rather than only that a clean tree is clean.
 *
 *   1. the class filters matched on the NAME `CartesianLocation`, so
 *      every pack room was invisible;
 *   2. the extends walk read the first identifier after `extends`, which
 *      for `class X extends WorkingMixin(Base)` is the MIXIN;
 *   3. zones were keyed by pack-relative file stem and rooms by template
 *      path — two path spaces that never meet, so the answer was always
 *      "no zone anywhere".
 */
describe('the coords/named-door gates, and the ancestry they derive', () => {
  const ZONE = { file: 'p/content/world/x.yaml', cls: '/platform/idea/location/CartesianZone', coords: false, exits: [] as Array<[string, string]> };

  it('⚠ a cartesian row with coords and NO covering zone is caught', () => {
    expect(
      unzonedCoords([
        { file: 'p/content/trade/t/location/floor.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: true, exits: [] },
      ]),
    ).toEqual(['p/content/trade/t/location/floor.yaml']);
  });

  it('…and the same row IS fine once a zone covers it', () => {
    expect(
      unzonedCoords([
        { file: 'p/content/trade/t/location.yaml', cls: '/platform/idea/location/CartesianZone', coords: false, exits: [] },
        { file: 'p/content/trade/t/location/floor.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: true, exits: [] },
      ]),
    ).toEqual([]);
  });

  it('⚠ a NON-CARDINAL exit between two rows one zone covers is caught', () => {
    const rows = [
      ZONE,
      { file: 'p/content/world/x/a.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: false, exits: [['out', '/world/x/b']] as Array<[string, string]> },
      { file: 'p/content/world/x/b.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: false, exits: [] as Array<[string, string]> },
    ];
    expect(sameZoneNamedExits(rows)).toHaveLength(1);
    expect(sameZoneNamedExits(rows)[0]).toContain("'out'");
  });

  it('…and a CARDINAL one between the same two is fine', () => {
    expect(
      sameZoneNamedExits([
        ZONE,
        { file: 'p/content/world/x/a.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: false, exits: [['north', '/world/x/b']] },
        { file: 'p/content/world/x/b.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: false, exits: [] },
      ]),
    ).toEqual([]);
  });

  it('⭐⭐ a PACK room class is seen — the derivation walks THROUGH the mixin call', () => {
    // `AuthoredWorking extends WorkingMixin(SingletonCartesianLocation)`.
    // Reading the first identifier after `extends` yields `WorkingMixin`
    // and the row goes uninspected; every candidate in the clause has to
    // be resolved.
    const rows = [
      ZONE,
      { file: 'p/content/world/x/a.yaml', cls: '/trade/mining/location/AuthoredWorking', coords: false, exits: [['out', '/world/x/b']] as Array<[string, string]> },
      { file: 'p/content/world/x/b.yaml', cls: '/trade/mining/location/MineRoom', coords: false, exits: [] as Array<[string, string]> },
    ];
    expect(sameZoneNamedExits(rows)).toHaveLength(1);
  });

  it("⭐⭐ a PACK zone class is seen too — a pack must never need a kernel list edit", () => {
    // `trade-mining`'s `MineZone` carries the `deposit:` field, because a
    // pack cannot add a field to a kernel class. An enumerated ZONES list
    // would have stopped seeing it, and every check here would have gone
    // quiet over the mine.
    expect(
      sameZoneNamedExits([
        { file: 'p/content/world/x.yaml', cls: '/trade/mining/idea/MineZone', coords: false, exits: [] },
        { file: 'p/content/world/x/a.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: false, exits: [['out', '/world/x/b']] },
        { file: 'p/content/world/x/b.yaml', cls: '/platform/location/SingletonCartesianLocation', coords: false, exits: [] },
      ]),
    ).toHaveLength(1);
  });
});

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
  type Row,
} from '../check-location-classes';

const FURNISHABLE = '/platform/location/FurnishableRoom';
const MINTED = '/platform/location/CartesianLocation';
const SINGLETON = '/platform/location/SingletonCartesianLocation';

/** The real roster entries the script ships, used as the "listed" cases. */
const A_FURNISHED = 'generic-objects/content/stuff/location/room/bedroom.yaml';
const A_MINTED = 'platform/content/platform/location/venue.yaml';

const r = (file: string, cls: string): Row => ({ file, cls });

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

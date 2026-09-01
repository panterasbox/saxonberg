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
import { classify, classifyMinted, type Row } from '../check-location-classes';

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
      r('newbie-wilds/content/world/newbie-wilds/crossroads/hub.yaml', MINTED),
      r('hearthworks/content/world/hearthworks/location/smithy.yaml', MINTED),
    ]);
    expect(out.unexpected).toEqual([
      'hearthworks/content/world/hearthworks/location/smithy.yaml',
      'newbie-wilds/content/world/newbie-wilds/crossroads/hub.yaml',
    ]);
  });

  it('the same places on the SINGLETON class are fine', () => {
    const out = classifyMinted([
      r(A_MINTED, MINTED),
      r('newbie-wilds/content/world/newbie-wilds/crossroads/hub.yaml', SINGLETON),
    ]);
    expect(out.unexpected).toEqual([]);
  });

  it('a rostered KIND that moved off the class is stale', () => {
    expect(classifyMinted([r(A_MINTED, SINGLETON)]).missing).toContain(A_MINTED);
  });
});

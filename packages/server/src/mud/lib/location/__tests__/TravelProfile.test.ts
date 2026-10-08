/**
 * TravelProfile — the admission rule, over plain data.
 *
 * ⚠⚠ This is a **second copy** of `Exit.allowsMode` + `isWheelPassable`,
 * and the only defence against a second copy is that it is checked
 * against the thing it mirrors. These cases are written from the
 * original's branches, one per branch, including the one that reads
 * backwards until you know why: **an empty `media` list is not
 * "admits everything"** — it is the ground pace family and nothing
 * else, because that is what an unauthored corridor means.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { TravelProfile, OmnivorousTravelProfile } from '../TravelProfile';

const onFoot = new TravelProfile({ mode: 'walk', medium: 'ground' });
const sneaking = new TravelProfile({ mode: 'sneak', medium: 'ground' });
const running = new TravelProfile({ mode: 'run', medium: 'ground' });
const wagon = new TravelProfile({
  mode: 'wheeled',
  medium: 'ground',
  wheeled: true,
});
const barge = new TravelProfile({ mode: 'sailed', medium: 'water' });
const flying = new TravelProfile({ mode: 'fly', medium: 'air' });

describe('an EMPTY media list is the ground pace family, not everything', () => {
  const corridor = {};

  it('admits walk, sneak and run — anywhere you can walk you can sneak', () => {
    expect(onFoot.admits(corridor)).toBe(true);
    expect(sneaking.admits(corridor)).toBe(true);
    expect(running.admits(corridor)).toBe(true);
  });

  it('⭐ REFUSES a wagon, a barge and a flier', () => {
    // The reading that matters: an unauthored corridor is a corridor,
    // not an open field. A wheeled hauler needs the row to say
    // `media: [ground]` before it may roll down it.
    expect(wagon.admits(corridor)).toBe(false);
    expect(barge.admits(corridor)).toBe(false);
    expect(flying.admits(corridor)).toBe(false);
  });

  it('treats an explicitly empty array the same as an absent one', () => {
    expect(onFoot.admits({ media: [] })).toBe(true);
    expect(wagon.admits({ media: [] })).toBe(false);
  });
});

describe('a stated media list is matched on the MEDIUM, not the mode', () => {
  it('admits every ground mode through a ground way', () => {
    const road = { media: ['ground'] };
    expect(onFoot.admits(road)).toBe(true);
    expect(running.admits(road)).toBe(true);
    expect(wagon.admits(road)).toBe(true);
  });

  it('refuses a walker on water and a barge on a road', () => {
    expect(onFoot.admits({ media: ['water'] })).toBe(false);
    expect(barge.admits({ media: ['ground'] })).toBe(false);
  });

  it('admits either side of a two-medium way — a ford, a slipway', () => {
    const ford = { media: ['ground', 'water'] };
    expect(onFoot.admits(ford)).toBe(true);
    expect(barge.admits(ford)).toBe(true);
  });

  it('refuses a traveller whose medium the caller could not resolve', () => {
    // ⚠ `null` medium is a resolve FAILURE, and failing closed is the
    // only honest answer: a mode nobody could load might be anything.
    const unknown = new TravelProfile({ mode: 'glide', medium: null });
    expect(unknown.admits({ media: ['air'] })).toBe(false);
  });
});

describe('the wheel residue — what media cannot express', () => {
  const stair = { media: ['ground'], wheelPassable: false };

  it('⭐ refuses WHEELS on a stair while admitting feet', () => {
    // A stair, a stile and a turnstile are all `media: [ground]`; the
    // medium cannot tell them from a road.
    expect(wagon.admits(stair)).toBe(false);
    expect(onFoot.admits(stair)).toBe(true);
  });

  it('admits wheels wherever the flag is absent or true', () => {
    expect(wagon.admits({ media: ['ground'] })).toBe(true);
    expect(wagon.admits({ media: ['ground'], wheelPassable: true })).toBe(true);
  });
});

describe('the mode-break profile', () => {
  it('admits every way, so a no-way can be told from a mode break', () => {
    const any = new OmnivorousTravelProfile();
    expect(any.admits({})).toBe(true);
    expect(any.admits({ media: ['water'] })).toBe(true);
    expect(any.admits({ media: ['ground'], wheelPassable: false })).toBe(true);
  });
});

describe('toSpec', () => {
  it('round-trips as plain data — no world object anywhere in it', () => {
    expect(wagon.toSpec()).toEqual({
      mode: 'wheeled',
      medium: 'ground',
      wheeled: true,
    });
    expect(new TravelProfile(wagon.toSpec()).admits({ media: ['ground'] })).toBe(
      true,
    );
  });
});

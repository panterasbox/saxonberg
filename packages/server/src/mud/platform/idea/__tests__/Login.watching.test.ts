/**
 * Arriving watching (stream arrival D4) — the server half.
 *
 * `Login.readWatching` is the one parse `play` and `embody confirm` share:
 * nothing asked → null; a name with exactly one carrier → the words; no
 * carrier, two carriers, a carrier with no name → `watch-needs-carrier`; a
 * malformed name → `no-such-program`. `Avatar.resolveArrival` builds the
 * target from the program's PROVEN feed only while it is on air — field
 * for field what `watch <channel> --<carrier>` writes — and otherwise
 * arrives as usual with a line saying why.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import Login from '../Login';
import Avatar from '../../../lib/character/Avatar';
import { Refusal } from '../../../lib/errors';
import { StreamApi } from '../../../api/stream';
import { MixinApi } from '../../../api/mixin';
import type { ProgramListing } from '@saxonberg/types';

const login = Object.create(Login.prototype) as Login;

describe('Login.readWatching', () => {
  it('nothing asked → null', () => {
    expect(login.readWatching({})).toBeNull();
  });
  it('a name and one carrier → the words, lower-cased', () => {
    expect(login.readWatching({ watch: 'Cafe-Hour', kick: true })).toEqual({ program: 'cafe-hour', carrier: 'kick' });
  });
  it('no carrier, two carriers, or a carrier alone → watch-needs-carrier', () => {
    for (const o of [{ watch: 'cafe-hour' }, { watch: 'cafe-hour', twitch: true, kick: true }, { youtube: true }]) {
      const r = login.readWatching(o);
      expect(r).toBeInstanceOf(Refusal);
      expect((r as Refusal).reason).toBe('watch-needs-carrier');
    }
  });
  it('a malformed name → no-such-program', () => {
    expect((login.readWatching({ watch: 'not a name', twitch: true }) as Refusal).reason).toBe('no-such-program');
  });
});

describe('Avatar.resolveArrival', () => {
  afterEach(() => vi.restoreAllMocks());

  const LIVE: ProgramListing = {
    name: 'cafe-hour',
    title: 'The Cafe Hour',
    live: true,
    feeds: { twitch: 'adaplays', youtube: 'UCada', kick: 'adakick' },
  };

  function run(listing: ProgramListing | null, carrier: 'twitch' | 'youtube' | 'kick') {
    vi.spyOn(MixinApi, 'isSaxonbergClient').mockReturnValue(true as never);
    vi.spyOn(StreamApi, 'programListing').mockResolvedValue(listing);
    const arrived: unknown[] = [];
    const body = { arriveWatching: (t: unknown) => arrived.push(t) };
    const resolve = (Avatar.prototype as unknown as {
      resolveArrival(w: unknown): Promise<{ target: unknown; line: string } | null>;
    }).resolveArrival;
    return resolve.call(body, { program: 'cafe-hour', carrier }).then((r) => ({ r, arrived }));
  }

  it('on air: the target from the proven feed, for each carrier — the shape `watch` writes', async () => {
    expect((await run(LIVE, 'twitch')).arrived).toEqual([{ platform: 'twitch', channel: 'adaplays' }]);
    expect((await run(LIVE, 'kick')).arrived).toEqual([{ platform: 'kick', channel: 'adakick' }]);
    expect((await run(LIVE, 'youtube')).arrived).toEqual([{ platform: 'youtube', channelId: 'UCada' }]);
    expect((await run(LIVE, 'twitch')).r?.line).toMatch(/Watching The Cafe Hour on Twitch — for this visit/);
  });

  it('off air: the usual mode, and a line saying why', async () => {
    const { r, arrived } = await run({ ...LIVE, live: false }, 'twitch');
    expect(arrived).toEqual([null]);
    expect(r?.line).toMatch(/off the air/);
  });

  it('no feed on that carrier (or no program): the usual mode, and the line', async () => {
    const { r, arrived } = await run(null, 'kick');
    expect(arrived).toEqual([null]);
    expect(r?.line).toMatch(/not carried on Kick/);
  });
});

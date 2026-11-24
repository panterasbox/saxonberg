/**
 * StreamLogic — the program (stream arrival A1, D10–D13), driven through
 * the `StreamApi` facade over an in-memory document store (the real
 * `saveProgram` transport and the real catalogue). The actor is staged on
 * the execution context, never passed — exactly how a controller's command
 * frame reaches it.
 *
 * Covers: the name pattern and first-come; the owner defaulting to the
 * creator's home and `--owner` needing the pen; a stranger refused on
 * title / schedule / feed; the feed proof per carrier (no account →
 * `no-linked-account`; the profile's channel, lower-cased, `provenBy`
 * set; a stated channel that differs → `not-your-channel`; YouTube only
 * after the step-up); a committee member attaching their own channel to
 * the committee's program; a guest refused; `saveProgram`'s rails; a
 * program with no feed reads back whole; the catalogue keeps the latest.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamApi } from '../../../../api/stream';
import { DocumentApi } from '../../../../api/document';
import { PlayerApi } from '../../../../api/player';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { StoredDocument } from '../../../../lib/document/StoredDocument';
import { TwitchProfile } from '../../../../lib/identity/TwitchProfile';
import { KickProfile } from '../../../../lib/identity/KickProfile';
import { GoogleProfile } from '../../../../lib/identity/GoogleProfile';
import { StuffApi } from '../../../../api/stuff';
import { MixinApi } from '../../../../api/mixin';
import { AppApi } from '../../../../api/app';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The in-memory document store, by path. */
let store: Map<string, { path: string; kind: string; owner: string; data: Record<string, unknown> }>;

interface FakeUser {
  twitchProfileId?: string;
  kickProfileId?: string;
  googleProfileId?: string;
}

interface FakePlayer {
  key: string;
  name: string;
  guest?: boolean;
  user: FakeUser;
  /** The body's run (D12): the program it cites, and whether it is on air. */
  program?: string | null;
  onAir?: boolean;
  resident?: boolean;
}

/** Who holds which pen: `home/<key>` for each player, plus any extras. */
let pens: Map<string, Set<string>>;
let acting: FakePlayer | null;
const profiles = new Map<string, Record<string, unknown>>();

function avatarOf(p: FakePlayer): unknown {
  return {
    getIsGuest: () => p.guest === true,
    getPlayerId: () => p.key,
    getIdentityPath: () => `/platform/agent/Avatar/${p.key}`,
    getName: () => p.name,
    getPresentation: () => p.name,
    getUser: () => p.user,
    getStreamProgram: () => p.program ?? null,
    setStreamProgram: async (path: string | null) => {
      if (path) await StreamApi.programs().ensure(path);
      p.program = path;
    },
    isOnAir: () => p.onAir === true,
    _key: p.key,
  };
}

const ada: FakePlayer = { key: 'ada', name: 'Ada', user: {} };
const bo: FakePlayer = { key: 'bo', name: 'Bo', user: {} };

function as<T>(p: FakePlayer | null, fn: () => Promise<T>): Promise<T> {
  acting = p;
  return fn();
}

beforeEach(() => {
  store = new Map();
  pens = new Map([
    ['ada', new Set(['/home/ada'])],
    ['bo', new Set(['/home/bo'])],
  ]);
  profiles.clear();
  for (const p of [ada, bo]) {
    p.user = {};
    p.program = null;
    p.onAir = false;
    p.resident = true;
  }
  acting = null;
  StreamApi.programs().forget();

  vi.spyOn(StoredDocument, 'findByPath').mockImplementation(async (path: string) => {
    const row = store.get(path);
    if (!row) return null;
    const doc = new StoredDocument();
    doc.path = row.path;
    doc.kind = row.kind;
    doc.owner = row.owner;
    doc.data = { ...row.data };
    return doc;
  });
  vi.spyOn(StoredDocument.prototype, 'save').mockImplementation(async function (this: StoredDocument) {
    store.set(this.path, {
      path: this.path,
      kind: this.kind,
      owner: this.owner,
      data: JSON.parse(JSON.stringify(this.data)) as Record<string, unknown>,
    });
  });
  vi.spyOn(ExecutionContextApi, 'getActor').mockImplementation(() =>
    acting ? (avatarOf(acting) as never) : null,
  );
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockImplementation(((s: unknown) =>
    !!s && typeof (s as { _key?: unknown })._key === 'string') as never);
  vi.spyOn(MixinApi, 'isBroadcastHost').mockImplementation(((s: unknown) =>
    !!s && typeof (s as { _key?: unknown })._key === 'string') as never);
  vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation(((id: string) => {
    const p = [ada, bo].find((x) => x.key === id && x.resident !== false);
    return p ? (avatarOf(p) as never) : undefined;
  }) as never);
  vi.spyOn(DocumentApi, 'mayWrite').mockImplementation(async (subject, path) => {
    const key = (subject as unknown as { _key?: string } | null)?._key;
    if (!key) return false;
    return [...(pens.get(key) ?? [])].some((p) => path === p || path.startsWith(`${p}/`));
  });
  vi.spyOn(TwitchProfile, 'findById').mockImplementation((async (id: string) =>
    profiles.get(id) ?? null) as never);
  vi.spyOn(KickProfile, 'findById').mockImplementation((async (id: string) =>
    profiles.get(id) ?? null) as never);
  vi.spyOn(GoogleProfile, 'findById').mockImplementation((async (id: string) =>
    profiles.get(id) ?? null) as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  StreamApi.programs().forget();
  StuffApi.clearAll();
});

function linkTwitch(p: FakePlayer, login: string): void {
  profiles.set(`tw-${p.key}`, { login });
  p.user.twitchProfileId = `tw-${p.key}`;
}
function linkKick(p: FakePlayer, slug: string): void {
  profiles.set(`k-${p.key}`, { slug });
  p.user.kickProfileId = `k-${p.key}`;
}
function linkGoogle(p: FakePlayer, steppedUp: boolean, channel = 'UCabc123'): void {
  profiles.set(`g-${p.key}`, {
    youtubeChannelId: channel,
    hasYoutube: () => steppedUp,
  });
  p.user.googleProfileId = `g-${p.key}`;
}

describe('program create', () => {
  it('files a program owned by the creator\'s home, under its short name', async () => {
    const r = await as(ada, () => StreamApi.createProgram('cafe-hour', { title: 'The Cafe Hour' }));
    expect(r.ok).toBe(true);
    const row = store.get('/platform/programs/cafe-hour');
    expect(row?.kind).toBe('program');
    expect(row?.owner).toBe('/platform/programs');
    expect(row?.data).toMatchObject({
      title: 'The Cafe Hour',
      owner: '/home/ada',
      ownerName: 'Ada',
      schedule: '',
      feeds: {},
      runner: null,
    });
  });

  it('refuses a malformed name', async () => {
    for (const bad of ['A', 'x', '-lead', 'trail-', 'Has Space', 'UPPER', 'a'.repeat(33)]) {
      const r = await as(ada, () => StreamApi.createProgram(bad));
      expect(r).toMatchObject({ ok: false, reason: 'program-bad-name' });
    }
    expect(store.size).toBe(0);
  });

  it('is first come: a second create of the name is refused and the first is unchanged', async () => {
    await as(ada, () => StreamApi.createProgram('cafe-hour', { title: 'Ada\'s' }));
    const r = await as(bo, () => StreamApi.createProgram('cafe-hour', { title: 'Bo\'s' }));
    expect(r).toMatchObject({ ok: false, reason: 'program-name-taken', facts: { name: 'cafe-hour' } });
    expect(store.get('/platform/programs/cafe-hour')?.data).toMatchObject({ title: 'Ada\'s', owner: '/home/ada' });
  });

  it('`--owner` needs the pen there; held, the institution owns it', async () => {
    const refused = await as(ada, () => StreamApi.createProgram('the-house', { owner: '/compact/house' }));
    expect(refused).toMatchObject({ ok: false, reason: 'program-owner-refused' });
    pens.get('ada')!.add('/compact/house');
    const r = await as(ada, () => StreamApi.createProgram('the-house', { owner: '/compact/house' }));
    expect(r.ok).toBe(true);
    expect(store.get('/platform/programs/the-house')?.data).toMatchObject({
      owner: '/compact/house',
      ownerName: 'house',
    });
  });

  it('refuses a guest, and nobody at all', async () => {
    const guest: FakePlayer = { key: 'guest-1', name: 'Guest', guest: true, user: {} };
    expect(await as(guest, () => StreamApi.createProgram('squat'))).toMatchObject({
      ok: false,
      reason: 'program-guest',
    });
    expect(await as(null, () => StreamApi.createProgram('squat'))).toMatchObject({
      ok: false,
      reason: 'program-guest',
    });
    expect(store.size).toBe(0);
  });
});

describe('program retitle / schedule — the owner\'s pen', () => {
  beforeEach(async () => {
    await as(ada, () => StreamApi.createProgram('cafe-hour'));
  });

  it('the owner changes both; a stranger is refused on each', async () => {
    expect((await as(ada, () => StreamApi.amendProgram('cafe-hour', { title: 'The Cafe Hour' }))).ok).toBe(true);
    expect((await as(ada, () => StreamApi.amendProgram('cafe-hour', { schedule: 'Saturdays 10am ET' }))).ok).toBe(true);
    expect(store.get('/platform/programs/cafe-hour')?.data).toMatchObject({
      title: 'The Cafe Hour',
      schedule: 'Saturdays 10am ET',
    });
    for (const patch of [{ title: 'Mine now' }, { schedule: 'never' }]) {
      expect(await as(bo, () => StreamApi.amendProgram('cafe-hour', patch))).toMatchObject({
        ok: false,
        reason: 'not-your-program',
      });
    }
    expect(store.get('/platform/programs/cafe-hour')?.data).toMatchObject({ title: 'The Cafe Hour' });
  });

  it('an unknown program is `no-such-program`', async () => {
    expect(await as(ada, () => StreamApi.amendProgram('nope', { title: 'x' }))).toMatchObject({
      ok: false,
      reason: 'no-such-program',
      facts: { name: 'nope' },
    });
  });
});

describe('program channel — the attacher\'s own channel (D13)', () => {
  beforeEach(async () => {
    await as(ada, () => StreamApi.createProgram('cafe-hour'));
  });

  it('with no linked account, every carrier is `no-linked-account`', async () => {
    for (const carrier of ['twitch', 'kick', 'youtube'] as const) {
      const r = await as(ada, () => StreamApi.attachFeed('cafe-hour', carrier));
      expect(r).toMatchObject({ ok: false, reason: 'no-linked-account' });
    }
    expect(store.get('/platform/programs/cafe-hour')?.data.feeds).toEqual({});
  });

  it('a Kick account with no channel (an empty slug) attaches nothing', async () => {
    linkKick(ada, '');
    expect(await as(ada, () => StreamApi.attachFeed('cafe-hour', 'kick'))).toMatchObject({
      ok: false,
      reason: 'no-linked-account',
    });
  });

  it('attaches the profile\'s channel, lower-cased, proved by the attacher', async () => {
    linkTwitch(ada, 'AdaPlays');
    linkKick(ada, 'AdaKick');
    const r = await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch'));
    expect(r.ok).toBe(true);
    await as(ada, () => StreamApi.attachFeed('cafe-hour', 'kick'));
    const feeds = store.get('/platform/programs/cafe-hour')?.data.feeds as Record<string, Record<string, unknown>>;
    expect(feeds.twitch).toMatchObject({ channel: 'adaplays', provenBy: '/platform/agent/Avatar/ada' });
    expect(feeds.kick).toMatchObject({ channel: 'adakick' });
    expect(typeof feeds.twitch!.provenAt).toBe('number');
  });

  it('a stated channel is checked, never trusted', async () => {
    linkTwitch(ada, 'adaplays');
    expect(await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch', 'somebodyelse'))).toMatchObject({
      ok: false,
      reason: 'not-your-channel',
      facts: { stated: 'somebodyelse', proven: 'adaplays' },
    });
    expect((await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch', 'AdaPlays'))).ok).toBe(true);
  });

  it('YouTube needs the step-up; with it, the channel id attaches', async () => {
    linkGoogle(ada, false);
    expect(await as(ada, () => StreamApi.attachFeed('cafe-hour', 'youtube'))).toMatchObject({
      ok: false,
      reason: 'no-linked-account',
    });
    linkGoogle(ada, true, 'UCada');
    expect((await as(ada, () => StreamApi.attachFeed('cafe-hour', 'youtube'))).ok).toBe(true);
    expect(store.get('/platform/programs/cafe-hour')?.data.feeds).toMatchObject({
      youtube: { channel: 'UCada' },
    });
  });

  it('a stranger with their own account still cannot feed somebody\'s program', async () => {
    linkTwitch(bo, 'boplays');
    expect(await as(bo, () => StreamApi.attachFeed('cafe-hour', 'twitch'))).toMatchObject({
      ok: false,
      reason: 'not-your-program',
    });
  });

  it('a member of the owning committee attaches THEIR OWN channel to its program', async () => {
    pens.get('ada')!.add('/compact/house');
    await as(ada, () => StreamApi.createProgram('the-house', { owner: '/compact/house' }));
    pens.get('bo')!.add('/compact/house');
    linkTwitch(bo, 'boplays');
    expect((await as(bo, () => StreamApi.attachFeed('the-house', 'twitch'))).ok).toBe(true);
    expect(store.get('/platform/programs/the-house')?.data.feeds).toMatchObject({
      twitch: { channel: 'boplays', provenBy: '/platform/agent/Avatar/bo' },
    });
  });

  it('`--clear` removes the feed; pen only', async () => {
    linkTwitch(ada, 'adaplays');
    await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch'));
    expect(await as(bo, () => StreamApi.detachFeed('cafe-hour', 'twitch'))).toMatchObject({
      ok: false,
      reason: 'not-your-program',
    });
    expect((await as(ada, () => StreamApi.detachFeed('cafe-hour', 'twitch'))).ok).toBe(true);
    expect(store.get('/platform/programs/cafe-hour')?.data.feeds).toEqual({});
  });
});

describe('reading a program', () => {
  it('a program with no feed reads back whole, off the air', async () => {
    await as(ada, () => StreamApi.createProgram('quiet', { title: 'Quiet' }));
    StreamApi.programs().forget();
    const listing = await StreamApi.programListing('quiet');
    expect(listing).toEqual({ name: 'quiet', title: 'Quiet', ownerName: 'Ada', live: false, feeds: {} });
    expect(await StreamApi.programListing('quiet', 'twitch')).toBeNull();
    expect(await StreamApi.programListing('nope')).toBeNull();
  });

  it('the catalogue keeps the latest record after each write', async () => {
    linkTwitch(ada, 'adaplays');
    await as(ada, () => StreamApi.createProgram('cafe-hour'));
    expect(StreamApi.programs().need('/platform/programs/cafe-hour').feedOn('twitch')).toBeNull();
    await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch'));
    expect(StreamApi.programs().need('/platform/programs/cafe-hour').feedOn('twitch')?.channel).toBe('adaplays');
  });
});

describe('DocumentApi.saveProgram — the transport\'s rails', () => {
  it('refuses any caller but StreamLogic', async () => {
    await expect(
      (async () =>
        DocumentApi.saveProgram(
          'x1',
          { title: '', owner: '/home/ada', ownerName: '', schedule: '', feeds: {}, runner: null },
          'create',
        ))(),
    ).rejects.toThrow(/denied/);
    expect(store.size).toBe(0);
  });
});

describe('program run — the chair (D12)', () => {
  beforeEach(async () => {
    linkTwitch(ada, 'adaplays');
    await as(ada, () => StreamApi.createProgram('cafe-hour'));
    await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch'));
  });

  it('points the body at the program and the program at its player', async () => {
    expect((await as(ada, () => StreamApi.runProgram('cafe-hour'))).ok).toBe(true);
    expect(ada.program).toBe('/platform/programs/cafe-hour');
    expect(store.get('/platform/programs/cafe-hour')?.data.runner).toBe('ada');
    expect(StreamApi.channelsFor('ada')).toEqual({ twitch: 'adaplays' });
  });

  it('a stranger cannot run it', async () => {
    expect(await as(bo, () => StreamApi.runProgram('cafe-hour'))).toMatchObject({
      ok: false,
      reason: 'not-your-program',
    });
    expect(bo.program).toBeNull();
  });

  it('one chair: refused while the runner is on air, replaced when not', async () => {
    pens.get('bo')!.add('/home/ada');
    await as(ada, () => StreamApi.runProgram('cafe-hour'));
    ada.onAir = true;
    expect(await as(bo, () => StreamApi.runProgram('cafe-hour'))).toMatchObject({
      ok: false,
      reason: 'program-in-use',
    });
    ada.onAir = false;
    expect((await as(bo, () => StreamApi.runProgram('cafe-hour'))).ok).toBe(true);
    expect(store.get('/platform/programs/cafe-hour')?.data.runner).toBe('bo');
    expect(ada.program).toBeNull();
  });

  it('no switching programs while on the air', async () => {
    await as(ada, () => StreamApi.createProgram('other-show'));
    await as(ada, () => StreamApi.runProgram('cafe-hour'));
    ada.onAir = true;
    expect(await as(ada, () => StreamApi.runProgram('other-show'))).toMatchObject({
      ok: false,
      reason: 'program-on-air',
      facts: { name: 'cafe-hour' },
    });
    ada.onAir = false;
    expect((await as(ada, () => StreamApi.runProgram('other-show'))).ok).toBe(true);
    // Leaving the old chair clears it.
    expect(store.get('/platform/programs/cafe-hour')?.data.runner).toBeNull();
  });

  it('a feed attached while running is what the overlay reads', async () => {
    await as(ada, () => StreamApi.runProgram('cafe-hour'));
    linkKick(ada, 'adakick');
    await as(ada, () => StreamApi.attachFeed('cafe-hour', 'kick'));
    expect(StreamApi.channelsFor('ada')).toEqual({ twitch: 'adaplays', kick: 'adakick' });
  });

  it('on air in the listing only while the runner is resident, running it, on air', async () => {
    await as(ada, () => StreamApi.runProgram('cafe-hour'));
    expect((await StreamApi.programListing('cafe-hour'))?.live).toBe(false);
    ada.onAir = true;
    expect((await StreamApi.programListing('cafe-hour'))?.live).toBe(true);
    ada.resident = false;
    expect((await StreamApi.programListing('cafe-hour'))?.live).toBe(false);
  });
});

describe("`rodney`'s gate — StreamApi.programGate (D12)", () => {
  it('no program → no-program; its pen → ok; the pen lost → not-your-program', async () => {
    const body = () => avatarOf(ada) as never;
    expect(await StreamApi.programGate(body())).toBe('no-program');
    await as(ada, () => StreamApi.createProgram('cafe-hour'));
    await as(ada, () => StreamApi.runProgram('cafe-hour'));
    expect(await StreamApi.programGate(body())).toBe('ok');
    pens.get('ada')!.clear();
    expect(await StreamApi.programGate(body())).toBe('not-your-program');
  });

  it('a body citing a program that is gone runs none', async () => {
    ada.program = '/platform/programs/vanished';
    expect(await StreamApi.programGate(avatarOf(ada) as never)).toBe('no-program');
    expect(StreamApi.channelsFor('ada')).toEqual({});
  });
});

describe('no source reads a retired stream env name (D15)', () => {
  it('only the boot warning names them', () => {
    const root = join(__dirname, '../../../../..');
    const names = /OVERLAY_TWITCH_LOGIN|OVERLAY_YOUTUBE_CHANNEL|OVERLAY_KICK_CHANNEL|STREAMER_PLAYER_IDS|\bBROADCAST_TOKEN\b/;
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === '__tests__' || entry === 'node_modules') continue;
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.ts$/.test(entry) && names.test(readFileSync(full, 'utf8'))) hits.push(full);
      }
    };
    walk(root);
    expect(hits.map((h) => h.slice(root.length + 1))).toEqual(['services/websocket/WebSocketService.ts']);
  });
});

describe('the front page\'s program — frontListing (D14)', () => {
  let featured: string;
  beforeEach(async () => {
    featured = '';
    vi.spyOn(AppApi, 'setting').mockImplementation(((k: string) =>
      k === 'stream.featuredProgram' ? featured : '') as never);
    linkTwitch(ada, 'adaplays');
    await as(ada, () => StreamApi.createProgram('cafe-hour', { title: 'The Cafe Hour' }));
    await as(ada, () => StreamApi.amendProgram('cafe-hour', { schedule: 'Saturdays 10am ET' }));
    await as(ada, () => StreamApi.attachFeed('cafe-hour', 'twitch'));
    linkKick(bo, 'bokick');
    await as(bo, () => StreamApi.createProgram('other-show'));
    await as(bo, () => StreamApi.attachFeed('other-show', 'kick'));
    await as(bo, () => StreamApi.createProgram('no-feed'));
  });

  it('unset → nothing is featured', async () => {
    expect(await StreamApi.frontListing()).toBeNull();
  });

  it('featured, off air → live false with its next show; on air → live true', async () => {
    featured = 'cafe-hour';
    expect(await StreamApi.frontListing()).toMatchObject({
      name: 'cafe-hour',
      live: false,
      nextShow: 'Saturdays 10am ET',
      feeds: { twitch: 'adaplays' },
    });
    await as(ada, () => StreamApi.runProgram('cafe-hour'));
    ada.onAir = true;
    expect((await StreamApi.frontListing())?.live).toBe(true);
  });

  it('a link naming a program with a feed there gets THAT program', async () => {
    featured = 'cafe-hour';
    expect((await StreamApi.frontListing('other-show', 'kick'))?.name).toBe('other-show');
  });

  it('no feed on that carrier, no such program, or a malformed name → the featured one', async () => {
    featured = 'cafe-hour';
    for (const [w, c] of [['other-show', 'twitch'], ['no-feed', 'kick'], ['nope', 'kick'], ['Bad Name', 'kick']] as const) {
      expect((await StreamApi.frontListing(w, c))?.name).toBe('cafe-hour');
    }
  });

  it('changing the setting changes the answer', async () => {
    featured = 'cafe-hour';
    expect((await StreamApi.frontListing())?.name).toBe('cafe-hour');
    featured = 'other-show';
    expect((await StreamApi.frontListing())?.name).toBe('other-show');
  });
});

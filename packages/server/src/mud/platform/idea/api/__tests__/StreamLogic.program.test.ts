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
import { AccessApi } from '../../../../api/access';
import { PlayerApi } from '../../../../api/player';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { StoredDocument } from '../../../../lib/document/StoredDocument';
import { TwitchProfile } from '../../../../lib/identity/TwitchProfile';
import { KickProfile } from '../../../../lib/identity/KickProfile';
import { GoogleProfile } from '../../../../lib/identity/GoogleProfile';
import { StuffApi } from '../../../../api/stuff';

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
  ada.user = {};
  bo.user = {};
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
  vi.spyOn(AccessApi, 'canAtPath').mockImplementation(async (subject, _action, path) => {
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

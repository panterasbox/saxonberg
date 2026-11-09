/**
 * Broadcast-ready — the wire half of the blocking drive (requirements
 * steps 1–7, 9–11, 14–16). The browser half (the redaction rendering, the
 * controls card, pop-out, the foreground from a real blur) is
 * `e2e/tests/broadcast-ready-walk.spec.ts`; what only a screen can prove
 * (OBS's four scenes, the Elgato cut, the real Twitch/YouTube chat) is the
 * owner's rehearsal.
 *
 * ⭐ Every overlay fact is read off a REAL broadcast socket opened with the
 * streamer's own `stream token` — the feed exactly as OBS receives it —
 * and every Stream Deck press off a real `?control=` socket.
 *
 * Step 5's restart is staged as logout → login: the streamer's body is
 * destructed and re-materialized from `holder_snapshots`, which is the
 * restart's whole effect on the stream's state; the broadcast socket stays
 * open across it and must never hear `live`.
 *
 * Step 11 is `short`: one real minute of outro (`stream.outroMs`).
 * Step 12 (two platforms' chat; YouTube found with no search call) needs
 * the real transports — its routing and the zero-`search.list` path are
 * unit-proved (`BroadcastFeed.test.ts`, `YoutubeClient.test.ts`).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
  SERVER_URL,
  expectOk,
  type CapturedEnvelope,
} from '../src/harness';

export const DIRTY_REASON =
  'issues stream tokens that persist as documents, and adds two characters ' +
  'to the streamers group';

declareFile({
  file: 'broadcast-ready.dirty.wire.test.ts',
  packs: ['saxonberg-lounge', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const BAR = '/world/lounge/location/bar';

interface Show {
  phase: string;
  reason: { key: string; privacy: boolean } | null;
  startsAt: number | null;
  awayUntil: number | null;
  endsAt: number | null;
  topic: string | null;
  agenda: { title: string; done: boolean }[];
  current: number;
  client: { foreground: string | null; mode: string | null; layout: string | null; lastVerb: string | null } | null;
  playersOnline: number;
  build: { sha: string; at: string } | null;
  panels: { key: string }[];
}

/** A token socket (`?broadcast=` or `?control=`), recording what it hears. */
class TokenSocket {
  readonly heard: CapturedEnvelope[] = [];
  private waiters: (() => void)[] = [];
  private constructor(private readonly ws: WebSocket) {
    ws.on('message', (data) => {
      this.heard.push(JSON.parse(String(data)) as CapturedEnvelope);
      for (const w of this.waiters.splice(0)) w();
    });
  }

  static async open(door: 'broadcast' | 'control', token: string): Promise<TokenSocket> {
    const url = `${SERVER_URL().replace(/^http/, 'ws')}/?${door}=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
      ws.once('unexpected-response', (_req, res) => reject(new Error(`${door} upgrade: ${res.statusCode}`)));
    });
    return new TokenSocket(ws);
  }

  /** Every `stream-state` show heard so far. */
  shows(): Show[] {
    return this.heard.filter((e) => e.type === 'stream-state').map((e) => e.state as Show);
  }

  /** Wait for an envelope that matches, heard after `since` (an index). */
  async await<T extends CapturedEnvelope>(
    match: (e: CapturedEnvelope) => boolean,
    since = 0,
    timeoutMs = 15_000,
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const hit = this.heard.slice(since).find(match);
      if (hit) return hit as T;
      const left = deadline - Date.now();
      if (left <= 0) {
        throw new Error(
          `token socket: no matching envelope in ${timeoutMs}ms; heard ` +
            JSON.stringify(this.heard.slice(since).map((e) => e.type)),
        );
      }
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, left);
        this.waiters.push(() => {
          clearTimeout(t);
          resolve();
        });
      });
    }
  }

  /** The next show matching `pred`, heard after `since`. */
  async show(pred: (s: Show) => boolean, since = 0, timeoutMs?: number): Promise<Show> {
    const e = await this.await(
      (x) => x.type === 'stream-state' && pred(x.state as Show),
      since,
      timeoutMs,
    );
    return e.state as Show;
  }

  send(command: string): void {
    this.ws.send(JSON.stringify({ type: 'command', payload: { command } }));
  }

  close(): void {
    this.ws.close();
  }
}

/** The raw token a `stream token` line printed (shown once). */
async function issueToken(s: Session, control = false): Promise<string> {
  const r = await s.cmd(control ? 'stream token --control' : 'stream token');
  expectOk(r);
  const said = plain(await r.said());
  const token = said.split(/\s+/).find((w) => /^[A-Za-z0-9_-]{40,}$/.test(w));
  expect(token, `no token in: ${said}`).toBeDefined();
  return token!;
}

let hostHandle: string;
let hostName: string; // the streamer's character name, as others address them
let host: Session; // the founder, streaming
let guest: Session; // another player in the bar
let second: Session; // a second streamer
let feed: TokenSocket; // the founder's overlay
let deck: TokenSocket; // the founder's Stream Deck (pblive)

beforeAll(async () => {
  hostHandle = uniqueHandle('br-host');
  host = await Session.open(hostHandle, { startLocation: BAR, streamer: true });
  guest = await Session.open(uniqueHandle('br-guest'), { startLocation: BAR });
  // Address the streamer by stuffId (`#id`): a test character's name is
  // its handle, which no keyword match reads.
  const me = await host.queryOne('me', 'ref');
  hostName = `#${String((me as { stuffId?: string } | null)?.stuffId ?? '')}`;
  expect(hostName, 'the streamer has an id').not.toBe('#');
}, 120_000);

afterAll(() => {
  feed?.close();
  deck?.close();
  host?.close();
  guest?.close();
  second?.close();
});

suite('broadcast-ready — the blocking drive (wire)', () => {
  it('step 1 — Starting with the agenda, then Live, on the overlay opened with my own token', async () => {
    const token = await issueToken(host);
    feed = await TokenSocket.open('broadcast', token);
    // The streamer is resident: the overlay gets its snapshot at once.
    const first = await feed.show(() => true, 0, 30_000);
    expect(first.phase).toBe('offline');
    const withRows = await feed.show((s) => s.panels.length > 0, 0, 30_000);
    expect(withRows.panels.map((p) => p.key), 'the lower third rows ride the feed').toContain('join');

    expectOk(await host.cmd('stream agenda the glass trade, paper, questions'));
    expectOk(await host.cmd('stream segment This week in Saxonberg'));
    const mark = feed.heard.length;
    expectOk(await host.cmd('stream start in 2m'));
    const starting = await feed.show((s) => s.phase === 'starting', mark);
    expect(starting.agenda.map((a) => a.title)).toEqual(['the glass trade', 'paper', 'questions']);
    expect(starting.topic).toBe('This week in Saxonberg');
    expect(starting.startsAt! - Date.now()).toBeGreaterThan(100_000);
    expect(starting.startsAt! - Date.now()).toBeLessThan(125_000);

    const mark2 = feed.heard.length;
    expectOk(await host.cmd('stream live'));
    await feed.show((s) => s.phase === 'live', mark2);
  }, 60_000);

  it('step 2 — a tell to the streamer carries the server’s privacy stamp', async () => {
    host.clearCaptures();
    const r = await guest.cmd(`dm ${hostName} meet me at the docks`);
    expectOk(r);
    await host.listen(2_000);
    const tells = host.framesOf('speech.comms');
    expect(tells.length, 'the tell reached the streamer').toBeGreaterThan(0);
    expect(tells.every((f) => (f.tags ?? []).includes('privacy:private'))).toBe(true);
    // …and nothing of it reached the overlay.
    expect(JSON.stringify(feed.heard)).not.toContain('docks');
  }, 30_000);

  it('step 3 — away for the bathroom: Away, five minutes', async () => {
    const mark = feed.heard.length;
    expectOk(await host.cmd('stream away bathroom'));
    const away = await feed.show((s) => s.phase === 'standby', mark);
    expect(away.reason?.key).toBe('bathroom');
    const left = away.awayUntil! - Date.now();
    expect(left).toBeGreaterThan(280_000);
    expect(left).toBeLessThanOrEqual(300_000);
  }, 30_000);

  it('step 4 — the Stream Deck runs `stream away privacy`: no timer; and runs nothing else', async () => {
    const control = await issueToken(host, true);
    deck = await TokenSocket.open('control', control);

    deck.send('look');
    const refusedLook = await deck.await((e) => e.type === 'control-result');
    expect(refusedLook).toMatchObject({ ok: false, reason: 'stream-only' });

    let since = deck.heard.length;
    deck.send('stream token');
    expect(await deck.await((e) => e.type === 'control-result', since)).toMatchObject({
      ok: false,
      reason: 'no-token-minting',
    });

    const mark = feed.heard.length;
    since = deck.heard.length;
    deck.send('stream away privacy');
    expect(await deck.await((e) => e.type === 'control-result', since)).toMatchObject({ ok: true });
    const privacy = await feed.show((s) => s.reason?.key === 'privacy', mark);
    expect(privacy.phase).toBe('standby');
    expect(privacy.reason?.privacy).toBe(true);
    expect(privacy.awayUntil, 'a privacy standby shows no countdown').toBeNull();
  }, 30_000);

  it('step 4b — an overlay token is refused on the control door, and a bad token on both', async () => {
    await expect(TokenSocket.open('broadcast', 'not-a-real-token-at-all-0000')).rejects.toThrow(/401/);
    await expect(TokenSocket.open('control', 'not-a-real-token-at-all-0000')).rejects.toThrow(/401/);
  }, 30_000);

  it('step 5 (staged restart) — the overlay holds the privacy standby across the body’s reload', async () => {
    const mark = feed.heard.length;
    host.close();
    await new Promise((r) => setTimeout(r, 1_500));
    host = await Session.open(hostHandle, { startLocation: BAR, streamer: true });
    // A reloaded body is a new Stuff: re-read the id others address.
    hostName = `#${String(((await host.queryOne('me', 'ref')) as { stuffId?: string } | null)?.stuffId ?? '')}`;
    const back = await feed.show((s) => s.phase === 'standby', mark);
    expect(back.reason?.key).toBe('privacy');
    expect(back.awayUntil).toBeNull();
    // ⭐ Fail closed: nothing on the way said `live`.
    const after = feed.heard.slice(mark).filter((e) => e.type === 'stream-state');
    expect(after.every((e) => (e.state as Show).phase !== 'live')).toBe(true);
  }, 120_000);

  it('step 6 — back to Live; the client reports another tab, then another app', async () => {
    let mark = feed.heard.length;
    expectOk(await host.cmd('stream back'));
    await feed.show((s) => s.phase === 'live', mark);

    mark = feed.heard.length;
    host.writeClientState('stream.foreground', 'other-tab');
    await feed.show((s) => s.client?.foreground === 'other-tab', mark);
    mark = feed.heard.length;
    host.writeClientState('stream.foreground', 'other-app');
    await feed.show((s) => s.client?.foreground === 'other-app', mark);
    host.writeClientState('stream.foreground', 'saxonberg');
  }, 30_000);

  it('step 7 — `stream next` ticks the agenda', async () => {
    const mark = feed.heard.length;
    expectOk(await host.cmd('stream next'));
    const next = await feed.show((s) => s.current === 1, mark);
    expect(next.agenda[0]!.done).toBe(true);
    expect(next.agenda[1]!.done).toBe(false);
  }, 30_000);

  it('step 9 — a second player sees the streamer is broadcasting, and that a broadcast reaches the room', async () => {
    const room = await guest.cmd('look');
    expectOk(room);
    const roomText = plain(await room.said()) + JSON.stringify(guest.envelopesOf('card-opened'));
    expect(roomText).toContain('A broadcast reaches this place.');

    const person = await guest.cmd(`look ${hostName}`);
    expectOk(person);
    const personText = plain(await person.said()) + JSON.stringify(guest.envelopesOf('card-opened'));
    expect(personText).toMatch(/broadcasting/);
  }, 30_000);

  it('step 10 — a second streamer’s Away does not move the founder’s overlay', async () => {
    second = await Session.open(uniqueHandle('br-second'), { streamer: true });
    const theirs = await TokenSocket.open('broadcast', await issueToken(second));
    try {
      const mark = feed.heard.length;
      const theirMark = theirs.heard.length;
      expectOk(await second.cmd('stream away food'));
      const food = await theirs.show((s) => s.reason?.key === 'food', theirMark);
      expect(food.phase).toBe('standby');
      await new Promise((r) => setTimeout(r, 1_500));
      const mine = feed.heard.slice(mark).filter((e) => e.type === 'stream-state');
      expect(
        mine.every((e) => (e.state as Show).reason?.key !== 'food'),
        'the founder’s overlay heard the second streamer',
      ).toBe(true);
    } finally {
      theirs.close();
    }
  }, 60_000);

  it('step 14 — a new player’s first arrival reaches the ticker, “straight from the stream”', async () => {
    const mark = feed.heard.length;
    // Letters only: a character name keeps no digits.
    const name = `Iffy${Date.now().toString(36).slice(-4).replace(/[^a-z]/g, '')}x`;
    const newcomer = await Session.embody(uniqueHandle('br-new'), { name }, { from: 'stream' });
    try {
      const ev = await feed.await((e) => e.type === 'stream-event' && e.kind === 'new-player', mark, 30_000);
      expect(ev).toMatchObject({ kind: 'new-player', fromStream: true });
      expect(String(ev.name)).toMatch(new RegExp(name, 'i'));
    } finally {
      newcomer.close();
    }
  }, 120_000);

  it('step 15 — the feed carries the running build’s stamp (or null, never a made-up date)', async () => {
    const shows = feed.shows();
    const latest = shows[shows.length - 1]!;
    if (process.env.SAXONBERG_BUILD_SHA) {
      expect(latest.build?.sha).toBe(process.env.SAXONBERG_BUILD_SHA);
      expect(Number.isNaN(Date.parse(latest.build!.at))).toBe(false);
    } else {
      expect(latest.build).toBeNull();
    }
  });

  it('step 16 — typing `smelt the ore` tells the overlay the verb and never the arguments', async () => {
    const mark = feed.heard.length;
    await host.cmd('smelt the ore');
    const smelt = await feed.show((s) => s.client?.lastVerb === 'smelt', mark);
    expect(smelt.client?.lastVerb).toBe('smelt');
    expect(JSON.stringify(feed.heard.slice(mark))).not.toMatch(/the ore/);
  }, 30_000);

  it('step 11 (short) — `stream end`: Ending, then offline when the outro finishes; the room line clears', async () => {
    const mark = feed.heard.length;
    expectOk(await host.cmd('stream end'));
    const ending = await feed.show((s) => s.phase === 'ending', mark);
    expect(ending.endsAt! - Date.now()).toBeGreaterThan(30_000);
    await feed.show((s) => s.phase === 'offline', mark, 90_000);

    const room = await guest.cmd('look');
    const roomText = plain(await room.said()) + JSON.stringify(guest.envelopesOf('card-opened'));
    expect(roomText).not.toContain('A broadcast reaches this place.');
    const person = await guest.cmd(`look ${hostName}`);
    const personText = plain(await person.said()) + JSON.stringify(guest.envelopesOf('card-opened'));
    expect(personText).not.toMatch(/broadcasting/);
  }, 150_000);
});

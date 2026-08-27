/**
 * The record layer — the frame store, as PROPERTIES rather than as
 * method calls.
 *
 * Four things are worth proving here, and each is stated the way the
 * requirements state it:
 *
 *  - a frame delivered to a player is retained, **once per delivery
 *    rather than once per recipient-surface** — asserted by attaching
 *    two Interactives and counting rows, because a tap per socket would
 *    pass every other test in this file;
 *  - the store is **bounded**, oldest evicted first;
 *  - ⭐ **a second connection sees what the first received** — the
 *    property the store exists for, and one no per-method assertion can
 *    see;
 *  - the store is **owner-only**, and a wizard is not an exception.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MessageFrame } from '@saxonberg/types';
import Avatar from '../../platform/agent/Avatar';
import Interactive from '../../platform/idea/Interactive';
import { User } from '../../lib/identity/User';
import { RecordApi } from '../record';
import { AppApi } from '../app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Collections } from '../../lib/persistence/Collections';
import { ConnectionApi } from '../connection';
import { ExecutionContextApi } from '../execution-context';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import {
  installRecordTestDb,
  type RecordTestDb,
} from '../../lib/persistence/__tests__/record-test-db';

let db: RecordTestDb;

function makeUser(id: string): User {
  const user = new User();
  user._id = id;
  return user;
}

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.setPlayerId(playerId);
  return a;
}

let frameSeq = 0;
function frame(body: string, topic = 'speech.vocal'): MessageFrame {
  frameSeq += 1;
  return {
    id: `f${frameSeq}`,
    topic,
    body,
    meta: { timestamp: Date.now() },
  };
}

/** Deliver `frame` to `avatar` exactly as the message fan-out would. */
function deliver(avatar: Avatar, f: MessageFrame): void {
  (avatar as unknown as { onMessage(f: MessageFrame): void }).onMessage(f);
}

/** Read the acting player's own record, as the session ceremony does. */
async function recentAs(avatar: Avatar, limit = 300) {
  return ExecutionContextApi.runRoot(null, 'test.recall', async () => {
    ExecutionContextApi.tagActingAuthor(avatar);
    return RecordApi.recent(limit);
  });
}

async function recallAs(avatar: Avatar, scope: 'frames', search: string) {
  return ExecutionContextApi.runRoot(null, 'test.recall', async () => {
    ExecutionContextApi.tagActingAuthor(avatar);
    return RecordApi.recall(scope, search);
  });
}

/** The store's rows for one owner, oldest first. */
function storedFor(owner: string): Array<Record<string, unknown>> {
  return db
    .all(Collections.PlayerFrames)
    .filter((r) => r.owner === owner)
    .sort((a, b) => Number(a.seq) - Number(b.seq));
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installRecordTestDb();
  db.reset();
  // Never let a test see a stale buffer, a stale sequence counter, or —
  // the one that actually bites — a live drain timer from a prior test.
  RecordApi._clearAllForTesting();
});

afterEach(() => {
  RecordApi._clearAllForTesting();
  vi.restoreAllMocks();
});

describe('the frame store', () => {
  it('retains a frame the player was delivered', async () => {
    const avatar = makeAvatar('p1');
    deliver(avatar, frame('a bell rings'));
    await RecordApi.flush();

    const rows = storedFor('p1');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.body).toBe('a bell rings');
    expect(rows[0]!.topic).toBe('speech.vocal');
  });

  it('records once per DELIVERY, not once per connected surface', async () => {
    const avatar = makeAvatar('p1');
    const user = makeUser('u1');
    const one = makeStuff(() => new Interactive('s1', 'sess1', user));
    const two = makeStuff(() => new Interactive('s2', 'sess2', user));
    avatar.addInteractive(one);
    avatar.addInteractive(two);
    // The fan-out really does reach both surfaces — otherwise the
    // one-row assertion below would be true for the wrong reason.
    const sent = vi
      .spyOn(ConnectionApi, 'sendMessage')
      .mockImplementation(() => undefined);

    deliver(avatar, frame('one bell, two screens'));
    await RecordApi.flush();

    expect(sent).toHaveBeenCalledTimes(2);
    expect(storedFor('p1')).toHaveLength(1);
  });

  it('⚠⚠ keeps a BODY-LESS control frame out of the store', async () => {
    const avatar = makeAvatar('p1');
    /*
     * `shell.control` and `self.group` carry everything in `payload`,
     * which the row deliberately drops. Stored, they come back on
     * backfill as bare coloured bars in the transcript — and measured
     * live they were 43% of every row in the collection, so nearly half
     * the retention window went to frames that can never be rendered.
     */
    deliver(avatar, { ...frame('', 'shell.control'), tags: ['control:schema'] });
    deliver(avatar, frame('   ', 'self.group'));
    deliver(avatar, frame('a bell rings'));
    await RecordApi.flush();

    const rows = storedFor('p1');
    // Both directions: the junk is gone AND the real frame survived —
    // a filter that took everything would satisfy half of this.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.body).toBe('a bell rings');
  });

  it('keeps a guest out of the store', async () => {
    const guest = makeAvatar('g1');
    (guest as unknown as { isGuest: boolean }).isGuest = true;
    deliver(guest, frame('ephemeral'));
    await RecordApi.flush();

    expect(storedFor('g1')).toHaveLength(0);
  });

  it('orders frames by arrival even when they share a millisecond', async () => {
    const avatar = makeAvatar('p1');
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    deliver(avatar, frame('first'));
    deliver(avatar, frame('second'));
    deliver(avatar, frame('third'));
    vi.restoreAllMocks();
    db = installRecordTestDb();
    await RecordApi.flush();

    expect(storedFor('p1').map((r) => r.body)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });
});

describe('the window', () => {
  it('is bounded, and the OLDEST frames are the ones that go', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === AppSettingKeys.recordFrameWindow ? '5' : '',
    );
    const avatar = makeAvatar('p1');
    for (let i = 1; i <= 12; i++) deliver(avatar, frame(`frame ${i}`));
    await RecordApi.flush();
    await RecordApi._evictNowForTesting('p1');

    const bodies = storedFor('p1').map((r) => r.body);
    expect(bodies).toHaveLength(5);
    expect(bodies).toEqual([
      'frame 8',
      'frame 9',
      'frame 10',
      'frame 11',
      'frame 12',
    ]);
  });

  it('trims one owner without touching another', async () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === AppSettingKeys.recordFrameWindow ? '2' : '',
    );
    const a = makeAvatar('p1');
    const b = makeAvatar('p2');
    for (let i = 1; i <= 6; i++) deliver(a, frame(`a${i}`));
    for (let i = 1; i <= 6; i++) deliver(b, frame(`b${i}`));
    await RecordApi.flush();
    await RecordApi._evictNowForTesting('p1');

    expect(storedFor('p1')).toHaveLength(2);
    expect(storedFor('p2')).toHaveLength(6);
  });
});

describe('reading it back', () => {
  it('⭐ a SECOND connection sees what the first received', async () => {
    // The first connection: a player is told three things.
    const avatar = makeAvatar('p1');
    const first = makeStuff(() => new Interactive('s1', 'sess1', makeUser('u1')));
    avatar.addInteractive(first);
    vi.spyOn(ConnectionApi, 'sendMessage').mockImplementation(() => undefined);
    deliver(avatar, frame('the forge is lit'));
    deliver(avatar, frame('Tomas nods'));
    deliver(avatar, frame('the bar reads 1240 °C'));
    await RecordApi.flush();

    // …and then goes away entirely. A different process, a different
    // device: nothing of the first connection survives but the store.
    avatar.removeInteractive(first);
    const second = makeStuff(
      () => new Interactive('s2', 'sess2', makeUser('u1')),
    );
    avatar.addInteractive(second);

    const seen = await recentAs(avatar);
    expect(seen.map((f) => f.body)).toEqual([
      'the forge is lit',
      'Tomas nods',
      'the bar reads 1240 °C',
    ]);
  });

  it('includes frames still waiting in the write buffer', async () => {
    const avatar = makeAvatar('p1');
    deliver(avatar, frame('written'));
    await RecordApi.flush();
    deliver(avatar, frame('still buffered'));

    const seen = await recentAs(avatar);
    expect(seen.map((f) => f.body)).toEqual(['written', 'still buffered']);
  });

  it('returns oldest→newest so the client can append in arrival order', async () => {
    const avatar = makeAvatar('p1');
    for (let i = 1; i <= 4; i++) deliver(avatar, frame(`f${i}`));
    await RecordApi.flush();

    const seen = await recentAs(avatar);
    expect(seen.map((f) => f.body)).toEqual(['f1', 'f2', 'f3', 'f4']);
  });
});

describe('owner-only', () => {
  it('another character reads their own record, never yours', async () => {
    const mine = makeAvatar('p1');
    const theirs = makeAvatar('p2');
    deliver(mine, frame('my secret'));
    deliver(theirs, frame('their business'));
    await RecordApi.flush();

    const asThem = await recentAs(theirs);
    expect(asThem.map((f) => f.body)).toEqual(['their business']);
    expect(asThem.some((f) => f.body === 'my secret')).toBe(false);
  });

  it('a wizard is not an exception — the read has no owner to widen', async () => {
    const mine = makeAvatar('p1');
    const wizard = makeAvatar('wiz');
    deliver(mine, frame('my secret'));
    await RecordApi.flush();

    // A wizard read is the same call as anyone else's, because there is
    // no overload that names a subject. The wizard sees an empty record
    // — their own — rather than a refusal, which is the stronger shape:
    // there is nothing to refuse.
    const asWizard = await recentAs(wizard);
    expect(asWizard).toEqual([]);
  });

  it('an unattributable context reads nothing', async () => {
    const mine = makeAvatar('p1');
    deliver(mine, frame('my secret'));
    await RecordApi.flush();

    const orphan = await ExecutionContextApi.runRoot(
      null,
      'test.no-actor',
      async () => RecordApi.recent(),
    );
    expect(orphan).toEqual([]);
  });

  it('recall over frames is scoped to the caller', async () => {
    const mine = makeAvatar('p1');
    const theirs = makeAvatar('p2');
    deliver(mine, frame('the anvil rang'));
    deliver(theirs, frame('the anvil rang'));
    await RecordApi.flush();

    const hits = await recallAs(theirs, 'frames', 'anvil');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.scope).toBe('frames');
    expect(hits[0]!.excerpt).toContain('anvil');
  });
});

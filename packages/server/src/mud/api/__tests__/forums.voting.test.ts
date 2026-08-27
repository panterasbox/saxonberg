/**
 * Forums Wave 2: the append-only event log (dual-write, persist-then-fire)
 * + voting (toggle store, denormalized aggregate, auto-upvote-own),
 * popularity sorts, and the anti-snowball display gate.
 *
 * Mongo is faked in-memory; `EventApi.fire` is spied to assert the
 * transient `ForumEventFired` lands AFTER the durable row (persist-then-
 * fire); `AppApi.setting` is stubbed for the anti-snowball thresholds.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForumsApi } from '../forums';
import SubjectCatalogue from '../../platform/idea/SubjectCatalogue';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';
import { StuffApi } from '../stuff';
import { PlayerApi } from '../player';
import { EventApi } from '../event';
import { AppApi } from '../app';
import { ForumEventFired } from '../../lib/forum/ForumEvent';
import type { Stuff } from '../../lib/stuff/Stuff';

let store: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;
let firedEvents: ForumEventFired[];
/** At each fire, the count of forum_events rows already persisted. */
let rowsPersistedAtFire: number[];

function col(name: string): Map<string, Record<string, unknown>> {
  let c = store.get(name);
  if (!c) {
    c = new Map();
    store.set(name, c);
  }
  return c;
}

class Actor extends Idea {}
function makeActor(): Stuff {
  return makeStuff(() => new Actor());
}

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  firedEvents = [];
  rowsPersistedAtFire = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    }
  );
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, query: Record<string, unknown>) =>
      [...col(c).values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'findById').mockImplementation(
    async (c: string, id: string) => (col(c).get(id) ?? null) as never
  );
  vi.spyOn(pm, 'delete').mockImplementation(async (c: string, id: string) => {
    col(c).delete(id);
  });
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(false as never);
  vi.spyOn(EventApi, 'fire').mockImplementation((event) => {
    if (event instanceof ForumEventFired) {
      firedEvents.push(event);
      rowsPersistedAtFire.push(col(Collections.ForumEvents).size);
    }
  });
  vi.spyOn(AppApi, 'setting').mockImplementation((key: string) => {
    if (key === 'forums.antiSnowball.minVotes') return '5';
    if (key === 'forums.antiSnowball.minMinutes') return '30';
    return '';
  });
  makeStuffAtPath(() => new SubjectCatalogue(), '/platform/idea/SubjectCatalogue');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

async function freshBoard() {
  const creator = makeActor();
  const { board } = await ForumsApi.makeForum(creator, 'Gossip', { open: true });
  return { creator, board };
}

describe('forum event log (dual-write, persist-then-fire)', () => {
  it('appends exactly one row per mutation and fires after it persists', async () => {
    const { creator, board } = await freshBoard();
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    const voter = makeActor();
    await ForumsApi.castVote(voter, thread, 'up');

    // makeForum mints a `board-created` event; the mutations under test
    // are the post + the vote. Filter the setup event out.
    const mutationRows = [...col(Collections.ForumEvents).values()].filter(
      (r) => r.kind !== 'board-created'
    );
    expect(mutationRows).toHaveLength(2);
    const kinds = mutationRows.map((r) => r.kind);
    expect(kinds).toContain('post-created');
    expect(kinds).toContain('vote-cast');

    // Persist-then-fire: each fire saw its own durable row already in the
    // store (board-created=1, post=2, vote=3 → the row count at fire N is N).
    expect(firedEvents).toHaveLength(3);
    rowsPersistedAtFire.forEach((n, i) => expect(n).toBe(i + 1));

    // Every entry-level event carries all four dependency keys.
    for (const ev of firedEvents) {
      if (ev.payload.kind === 'board-created') continue;
      expect(ev.payload.subject).toBeTruthy();
      expect(ev.payload.board).toBe(board._id);
      expect(ev.payload.thread).toBe(thread._id);
      expect(ev.payload.entry).toBeTruthy();
    }
  });

  it('the log is append-only — a vote toggle adds rows, never mutates', async () => {
    const { creator, board } = await freshBoard();
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    const voter = makeActor();
    await ForumsApi.castVote(voter, thread, 'up'); // up
    await ForumsApi.castVote(voter, thread, 'up'); // toggle off
    await ForumsApi.castVote(voter, thread, 'down'); // down
    // board-created + post + 3 votes = 5 rows, none rewritten.
    expect(col(Collections.ForumEvents).size).toBe(5);
  });
});

describe('forum voting', () => {
  it('auto-upvotes the author (+1, locked)', async () => {
    const { creator, board } = await freshBoard();
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    expect(thread.up).toBe(1);
    expect(thread.getScore()).toBe(1);
    // The author's own vote row is locked.
    await expect(ForumsApi.castVote(creator, thread, 'down')).rejects.toThrow(
      /your own entry/
    );
  });

  it('toggles up → none → down for a non-author voter', async () => {
    const { creator, board } = await freshBoard();
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    const voter = makeActor();

    let e = await ForumsApi.castVote(voter, thread, 'up');
    expect(e.up).toBe(2); // author + voter
    expect(await ForumsApi.getVoteState(e, voterId(voter))).toBe('up');

    e = await ForumsApi.castVote(voter, thread, 'up'); // toggle off
    expect(e.up).toBe(1);
    expect(await ForumsApi.getVoteState(e, voterId(voter))).toBeNull();

    e = await ForumsApi.castVote(voter, thread, 'down');
    expect(e.up).toBe(1);
    expect(e.down).toBe(1);
    expect(e.getScore()).toBe(0);
  });

  it('one row per (entry, voter) — re-voting does not stack', async () => {
    const { creator, board } = await freshBoard();
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    const voter = makeActor();
    await ForumsApi.castVote(voter, thread, 'up');
    await ForumsApi.castVote(voter, thread, 'down');
    const rows = [...col(Collections.ForumVotes).values()].filter(
      (r) => r.entry === thread._id && r.voter === voterId(voter)
    );
    expect(rows).toHaveLength(1);
  });
});

describe('forum sorts + anti-snowball', () => {
  it('orders threads by top / new / controversial; ranking ignores the display gate', async () => {
    const { creator, board } = await freshBoard();
    const a = await ForumsApi.postThread(creator, board, 'A', 'a');
    const b = await ForumsApi.postThread(creator, board, 'B', 'b');
    const c = await ForumsApi.postThread(creator, board, 'C', 'c');

    // Stamp controlled aggregates + ages directly in the store.
    setEntry(a._id!, { up: 10, down: 0, createdAt: new Date(1000) });
    setEntry(b._id!, { up: 5, down: 5, createdAt: new Date(3000) });
    setEntry(c._id!, { up: 3, down: 1, createdAt: new Date(2000) });

    const top = (await ForumsApi.readBoard(board, 'top')).map((e) => e.getTitle());
    expect(top).toEqual(['A', 'C', 'B']); // 10, 2, 0

    const fresh = (await ForumsApi.readBoard(board, 'new')).map((e) => e.getTitle());
    expect(fresh).toEqual(['B', 'C', 'A']); // 3000, 2000, 1000

    const controversial = (
      await ForumsApi.readBoard(board, 'controversial')
    ).map((e) => e.getTitle());
    expect(controversial[0]).toBe('B'); // balanced 5/5 wins
  });

  it('anti-snowball hides the displayed score until K votes / T minutes', async () => {
    const { creator, board } = await freshBoard();
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    // Fresh entry, < 5 votes, < 30 min → display hidden.
    setEntry(thread._id!, { up: 2, down: 0, createdAt: new Date() });
    const fresh = await ForumsApi.getEntry(thread._id!);
    expect(await ForumsApi.displayScoreFor(fresh!)).toBeNull();

    // ≥ 5 votes → revealed (true score), even though still young.
    setEntry(thread._id!, { up: 5, down: 0, createdAt: new Date() });
    const voted = await ForumsApi.getEntry(thread._id!);
    expect(await ForumsApi.displayScoreFor(voted!)).toBe(5);

    // Aged past T minutes → revealed regardless of vote count.
    setEntry(thread._id!, { up: 1, down: 0, createdAt: new Date(Date.now() - 60 * 60000) });
    const old = await ForumsApi.getEntry(thread._id!);
    expect(await ForumsApi.displayScoreFor(old!)).toBe(1);
  });
});

function voterId(actor: Stuff): string {
  return actor.stuffId;
}

function setEntry(id: string, patch: Record<string, unknown>): void {
  const doc = col(Collections.ForumEntries).get(id);
  if (!doc) throw new Error(`no entry ${id}`);
  col(Collections.ForumEntries).set(id, { ...doc, ...patch });
}

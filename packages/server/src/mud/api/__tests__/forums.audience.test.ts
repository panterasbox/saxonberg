/**
 * ⭐ The board's gates live on the forum logic, asked of the actor
 * (controller-liquidity D9): a caller that skips the controller — a bare
 * call through the actor face — is refused for a non-member (post,
 * reply, claim, vote), for a non-author non-owner edit, and fails CLOSED
 * when the board's Subject does not resolve (the controllers' copies
 * failed open).
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
import { BoardRefusal } from '../../lib/forum/Board';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  SubjectSubscriberMixin,
  type SubjectSubscriber,
} from '../../lib/forum/SubjectSubscriber';

let store: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;
let firedEvents: ForumEventFired[];
/** At each fire, the count of forum_events rows already persisted. */
let rowsPersistedAtFire: number[];
let subjects: SubjectCatalogue;

function col(name: string): Map<string, Record<string, unknown>> {
  let c = store.get(name);
  if (!c) {
    c = new Map();
    store.set(name, c);
  }
  return c;
}

class Actor extends SubjectSubscriberMixin(Idea) {}
function makeActor(): Stuff & SubjectSubscriber {
  return makeStuff(() => new Actor()) as unknown as Stuff & SubjectSubscriber;
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
      const id = (doc._id as string | undefined) ?? (idCounter++).toString(16).padStart(24, "0"); // a real id shape: getEntry refuses a word that is no id
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
  subjects = makeStuffAtPath(
    () => new SubjectCatalogue(),
    '/platform/idea/SubjectCatalogue',
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

async function gatedBoard() {
  const creator = makeActor();
  const outsider = makeActor();
  const { board } = await ForumsApi.makeForum(creator, 'Gossip', { open: true });
  // Only the creator is in the audience (the managed-group read, stubbed).
  vi.spyOn(subjects, 'isAudienceMember').mockImplementation(
    async (actor: Stuff) => actor === creator,
  );
  return { creator, outsider, board };
}

async function refusal(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    return err instanceof BoardRefusal ? err.reason : `other: ${(err as Error).message}`;
  }
  return 'admitted';
}

describe('the board gates are the forum logic\'s (D9)', () => {
  it('refuses a non-member post, reply, claim and vote; admits a member', async () => {
    const { creator, outsider, board } = await gatedBoard();
    expect(await refusal(outsider.postThread(board, 'T', 'body'))).toBe('not-member');
    const thread = await creator.postThread(board, 'T', 'body');
    expect(await refusal(outsider.replyToEntry(thread, 'me too'))).toBe('not-member');
    expect(await refusal(outsider.attachClaim(thread, 'supports', 'yes'))).toBe(
      'not-member',
    );
    expect(await refusal(outsider.castVote(thread, 'up'))).toBe('not-member');
    expect(thread.getScore()).toBe(1); // the author's own seed, nothing else
    expect(await refusal(creator.replyToEntry(thread, 'bump'))).toBe('admitted');
  });

  it('refuses an edit by neither the author nor the board owner', async () => {
    const { creator, outsider, board } = await gatedBoard();
    const thread = await creator.postThread(board, 'T', 'body');
    expect(await refusal(outsider.editEntryBody(thread, 'defaced'))).toBe('not-author');
    expect(thread.getBody()).not.toContain('defaced');
    expect(await refusal(creator.editEntryBody(thread, 'fixed'))).toBe('admitted');
  });

  it("fails closed when the board's Subject does not resolve", async () => {
    const { creator, board } = await gatedBoard();
    const thread = await creator.postThread(board, 'T', 'body');
    board.subject = 'gone';
    await board.save();
    expect(await refusal(creator.replyToEntry(thread, 'hello?'))).toBe('no-subject');
  });
});

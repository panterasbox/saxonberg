/**
 * ForumsApi end-to-end (Wave 1): the board substrate through the gated
 * facade + the Subject layer.
 *
 *   - `makeForum` mints a Subject + a popularity Board (the subject lights
 *     up its `popularity-forum` manifestation).
 *   - a thread + replies form a reply-tree; `readBoard` / `readThread`
 *     return them.
 *   - `promoteThread` mints a board-scoped thread-subject (addressable by
 *     `board/thread`) inheriting the parent's audience binding.
 *
 * Mongo is faked in-memory; the SubjectCatalogue singleton is registered
 * at its templatePath; players are treated as non-avatars (author =
 * stuffId) to skip the PlayerLogic dependency. Open subjects avoid the
 * group machinery.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForumsApi } from '../forums';
import SubjectCatalogue from '../../platform/idea/SubjectCatalogue';
import { SubjectApi } from '../subject';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { StuffApi } from '../stuff';
import { PlayerApi } from '../player';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  SubjectSubscriberMixin,
  type SubjectSubscriber,
} from '../../lib/forum/SubjectSubscriber';

let store: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;

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
  // Treat actors as non-avatars: author / owner resolve to stuffId.
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(false as never);
  // Register the SubjectCatalogue singleton the logic chain resolves.
  makeStuffAtPath(() => new SubjectCatalogue(), '/platform/idea/SubjectCatalogue');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ForumsApi.makeForum', () => {
  it('mints a Subject + popularity Board and lights the manifestation', async () => {
    const creator = makeActor();
    const { board, subject } = await ForumsApi.makeForum(creator, 'Gossip', {
      open: true,
    });
    expect(board.getOrganizer()).toBe('open');
    expect(board.getSubject()).toBe(subject._id);
    expect(subject.hasManifestation('open-forum')).toBe(true);
    expect(subject.manifestationRef('open-forum')).toBe(board._id);

    // Resolvable by its flat handle.
    const view = await ForumsApi.resolveBoardByHandle('GOSSIP');
    expect(view?.board._id).toBe(board._id);
  });
});

describe('ForumsApi threads + replies', () => {
  it('builds a reply tree readable via readBoard / readThread', async () => {
    const creator = makeActor();
    const { board } = await ForumsApi.makeForum(creator, 'Gossip', {
      open: true,
    });
    const thread = await creator.postThread(
      board,
      'Best soup?',
      'What is the best soup?'
    );
    const reply = await creator.replyToEntry(thread, 'Tomato, obviously.');

    const threads = await ForumsApi.readBoard(board);
    expect(threads).toHaveLength(1);
    expect(threads[0]!.getTitle()).toBe('Best soup?');

    const { root, posts } = await ForumsApi.readThread(thread);
    expect(root._id).toBe(thread._id);
    expect(posts).toHaveLength(1);
    expect(posts[0]!._id).toBe(reply._id);
  });

  it('readThread returns the nested subtree only, scoped to this thread', async () => {
    const creator = makeActor();
    const { board } = await ForumsApi.makeForum(creator, 'Gossip', {
      open: true,
    });
    // Thread A with a comment and a nested reply-to-the-comment.
    const a = await creator.postThread(board, 'A', 'a');
    const c1 = await creator.replyToEntry(a, 'comment on A');
    const c2 = await creator.replyToEntry(c1, 'nested reply to the comment');
    // A SEPARATE thread B (same board) with its own reply.
    const b = await creator.postThread(board, 'B', 'b');
    const bReply = await creator.replyToEntry(b, 'comment on B');

    const { posts } = await ForumsApi.readThread(a);
    const ids = posts.map((p) => p._id);
    // A's subtree = the comment + the nested reply; NOT B's reply or B.
    expect(ids).toEqual(expect.arrayContaining([c1._id, c2._id]));
    expect(ids).not.toContain(bReply._id);
    expect(ids).not.toContain(b._id);
    expect(posts).toHaveLength(2);
    // The nesting edge: c2 hangs off c1, c1 off the thread root.
    expect(c2.getParent()).toBe(c1._id);
    expect(c1.getParent()).toBe(a._id);
  });
});

describe('ForumsApi.promoteThread', () => {
  it('mints a board-scoped thread-subject inheriting the parent binding', async () => {
    const creator = makeActor();
    const { board, subject } = await ForumsApi.makeForum(creator, 'Gossip', {
      open: true,
    });
    const thread = await creator.postThread(board, 'Best soup?', 'body');

    const threadSubject = await creator.promoteThread(
      thread,
      'best-soup'
    );
    expect(threadSubject.getGrain()).toBe('topic');
    expect(threadSubject.getTitle()).toBe('Gossip/best-soup');
    expect(threadSubject.getParentSubject()).toBe(subject._id);
    // Inherits the parent's (open) audience binding.
    expect(threadSubject.isOpen()).toBe(true);

    // The thread now carries its thread-subject; addressable board-scoped.
    const reloaded = await ForumsApi.getEntry(thread._id!);
    expect(reloaded!.getSubject()).toBe(threadSubject._id);
    const byHandle = await SubjectApi.resolveBoardScoped('Gossip', 'best-soup');
    expect(byHandle?._id).toBe(threadSubject._id);
  });
});

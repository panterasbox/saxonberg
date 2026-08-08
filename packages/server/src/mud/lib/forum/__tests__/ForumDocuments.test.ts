/**
 * Board / Entry persistence — plain `Document`s in `forum_boards` /
 * `forum_entries`. Covers field round-trip + the Thread(root)/Post(child)
 * reply-tree shape (`parent: null` = thread; `parent: <id>` = post).
 *
 * Mongo is faked in-memory.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Board from '../Board';
import Entry from '../Entry';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

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

beforeEach(() => {
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Board', () => {
  it('round-trips + belongs to a subject', async () => {
    const b = new Board();
    b.subject = 'subj-1';
    b.organizer = 'popularity';
    b.name = 'Gossip';
    b.description = 'idle chatter';
    await b.save();

    const [f] = await Board.find({ subject: 'subj-1' });
    expect(f!.getOrganizer()).toBe('popularity');
    expect(f!.getName()).toBe('Gossip');
    expect(f!.getDescription()).toBe('idle chatter');
  });

  it('round-trips the argument organizer', async () => {
    const b = new Board();
    b.subject = 'subj-2';
    b.organizer = 'argument';
    b.name = 'Ranked-choice voting';
    await b.save();

    const [f] = await Board.find({ subject: 'subj-2' });
    expect(f!.getOrganizer()).toBe('argument');
  });
});

describe('Entry', () => {
  it('a Thread holds a Post reply-tree', async () => {
    const thread = new Entry();
    thread.board = 'board-1';
    thread.parent = null;
    thread.author = 'p1';
    thread.title = 'Best soup?';
    thread.body = 'What is the best soup?';
    await thread.save();
    expect(thread.isRoot()).toBe(true);

    const post = new Entry();
    post.board = 'board-1';
    post.parent = thread._id!;
    post.author = 'p2';
    post.body = 'Tomato, obviously.';
    await post.save();
    expect(post.isRoot()).toBe(false);

    const roots = await Entry.find({ board: 'board-1', parent: null });
    expect(roots).toHaveLength(1);
    expect(roots[0]!.getTitle()).toBe('Best soup?');

    const children = await Entry.find({ parent: thread._id });
    expect(children).toHaveLength(1);
    expect(children[0]!.getBody()).toBe('Tomato, obviously.');
  });

  it('net score is up − down', () => {
    const e = new Entry();
    e.up = 5;
    e.down = 2;
    expect(e.getScore()).toBe(3);
  });

  it('round-trips a typed argument edge', async () => {
    const claim = new Entry();
    claim.board = 'board-2';
    claim.parent = 'spine-1';
    claim.author = 'p3';
    claim.relation = 'objects-to';
    claim.body = 'Ballots are harder to count.';
    await claim.save();

    const [f] = await Entry.find({ board: 'board-2' });
    expect(f!.getRelation()).toBe('objects-to');
    expect(f!.isRoot()).toBe(false);
  });
});

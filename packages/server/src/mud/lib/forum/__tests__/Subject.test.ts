/**
 * Subject persistence — a plain `Document` (one row per subject) in the
 * `forum_subjects` collection. Covers: field round-trip through save /
 * find; manifestations (the lit-surface list) survive; the methods-only
 * accessor surface; `resolveByTitle`-style case keying is the
 * catalogue's job (tested there).
 *
 * Mongo is faked with an in-memory collection (the chronicle/belief
 * harness).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Subject from '../Subject';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Subject', () => {
  it('round-trips its fields through save/find', async () => {
    const s = new Subject();
    s.title = 'Gossip';
    s.owner = '/obj/Avatar/p1';
    s.groupRef = 'managed:g1';
    s.grain = 'venue';
    s.addManifestation('free-chat', 'chan-1');
    s.addManifestation('popularity-forum', 'board-1');
    await s.save();

    const found = await Subject.find({ title: 'Gossip' });
    expect(found).toHaveLength(1);
    const f = found[0]!;
    expect(f.getOwner()).toBe('/obj/Avatar/p1');
    expect(f.getGroupRef()).toBe('managed:g1');
    expect(f.getGrain()).toBe('venue');
    expect(f.isOpen()).toBe(false);
    expect(f.hasManifestation('free-chat')).toBe(true);
    expect(f.hasManifestation('popularity-forum')).toBe(true);
    expect(f.hasManifestation('argument-forum')).toBe(false);
    expect(f.manifestationRef('free-chat')).toBe('chan-1');
  });

  it('an open subject has an empty groupRef', async () => {
    const s = new Subject();
    s.title = 'Global';
    s.groupRef = '';
    await s.save();
    const [f] = await Subject.find({ title: 'Global' });
    expect(f!.isOpen()).toBe(true);
  });

  it('addManifestation is idempotent on surface (at most one of each)', () => {
    const s = new Subject();
    s.addManifestation('free-chat', 'chan-1');
    s.addManifestation('free-chat', 'chan-2');
    expect(s.getManifestations()).toHaveLength(1);
    expect(s.manifestationRef('free-chat')).toBe('chan-2');
  });

  it('persists thread-grain fields (board-scoped handle)', async () => {
    const s = new Subject();
    s.title = 'gossip/best-soup';
    s.owner = '/obj/Avatar/p1';
    s.grain = 'topic';
    s.parentSubject = 'subj-parent';
    s.boardScopedName = 'best-soup';
    await s.save();

    const [f] = await Subject.find({ title: 'gossip/best-soup' });
    expect(f!.getGrain()).toBe('topic');
    expect(f!.getParentSubject()).toBe('subj-parent');
    expect(f!.getBoardScopedName()).toBe('best-soup');
  });
});

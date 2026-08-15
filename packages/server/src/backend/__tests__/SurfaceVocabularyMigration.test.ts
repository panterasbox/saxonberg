/**
 * The ordered/open rename's migration.
 *
 * ⚠⚠ **Without this, the rename orphans every existing row.** A subject
 * keeps `manifestations` naming surfaces the code no longer knows, so it
 * is still listed and still visible — with no surfaces. Not an error, not
 * a crash: a subject that quietly lost its forum. That is the same
 * silent-failure shape as the dropped subscription scope, and the reason
 * the rename was done with a migration rather than a DB wipe.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Collections, PersistenceManager } from '../PersistenceManager';
import { SurfaceVocabularyMigration } from '../SurfaceVocabularyMigration';

let store: Map<string, Map<string, Record<string, unknown>>>;
let ids = 0;

function col(name: string): Map<string, Record<string, unknown>> {
  let c = store.get(name);
  if (!c) {
    c = new Map();
    store.set(name, c);
  }
  return c;
}

function seed(collection: string, doc: Record<string, unknown>): string {
  const id = doc._id as string | undefined ?? `id-${ids++}`;
  col(collection).set(id, { ...doc, _id: id });
  return id;
}

beforeEach(() => {
  store = new Map();
  ids = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, query: Record<string, unknown>) =>
      [...col(c).values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${ids++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    },
  );
});
afterEach(() => vi.restoreAllMocks());

describe('SurfaceVocabularyMigration', () => {
  it('renames every surface a subject has lit', async () => {
    const id = seed(Collections.ForumSubjects, {
      title: 'Measure',
      manifestations: [
        { surface: 'argument-forum', ref: 'b1' },
        { surface: 'popularity-forum', ref: 'b2' },
        { surface: 'free-chat', ref: 'c1' },
        { surface: 'rules-chat', ref: 'c2' },
      ],
    });
    await SurfaceVocabularyMigration.run();
    const mans = col(Collections.ForumSubjects).get(id)!
      .manifestations as Array<{ surface: string; ref: string }>;
    expect(mans.map((m) => m.surface)).toEqual([
      'ordered-forum',
      'open-forum',
      'open-chat',
      'ordered-chat',
    ]);
    // ⭐ The refs are untouched — a rename of the LABEL must not move
    // which board a surface points at.
    expect(mans.map((m) => m.ref)).toEqual(['b1', 'b2', 'c1', 'c2']);
  });

  it('⭐ handles a subject holding TWO surfaces needing different renames', async () => {
    // The case a positional `$set` cannot express in one update, and the
    // reason subjects are read-modify-write here.
    const id = seed(Collections.ForumSubjects, {
      manifestations: [
        { surface: 'argument-forum', ref: 'b1' },
        { surface: 'free-chat', ref: 'c1' },
      ],
    });
    await SurfaceVocabularyMigration.run();
    const mans = col(Collections.ForumSubjects).get(id)!
      .manifestations as Array<{ surface: string }>;
    expect(mans.map((m) => m.surface)).toEqual(['ordered-forum', 'open-chat']);
  });

  it('renames board organizers and channel procedures', async () => {
    const arg = seed(Collections.ForumBoards, { organizer: 'argument' });
    const pop = seed(Collections.ForumBoards, { organizer: 'popularity' });
    const free = seed(Collections.Channels, { procedure: 'free' });
    const rules = seed(Collections.Channels, { procedure: 'rules-of-order' });

    const out = await SurfaceVocabularyMigration.run();

    expect(col(Collections.ForumBoards).get(arg)!.organizer).toBe('ordered');
    expect(col(Collections.ForumBoards).get(pop)!.organizer).toBe('open');
    expect(col(Collections.Channels).get(free)!.procedure).toBe('open');
    expect(col(Collections.Channels).get(rules)!.procedure).toBe('ordered');
    expect(out.boards).toBe(2);
    expect(out.channels).toBe(2);
  });

  it('⚠ is idempotent — a second run is a no-op', async () => {
    seed(Collections.ForumSubjects, {
      manifestations: [{ surface: 'argument-forum', ref: 'b1' }],
    });
    seed(Collections.ForumBoards, { organizer: 'argument' });

    const first = await SurfaceVocabularyMigration.run();
    const second = await SurfaceVocabularyMigration.run();

    expect(first.subjects).toBe(1);
    expect(first.boards).toBe(1);
    // It matches only the OLD values, so a half-migrated database
    // converges and a re-run costs nothing.
    expect(second).toEqual({ subjects: 0, boards: 0, channels: 0 });
  });

  it('leaves already-renamed rows alone', async () => {
    const id = seed(Collections.ForumSubjects, {
      manifestations: [{ surface: 'ordered-forum', ref: 'b1' }],
    });
    const out = await SurfaceVocabularyMigration.run();
    expect(out.subjects).toBe(0);
    expect(
      (col(Collections.ForumSubjects).get(id)!.manifestations as Array<{
        surface: string;
      }>)[0]!.surface,
    ).toBe('ordered-forum');
  });

  it('does nothing without a database rather than throwing', async () => {
    vi.spyOn(PersistenceManager.get(), 'isConnected').mockReturnValue(false);
    await expect(SurfaceVocabularyMigration.run()).resolves.toEqual({
      subjects: 0,
      boards: 0,
      channels: 0,
    });
  });
});

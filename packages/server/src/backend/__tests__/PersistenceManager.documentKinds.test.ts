/**
 * The declared document kinds (content-packs wave 2, step 1): one unique
 * partial index per FLAT-KEY kind in `documents`, none for the
 * path-keyed ones; the nightly reset keeps every declared kind (plus
 * releases) — or the world loses its emotes at 04:00; and the one-time
 * `script` → `msh` kind rename is idempotent.
 */

import '../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PersistenceManager, Collections } from '../PersistenceManager';
import { RESET_DISPOSITIONS } from '../../mud/lib/persistence/ResetPolicy';
import {
  DOCUMENT_KINDS,
  DECLARED_DOCUMENT_KINDS,
  FLAT_KEY_DOCUMENT_KINDS,
} from '../../mud/lib/document/DocumentKinds';
import { RELEASE_DOCUMENT_KIND } from '../../mud/lib/press/Release';

afterEach(() => vi.restoreAllMocks());

describe('document-kind indexes', () => {
  it('creates one unique partial {kind, data.<naturalKey>} index per flat-key kind', async () => {
    const createIndex = vi.fn(async () => 'ok');
    await PersistenceManager.get().runDocumentKindIndexesForTest({ createIndex });
    expect(createIndex).toHaveBeenCalledTimes(FLAT_KEY_DOCUMENT_KINDS.length);
    for (const k of FLAT_KEY_DOCUMENT_KINDS) {
      const spec = DOCUMENT_KINDS[k];
      expect(createIndex).toHaveBeenCalledWith(
        { kind: 1, [`data.${spec.naturalKey}`]: 1 },
        { unique: true, partialFilterExpression: { kind: spec.kind } },
      );
    }
    const indexed = createIndex.mock.calls.map(
      (c) => (c as unknown as [Record<string, unknown>, { partialFilterExpression: { kind: string } }])[1]
        .partialFilterExpression.kind,
    );
    for (const pathKeyed of ['msh', 'release', 'command-view']) {
      expect(indexed).not.toContain(pathKeyed);
    }
  });
});

describe('the reset policy over documents', () => {
  it('keeps releases AND every declared document kind', () => {
    const d = RESET_DISPOSITIONS[Collections.Documents];
    expect(d.verb).toBe('wipe-except');
    const keep = (d as unknown as { keep: { kind: { $in: string[] } } }).keep.kind.$in;
    expect(keep).toContain(RELEASE_DOCUMENT_KIND);
    for (const k of DECLARED_DOCUMENT_KINDS) expect(keep).toContain(DOCUMENT_KINDS[k].kind);
  });
});

describe('the script → msh kind rename', () => {
  function fakeDb(rows: Array<Record<string, unknown>>) {
    const updateOne = vi.fn(async (q: Record<string, unknown>, u: Record<string, unknown>) => {
      const row = rows.find((r) => r._id === q._id)!;
      Object.assign(row, (u.$set as Record<string, unknown>) ?? {});
    });
    return {
      rows,
      updateOne,
      collection: (_name: string) => ({
        find: (q: Record<string, unknown>) => ({
          toArray: async () => rows.filter((r) => Object.entries(q).every(([k, v]) => r[k] === v)),
        }),
        updateOne,
      }),
    };
  }

  it('renames the kind, moves the lounge path prefix, and is a no-op on the second boot', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const db = fakeDb([
      { _id: 1, path: '/domain/lounge/scripts/martini', kind: 'script', data: { source: 'x' } },
      { _id: 2, path: '/home/iris/scripts/wave', kind: 'script', data: { source: 'y' } },
      { _id: 3, path: '/emotes/grin', kind: 'emote', data: {} },
    ]);
    const pm = PersistenceManager.get();
    expect(await pm.runScriptKindMigrationForTest(db)).toBe(2);
    expect(db.rows[0]).toMatchObject({ path: '/domain/lounge/msh/martini', kind: 'msh' });
    expect(db.rows[1]).toMatchObject({ path: '/home/iris/scripts/wave', kind: 'msh' });
    expect(db.rows[2]).toMatchObject({ kind: 'emote' });
    // second boot
    expect(await pm.runScriptKindMigrationForTest(db)).toBe(0);
    expect(db.updateOne).toHaveBeenCalledTimes(2);
  });
});

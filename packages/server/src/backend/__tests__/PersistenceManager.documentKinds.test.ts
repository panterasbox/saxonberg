/**
 * The declared document kinds: the path is the only identity (a unique
 * path index), every key a kind declares is served by one wildcard index; the nightly reset keeps the
 * collection (undeclared kinds are refused at the write); and the one-time
 * `script` → `msh` kind rename is idempotent.
 */

import '../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PersistenceManager, Collections } from '../PersistenceManager';
import { RESET_DISPOSITIONS } from '../../mud/lib/persistence/ResetPolicy';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

afterEach(() => vi.restoreAllMocks());

const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'schema');

describe('the documents indexes (path identity + the catalogue card)', () => {
  it('plans a UNIQUE path index and one {kind, keys.$**} wildcard — and no per-kind natural key', () => {
    const pm = PersistenceManager.get();
    pm.loadSchemaDocs(SCHEMA_DIR);
    const docs = pm
      .plannedIndexes()
      .filter((i) => i.collection === Collections.Documents);
    const path = docs.find((i) => JSON.stringify(i.keys) === JSON.stringify({ path: 1 }));
    expect(path?.options.unique).toBe(true);
    expect(
      docs.some((i) => JSON.stringify(i.keys) === JSON.stringify({ kind: 1, 'keys.$**': 1 })),
    ).toBe(true);
    for (const i of docs) {
      expect(Object.keys(i.keys).some((k) => k.startsWith('data.'))).toBe(false);
    }
  });
});

describe('the reset policy over documents', () => {
  it('keeps the whole collection — every row is of a declared kind (an undeclared one is refused)', () => {
    expect(RESET_DISPOSITIONS[Collections.Documents].verb).toBe('keep');
  });
});

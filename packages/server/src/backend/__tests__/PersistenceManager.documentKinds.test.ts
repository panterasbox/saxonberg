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

/**
 * The install-set flat-key uniqueness check (pack-installer W1.5, slate
 * A17.2): a natural key claimed twice across the install set — or twice in
 * one pack — fails the CLAIMING pack before any of its writes, naming
 * the kind, the key, and both claimants; the innocent pack applies. A
 * path-keyed kind (name-bank, since 2026-11-08) is no such namespace.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  nameBankRows,
  recordOf,
  writePack,
  writeDocumentFile,
  rowsOfKind,
  cleanupPacks,
} from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

describe('a path-keyed document kind is not a flat namespace (name-bank)', () => {
  it('two packs each shipping `common` install two banks, each at its own root', async () => {
    const a = writePack('alpha', [{ rel: 'stuff/idea/material/a.yaml' }], {
      nameBanks: [{ key: 'common', given: ['A'], surname: ['A'] }],
    });
    const b = writePack('beta', [{ rel: 'stuff/idea/material/b.yaml' }], {
      nameBanks: [{ key: 'common', given: ['B'], surname: ['B'] }],
    });
    const results = await PackApi.install([a, b]);
    expect(results.every((r) => r.failure === null)).toBe(true);
    expect(nameBankRows().map((r) => r.path).sort()).toEqual([
      '/alpha/name-banks/common',
      '/beta/name-banks/common',
    ]);
  });

  it('within one pack, a directory is part of the path: two `common` files are two banks', async () => {
    const root = writePack('p', [], {
      nameBanks: [
        { key: 'common', given: ['A'], surname: ['A'] },
        { key: 'common', given: ['B'], surname: ['B'], dir: 'extra' },
      ],
    });
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(nameBankRows().map((row) => row.path).sort()).toEqual([
      '/p/name-banks/common',
      '/p/name-banks/extra/common',
    ]);
  });
});

describe('flat-key over a document kind (emote)', () => {
  it('two packs shipping the same verb: the second claimant fails pre-write, the first applies', async () => {
    const grin = { verb: 'grin', grammar: { slots: {}, template: 'grins' } };
    const a = writePack('a', [], { root: '/a' });
    writeDocumentFile(a, 'emotes', 'grin', grin);
    const b = writePack('b', [], { root: '/b' });
    writeDocumentFile(b, 'emotes', 'grin', grin);
    const [ra, rb] = await PackApi.install([a, b]);
    expect(ra!.failure).toBeNull();
    expect(ra!.inserted).toEqual(['/emotes/grin']);
    expect(rb!.failure?.step).toBe('flat-key');
    expect(rb!.failure?.error).toMatch(/emote document key 'grin'/);
    expect(rowsOfKind('emote')).toHaveLength(1);
    expect(recordOf('b')!.status).toBe('failed');
  });

  it('within one pack: two files claiming one verb abort that pack', async () => {
    const grin = { verb: 'grin', grammar: { slots: {}, template: 'grins' } };
    const p = writePack('p', [{ rel: 'stuff/idea/material/a.yaml' }], { root: '/p' });
    writeDocumentFile(p, 'emotes', 'grin', grin);
    writeDocumentFile(p, 'emotes/extra', 'grin', grin);
    const [r] = await PackApi.install([p]);
    expect(r!.failure?.step).toBe('flat-key');
    expect(r!.failure?.error).toContain('emotes/grin.yaml');
    expect(r!.failure?.error).toContain('emotes/extra/grin.yaml');
    expect(contentRows()).toHaveLength(0);
    expect(rowsOfKind('emote')).toHaveLength(0);
  });

  it('sync of a pack whose verb collides with a sibling refuses', async () => {
    const grin = { verb: 'grin', grammar: { slots: {}, template: 'grins' } };
    const a = writePack('alpha', [], { root: '/alpha' });
    writeDocumentFile(a, 'emotes', 'grin', grin);
    const b = writePack('beta', [], { root: '/beta' });
    writeDocumentFile(b, 'emotes', 'grin', grin);
    await PackApi.install([a]);
    await expect(PackApi.sync('beta', b, [a, b])).rejects.toThrow(/'grin'.*alpha|alpha.*'grin'/);
    expect(rowsOfKind('emote').map((r) => r.sourcePack)).toEqual(['alpha']);
  });
});

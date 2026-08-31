/**
 * The install read window.
 *
 * A pack's plan needs the rows that pack stamped. Asked the natural way
 * — `{ sourcePack, kind }` — that is one round trip per (pack, kind),
 * and on the shipped world that was two hundred queries against one
 * collection: the largest remaining cost of a boot.
 *
 * Inside one `install()`, the `sourcePack` term moves out of the query
 * and into a filter. These tests hold both halves of that: the reads
 * really do collapse, and each pack really does still see only its own
 * rows.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { PersistApi } from '../../../../api/persist';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  writePack,
  writeDocumentFile,
  writeScriptFile,
  stubPersist,
  stubClassResolution,
  quietConsole,
  cleanupPacks,
  documentRows,
} from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

/** A pack shipping one emote and one script, both named for the pack. */
function twoKindPack(id: string): string {
  const root = writePack(id, [], { root: `/${id}` });
  writeScriptFile(root, id, `# ${id}\nping\n`);
  writeDocumentFile(root, 'emotes', id, {
    verb: id,
    grammar: { slots: {}, template: `${id}s` },
  });
  return root;
}

/** Every `documents` read issued so far, as its query object. */
function documentQueries(): Record<string, unknown>[] {
  return (PersistApi.find as unknown as Mock).mock.calls
    .filter((c) => c[0] === 'documents')
    .map((c) => c[1] as Record<string, unknown>);
}

describe('the install read window', () => {
  it('reads a kind once for the whole install, not once per pack', async () => {
    const roots = [twoKindPack('alpha'), twoKindPack('beta')];

    await PackApi.install(roots);

    const queries = documentQueries();

    // No read carries a `sourcePack` term any more: the pack's slice is
    // taken in memory.
    expect(queries.filter((q) => 'sourcePack' in q)).toEqual([]);

    // And no stamped-set read — `{ kind }` on its own, as against the
    // `{ kind, path }` existence check a single file makes — is issued
    // twice. That is the invariant, whatever the kind vocabulary grows
    // to and however many packs install: N packs, one read per kind.
    const stamped = queries
      .filter((q) => Object.keys(q).length === 1 && 'kind' in q)
      .map((q) => String(q.kind));
    expect(stamped.length).toBeGreaterThan(0);
    expect(stamped).toEqual([...new Set(stamped)]);
  });

  it('still gives each pack only its own rows', async () => {
    const roots = [twoKindPack('alpha'), twoKindPack('beta')];

    const results = await PackApi.install(roots);

    const alpha = results.find((r) => r.packId === 'alpha')!;
    const beta = results.find((r) => r.packId === 'beta')!;
    expect(alpha.inserted.sort()).toEqual(['/emotes/alpha', '/msh/alpha']);
    expect(beta.inserted.sort()).toEqual(['/emotes/beta', '/msh/beta']);
    // The failure this guards against: one pack reading the other's rows
    // as its own, and deleting them as vanished files.
    expect(alpha.deleted).toEqual([]);
    expect(beta.deleted).toEqual([]);
    expect(documentRows()).toHaveLength(4);
  });

  it('is idempotent — a second install of both packs changes nothing', async () => {
    const roots = [twoKindPack('alpha'), twoKindPack('beta')];
    await PackApi.install(roots);

    const again = await PackApi.install(roots);

    for (const r of again) {
      expect(r.inserted).toEqual([]);
      expect(r.deleted).toEqual([]);
      expect(r.conflicts).toEqual([]);
    }
    expect(documentRows()).toHaveLength(4);
  });

  it('a vanished file is still deleted, and only from its own pack', async () => {
    const roots = [twoKindPack('alpha'), twoKindPack('beta')];
    await PackApi.install(roots);

    // alpha loses its emote; beta is untouched.
    const alphaOnlyScript = writePack('alpha', [], { root: '/alpha' });
    writeScriptFile(alphaOnlyScript, 'alpha', '# alpha\nping\n');
    const results = await PackApi.install([alphaOnlyScript, roots[1]!]);

    const alpha = results.find((r) => r.packId === 'alpha')!;
    const beta = results.find((r) => r.packId === 'beta')!;
    expect(alpha.deleted).toEqual(['/emotes/alpha']);
    expect(beta.deleted).toEqual([]);
    expect(documentRows()).toHaveLength(3);
  });
});

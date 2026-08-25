/**
 * The `document` contribution kind (content-packs wave 2): a declared
 * document kind's files land in `documents` at `root + key`, owned by
 * the pack `root`, stamped, and ride the same three-way machine as the
 * domain kind. Proven here over `msh` (path-keyed) with the full !198
 * matrix, plus the manifest `root` rules, `--export` for a text kind,
 * and the load-bearing `stampedQuery` (a pack shipping two document
 * kinds must never see one kind's rows as the other's vanished files).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { PackApi } from '../../../api/pack';
import { DiagnosticApi } from '../../../api/diagnostics';
import {
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  documentRows,
  rowsOfKind,
  recordOf,
  writePack,
  writeScriptFile,
  writeDocumentFile,
  cleanupPacks,
} from './pack-harness';

let diag: MockInstance<typeof DiagnosticApi.record>;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  diag = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const KEY = '/msh/a';
const src = (v: number): string => `# v${v}\nping\n`;

async function installMsh(root = '/x'): Promise<string> {
  const packRoot = writePack('p', [], { root });
  writeScriptFile(packRoot, 'a', src(0));
  await PackApi.install([packRoot]);
  return packRoot;
}
const mshRow = () => rowsOfKind('msh').find((r) => r.path === '/x/msh/a');
const dbSource = () => (mshRow()?.data as { source: string } | undefined)?.source;
const editDb = (v: number): void => {
  mshRow()!.data = { source: src(v) };
};

describe('the msh document kind — install shape', () => {
  it('lands at root + key, owned by root, kind msh, data.source verbatim, stamped', async () => {
    const [r] = await (async () => {
      const packRoot = writePack('p', [], { root: '/x' });
      writeScriptFile(packRoot, 'a', src(0));
      return PackApi.install([packRoot]);
    })();
    expect(r!.inserted).toEqual([KEY]);
    expect(r!.documents).toEqual({ msh: 1 });
    expect(documentRows()).toHaveLength(1);
    expect(mshRow()).toMatchObject({
      path: '/x/msh/a',
      owner: '/x',
      kind: 'msh',
      data: { source: src(0) },
      sourcePack: 'p',
    });
    const baseline = recordOf('p')!.rows[KEY]!;
    expect(baseline.kind).toBe('document:msh');
    expect(JSON.parse(baseline.body)).toEqual({ data: { source: src(0) } });
  });

  it('root omitted defaults to /<id>', async () => {
    const packRoot = writePack('lounge', []);
    writeScriptFile(packRoot, 'a', src(0));
    await PackApi.install([packRoot]);
    expect(rowsOfKind('msh')[0]).toMatchObject({ path: '/lounge/msh/a', owner: '/lounge' });
  });

  it('a root without a leading slash is a malformed manifest (refused at discovery, like a missing id)', async () => {
    const packRoot = writePack('p', [], { root: 'x' });
    writeScriptFile(packRoot, 'a', src(0));
    await expect(PackApi.install([packRoot])).rejects.toThrow(/malformed 'root'/);
    expect(documentRows()).toHaveLength(0);
  });

  it('second install is all-zero', async () => {
    const packRoot = await installMsh();
    const [r] = await PackApi.install([packRoot]);
    expect([...r!.inserted, ...r!.updated, ...r!.adopted, ...r!.deleted, ...r!.kept, ...r!.conflicts]).toEqual([]);
    expect(r!.documents).toEqual({ msh: 0 });
  });

  it('a stamped row at the path from a pre-record DB is adopted in place', async () => {
    store.rows.push({
      _id: 'legacy',
      __col: 'documents',
      path: '/x/msh/a',
      owner: '/x',
      kind: 'msh',
      data: { source: 'old' },
    });
    const packRoot = writePack('p', [], { root: '/x' });
    writeScriptFile(packRoot, 'a', src(0));
    const [r] = await PackApi.install([packRoot]);
    expect(r!.adopted).toEqual([KEY]);
    expect(rowsOfKind('msh')).toHaveLength(1);
    expect(mshRow()).toMatchObject({ _id: 'legacy', sourcePack: 'p', data: { source: src(0) } });
  });
});

describe('the msh document kind — three-way matrix', () => {
  it('same / same → nothing', async () => {
    const packRoot = await installMsh();
    const before = structuredClone(store.rows);
    const r = await PackApi.sync('p', packRoot);
    expect([...r.inserted, ...r.updated, ...r.adopted, ...r.deleted, ...r.kept, ...r.conflicts]).toEqual([]);
    const strip = (rows: typeof store.rows) => rows.map((x) => ({ ...x, appliedAt: undefined }));
    expect(strip(store.rows)).toEqual(strip(before));
  });

  it('file changed / DB same → update silently, baseline := file', async () => {
    const packRoot = await installMsh();
    const h0 = recordOf('p')!.rows[KEY]!.hash;
    writeScriptFile(packRoot, 'a', src(1));
    const r = await PackApi.sync('p', packRoot);
    expect(r.updated).toEqual([KEY]);
    expect(dbSource()).toBe(src(1));
    expect(recordOf('p')!.rows[KEY]!.hash).not.toBe(h0);
    expect(diag).not.toHaveBeenCalled();
  });

  it('file same / DB changed → kept', async () => {
    const packRoot = await installMsh();
    const h0 = recordOf('p')!.rows[KEY]!.hash;
    editDb(7);
    const r = await PackApi.sync('p', packRoot);
    expect(r.kept).toEqual([KEY]);
    expect(dbSource()).toBe(src(7));
    expect(recordOf('p')!.rows[KEY]!.hash).toBe(h0);
  });

  it('both changed, file ≠ DB → conflict recorded with the document kind label, one diagnostic', async () => {
    const packRoot = await installMsh();
    writeScriptFile(packRoot, 'a', src(1));
    editDb(2);
    const r = await PackApi.sync('p', packRoot);
    expect(r.conflicts).toEqual([KEY]);
    expect(dbSource()).toBe(src(2));
    expect(recordOf('p')!.conflicts[0]).toMatchObject({
      path: KEY,
      kind: 'document:msh',
      reason: 'both-changed',
    });
    expect(diag).toHaveBeenCalledTimes(1);
    await PackApi.sync('p', packRoot);
    expect(diag).toHaveBeenCalledTimes(1);
  });

  it('both changed, file == DB → converged, no write', async () => {
    const packRoot = await installMsh();
    writeScriptFile(packRoot, 'a', src(1));
    editDb(2);
    await PackApi.sync('p', packRoot);
    writeScriptFile(packRoot, 'a', src(2));
    const before = structuredClone(rowsOfKind('msh'));
    const r = await PackApi.sync('p', packRoot);
    expect(r.conflicts).toEqual([]);
    expect(r.updated).toEqual([]);
    expect(rowsOfKind('msh')).toEqual(before);
    expect(recordOf('p')!.conflicts).toEqual([]);
  });

  it('vanished file, DB clean → delete row + drop baseline', async () => {
    const packRoot = await installMsh();
    rmSync(join(packRoot, 'content', 'msh', 'a.msh'));
    const r = await PackApi.sync('p', packRoot);
    expect(r.deleted).toEqual([KEY]);
    expect(rowsOfKind('msh')).toHaveLength(0);
    expect(recordOf('p')!.rows[KEY]).toBeUndefined();
  });

  it('vanished file, DB edited → deleted-vs-edited, row kept', async () => {
    const packRoot = await installMsh();
    editDb(5);
    rmSync(join(packRoot, 'content', 'msh', 'a.msh'));
    const r = await PackApi.sync('p', packRoot);
    expect(r.deleted).toEqual([]);
    expect(r.conflicts).toEqual([KEY]);
    expect(rowsOfKind('msh')).toHaveLength(1);
  });

  it('pinned row: skipped before any comparison', async () => {
    const packRoot = await installMsh();
    recordOf('p')!.pins.push(KEY);
    writeScriptFile(packRoot, 'a', src(1));
    editDb(2);
    const r = await PackApi.sync('p', packRoot);
    expect(r.pinnedSkipped).toBe(1);
    expect(r.conflicts).toEqual([]);
    expect(dbSource()).toBe(src(2));
  });

  it('diff renders three bodies; resolve --export writes the .msh text back', async () => {
    const packRoot = await installMsh();
    writeScriptFile(packRoot, 'a', src(1));
    editDb(2);
    await PackApi.sync('p', packRoot);
    const d = await PackApi.diff('p', KEY, packRoot);
    expect(d.entries[0]!.kind).toBe('document:msh');
    expect(d.entries[0]!.baseline!.body).toContain('v0');
    expect(d.entries[0]!.yours!.body).toContain('v2');
    expect(d.entries[0]!.theirs!.body).toContain('v1');

    await PackApi.resolve('p', KEY, 'export', packRoot);
    const file = join(packRoot, 'content', 'msh', 'a.msh');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf-8')).toBe(src(2)); // verbatim text, not YAML
    const r = await PackApi.sync('p', packRoot);
    expect(r.conflicts).toEqual([]);
  });

  it('resolve --take-pack writes the file row and rebaselines', async () => {
    const packRoot = await installMsh();
    writeScriptFile(packRoot, 'a', src(1));
    editDb(2);
    await PackApi.sync('p', packRoot);
    const r = await PackApi.resolve('p', KEY, 'take-pack', packRoot);
    expect(r!.updated).toEqual([KEY]);
    expect(dbSource()).toBe(src(1));
    expect(recordOf('p')!.conflicts).toEqual([]);
  });
});

describe('stampedQuery is load-bearing: two document kinds in one pack', () => {
  it('never sees one kind’s rows as the other’s vanished files', async () => {
    const packRoot = writePack('p', [], { root: '/x' });
    writeScriptFile(packRoot, 'a', src(0));
    writeDocumentFile(packRoot, 'emotes', 'grin', {
      verb: 'grin',
      grammar: { slots: {}, template: 'grins' },
    });
    const [first] = await PackApi.install([packRoot]);
    expect(first!.inserted.sort()).toEqual(['/emotes/grin', '/msh/a']);
    expect(first!.documents).toEqual({ msh: 1, emote: 1 });
    const [again] = await PackApi.install([packRoot]);
    expect(again!.deleted).toEqual([]);
    expect(again!.conflicts).toEqual([]);
    expect(documentRows()).toHaveLength(2);
    // The domain walk under content/domain/ skips a `cmd` segment.
  });
});

describe('the domain walk skips cmd/ under content/domain/', () => {
  it('a command view in a locality is not read as a template', async () => {
    const packRoot = writePack('p', [], { root: '/x' });
    writeDocumentFile(packRoot, 'domain/x/y/cmd', 'z', { verb: 'z', help: 'no class here' });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.failure).toBeNull();
    expect(r!.inserted).toEqual([]);
  });
});

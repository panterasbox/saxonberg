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
  writeBankFile,
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

/* ───────────── the flat-key exemplar: emote ───────────── */

const GRIN = { verb: 'grin', grammar: { slots: {}, template: '{{ actor }} grins.' }, tags: [] as string[] };
const grinRow = () => rowsOfKind('emote').find((r) => (r.data as { verb: string }).verb === 'grin');

async function installEmote(): Promise<string> {
  const packRoot = writePack('p', [], { root: '/expression' });
  writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN, valence: 0 });
  await PackApi.install([packRoot]);
  return packRoot;
}

describe('the emote document kind (flat-key) — matrix', () => {
  it('installs at /expression/emotes/grin with data.verb from the file', async () => {
    await installEmote();
    expect(grinRow()).toMatchObject({
      path: '/expression/emotes/grin',
      owner: '/expression',
      kind: 'emote',
      sourcePack: 'p',
      data: { verb: 'grin', valence: 0 },
    });
    expect(recordOf('p')!.rows['/emotes/grin']!.kind).toBe('document:emote');
  });

  it('a file omitting the natural key gets it from the basename', async () => {
    const packRoot = writePack('p', [], { root: '/expression' });
    writeDocumentFile(packRoot, 'emotes', 'grin', { grammar: GRIN.grammar });
    await PackApi.install([packRoot]);
    expect((grinRow()!.data as { verb: string }).verb).toBe('grin');
  });

  it('a file whose verb ≠ basename fails the pack at read', async () => {
    const packRoot = writePack('p', [], { root: '/expression' });
    writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN, verb: 'smirk' });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.failure?.step).toBe('read');
    expect(r!.failure?.error).toMatch(/basename IS the key/);
    expect(documentRows()).toHaveLength(0);
  });

  it('file changed / DB same → update; file same / DB changed → kept', async () => {
    const packRoot = await installEmote();
    writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN, valence: 1 });
    let r = await PackApi.sync('p', packRoot);
    expect(r.updated).toEqual(['/emotes/grin']);
    expect((grinRow()!.data as { valence: number }).valence).toBe(1);

    grinRow()!.data = { ...GRIN, valence: 7 };
    r = await PackApi.sync('p', packRoot);
    expect(r.kept).toEqual(['/emotes/grin']);
    expect((grinRow()!.data as { valence: number }).valence).toBe(7);
  });

  it('both changed, file ≠ DB → conflict; file == DB → converged', async () => {
    const packRoot = await installEmote();
    writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN, valence: 1 });
    grinRow()!.data = { ...GRIN, valence: 2 };
    let r = await PackApi.sync('p', packRoot);
    expect(r.conflicts).toEqual(['/emotes/grin']);
    expect(recordOf('p')!.conflicts[0]!.kind).toBe('document:emote');
    writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN, valence: 2 });
    r = await PackApi.sync('p', packRoot);
    expect(r.conflicts).toEqual([]);
    expect(r.updated).toEqual([]);
  });

  it('vanished file, DB clean → deleted', async () => {
    const packRoot = await installEmote();
    rmSync(join(packRoot, 'content', 'emotes', 'grin.yaml'));
    const r = await PackApi.sync('p', packRoot);
    expect(r.deleted).toEqual(['/emotes/grin']);
    expect(rowsOfKind('emote')).toHaveLength(0);
  });
});

describe('adoption by natural key (the collapse bridge)', () => {
  it('adopts an unstamped migrated row at a provisional path in place — same _id, re-pathed, owned, stamped', async () => {
    store.rows.push({
      _id: 'legacy-grin',
      __col: 'documents',
      path: '/emotes/grin',
      owner: '',
      kind: 'emote',
      data: { ...GRIN, valence: 0 },
    });
    const packRoot = writePack('p', [], { root: '/expression' });
    writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN, valence: 0 });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.adopted).toEqual(['/emotes/grin']);
    expect(r!.inserted).toEqual([]);
    expect(rowsOfKind('emote')).toHaveLength(1);
    expect(grinRow()).toMatchObject({
      _id: 'legacy-grin',
      path: '/expression/emotes/grin',
      owner: '/expression',
      sourcePack: 'p',
    });
    // Second boot: nothing.
    const [again] = await PackApi.install([packRoot]);
    expect([...again!.adopted, ...again!.updated, ...again!.inserted]).toEqual([]);
  });

  it('refuses to adopt a row another pack stamped', async () => {
    store.rows.push({
      _id: 'theirs',
      __col: 'documents',
      path: '/q/emotes/grin',
      owner: '/q',
      kind: 'emote',
      data: { ...GRIN },
      sourcePack: 'q',
    });
    const packRoot = writePack('p', [], { root: '/expression' });
    writeDocumentFile(packRoot, 'emotes', 'grin', { ...GRIN });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.failure?.step).toBe('reconcile');
    expect(r!.failure?.error).toMatch(/owned by pack 'q'/);
  });
});

/* ───────────── the name-bank re-point (step 3) ───────────── */

describe('name banks ride the document kind', () => {
  it('a migrated, STAMPED row with an old-shape baseline converges: no content write, no conflict, baseline body is now {data}', async () => {
    // What the collapse left: the species-and-names row at its provisional
    // path, still stamped; and the record's old `name-banks` baseline whose
    // preimage was `{given, surname, style}`.
    store.rows.push({
      _id: 'nb-common',
      __col: 'documents',
      path: '/name-banks/common',
      owner: '',
      kind: 'name-bank',
      data: { key: 'common', given: ['A'], surname: ['B'] },
      sourcePack: 'sn',
    });
    const oldBody = JSON.stringify({ given: ['A'], surname: ['B'] });
    store.rows.push({
      _id: 'rec-sn',
      __col: 'pack_installs',
      packId: 'sn',
      version: '0.1.0',
      appliedAt: 'x',
      principal: 'bootstrap',
      status: 'applied',
      failure: null,
      parameters: {},
      rows: { '/name-banks/common': { kind: 'name-banks', hash: 'sha256:old', body: oldBody } },
      pins: [],
      conflicts: [],
      sideEffects: { kinds: [] },
    });
    const packRoot = writePack('sn', [], { root: '/sn' });
    writeBankFile(packRoot, { key: 'common', given: ['A'], surname: ['B'] });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.failure).toBeNull();
    expect([...r!.inserted, ...r!.updated, ...r!.adopted, ...r!.deleted, ...r!.conflicts]).toEqual([]);
    expect(r!.normalized).toBe(0);
    const row = rowsOfKind('name-bank')[0]!;
    expect(row._id).toBe('nb-common');
    expect(row.data).toEqual({ key: 'common', given: ['A'], surname: ['B'] }); // untouched
    // Bookkeeping only: the row now lives where the pack says.
    expect(row.path).toBe('/sn/name-banks/common');
    expect(row.owner).toBe('/sn');
    const baseline = recordOf('sn')!.rows['/name-banks/common']!;
    expect(baseline.kind).toBe('document:name-bank');
    expect(JSON.parse(baseline.body)).toEqual({ data: { key: 'common', given: ['A'], surname: ['B'] } });
    // Second boot: all-zero.
    const [again] = await PackApi.install([packRoot]);
    expect([...again!.updated, ...again!.kept, ...again!.conflicts]).toEqual([]);
    expect(again!.normalized).toBe(0);
  });
});

/* ───────────── the recipe kind: one cell + the read gate ───────────── */

describe('the recipe document kind', () => {
  const MARTINI = {
    name: 'Gin Martini',
    keywords: ['martini'],
    inputSlots: [{ slot: 'base', category: 'gin', minGrade: 'fair', measureL: 0.06 }],
    outputTemplate: '/domain/lounge/cocktail-glass',
  };

  it('installs at /generic-objects/recipes/<recipeId> and updates on a file change', async () => {
    const packRoot = writePack('g', [], { root: '/generic-objects' });
    writeDocumentFile(packRoot, 'recipes', 'martini', MARTINI);
    const [r] = await PackApi.install([packRoot]);
    expect(r!.inserted).toEqual(['/recipes/martini']);
    expect(rowsOfKind('recipe')[0]).toMatchObject({
      path: '/generic-objects/recipes/martini',
      data: { recipeId: 'martini', name: 'Gin Martini' },
    });
    writeDocumentFile(packRoot, 'recipes', 'martini', { ...MARTINI, name: 'Dry Martini' });
    const s = await PackApi.sync('g', packRoot);
    expect(s.updated).toEqual(['/recipes/martini']);
  });

  it('a recipe file with empty inputSlots fails the pack at read', async () => {
    const packRoot = writePack('g', [], { root: '/generic-objects' });
    writeDocumentFile(packRoot, 'recipes', 'martini', { ...MARTINI, inputSlots: [] });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.failure?.step).toBe('read');
    expect(r!.failure?.error).toMatch(/inputSlots/);
    expect(documentRows()).toHaveLength(0);
  });
});

/* ───────────── the blueprint kind: one cell ───────────── */

describe('the blueprint document kind', () => {
  it('installs a curated blueprint at /platform/blueprints/<id> and adopts by blueprintId', async () => {
    store.rows.push({
      _id: 'minted',
      __col: 'documents',
      path: '/blueprints/coin',
      owner: '/obj/Avatar/x',
      kind: 'blueprint',
      data: { blueprintId: 'coin', name: 'Coin', baseClass: 'Thing' },
    });
    const packRoot = writePack('platform', [], { root: '/platform' });
    writeDocumentFile(packRoot, 'blueprints', 'coin', { name: 'Coin', kind: 'concrete', baseClass: 'Thing', classPath: '/obj/Coin' });
    const [r] = await PackApi.install([packRoot]);
    expect(r!.adopted).toEqual(['/blueprints/coin']);
    expect(rowsOfKind('blueprint')[0]).toMatchObject({
      _id: 'minted',
      path: '/platform/blueprints/coin',
      owner: '/platform',
      data: { blueprintId: 'coin', classPath: '/obj/Coin' },
    });
  });
});

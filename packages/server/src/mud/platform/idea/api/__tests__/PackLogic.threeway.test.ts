/**
 * The three-way reconcile (pack-installer W1.4): the A10.4 matrix per
 * kind (domain AND name-banks separately; descriptor-banks one smoke
 * row), the converged cell, conflict surfacing (record + one diagnostic,
 * not re-fired), pins, and the vanish × (clean | diverged) branches.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { PackApi } from '../../../../api/pack';
import { DiagnosticApi } from '../../../../api/diagnostics';
import {
  MATERIAL,
  HYDRATOR,
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  nameBankRows,
  bankData,
  rowsIn,
  recordOf,
  writePack,
  writeDomainFile,
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

const GIN_REL = 'stuff/idea/material/spirit/gin.yaml';
const GIN = '/stuff/idea/material/spirit/gin';
const BANK = '/name-banks/common';

/** A kind under test: how to install, edit the file, edit the DB, and read. */
interface KindUnderTest {
  name: string;
  key: string;
  install(): Promise<string>;
  editFile(root: string, v: number): void;
  editDb(v: number): void;
  removeFile(root: string): void;
  dbValue(): unknown;
  rows(): unknown[];
}

const domainKind: KindUnderTest = {
  name: 'domain',
  key: GIN,
  async install() {
    const root = writePack('p', [{ rel: GIN_REL, data: { name: 'gin', v: 0 } }]);
    await PackApi.install([root]);
    return root;
  },
  editFile(root, v) {
    writeDomainFile(root, { rel: GIN_REL, data: { name: 'gin', v } });
  },
  editDb(v) {
    const row = contentRows().find((r) => r.path === GIN)!;
    row.data = { name: 'gin', v };
  },
  removeFile(root) {
    rmSync(join(root, 'content', GIN_REL));
  },
  dbValue() {
    return (contentRows().find((r) => r.path === GIN)?.data as { v: number } | undefined)?.v;
  },
  rows: () => contentRows(),
};

const bankKind: KindUnderTest = {
  name: 'document:name-bank',
  key: BANK,
  async install() {
    const root = writePack('p', [], {
      nameBanks: [{ key: 'common', given: ['v0'], surname: ['S'] }],
    });
    await PackApi.install([root]);
    return root;
  },
  editFile(root, v) {
    writeBankFile(root, { key: 'common', given: [`v${v}`], surname: ['S'] });
  },
  editDb(v) {
    bankData('common').given = [`v${v}`];
  },
  removeFile(root) {
    rmSync(join(root, 'content', 'name-banks', 'common.yaml'));
  },
  dbValue() {
    return nameBankRows().length ? bankData('common').given[0] : undefined;
  },
  rows: () => nameBankRows(),
};

for (const k of [domainKind, bankKind]) {
  describe(`three-way matrix — ${k.name} kind`, () => {
    it('same / same → nothing', async () => {
      const root = await k.install();
      const before = structuredClone(store.rows);
      const r = await PackApi.sync('p', root);
      expect([...r.inserted, ...r.updated, ...r.deleted, ...r.kept, ...r.conflicts]).toEqual([]);
      const after = store.rows.map((x) => ({ ...x, appliedAt: undefined }));
      expect(after).toEqual(before.map((x) => ({ ...x, appliedAt: undefined })));
    });

    it('file changed / DB same → update, silently, baseline := file', async () => {
      const root = await k.install();
      const h0 = recordOf('p')!.rows[k.key]!.hash;
      k.editFile(root, 1);
      const r = await PackApi.sync('p', root);
      expect(r.updated).toEqual([k.key]);
      expect(r.conflicts).toEqual([]);
      expect(String(k.dbValue())).toMatch(/1/);
      expect(recordOf('p')!.rows[k.key]!.hash).not.toBe(h0);
      expect(diag).not.toHaveBeenCalled();
    });

    it('file same / DB changed → keep the DB, report kept', async () => {
      const root = await k.install();
      const h0 = recordOf('p')!.rows[k.key]!.hash;
      k.editDb(7);
      const r = await PackApi.sync('p', root);
      expect(r.kept).toEqual([k.key]);
      expect(r.updated).toEqual([]);
      expect(String(k.dbValue())).toMatch(/7/);
      expect(recordOf('p')!.rows[k.key]!.hash).toBe(h0); // baseline untouched
      expect(diag).not.toHaveBeenCalled();
    });

    it('both changed, file ≠ DB → conflict: row untouched, recorded, one diagnostic, not re-fired', async () => {
      const root = await k.install();
      const h0 = recordOf('p')!.rows[k.key]!.hash;
      k.editFile(root, 1);
      k.editDb(2);
      const rowBefore = structuredClone(k.rows());
      const r = await PackApi.sync('p', root);
      expect(r.conflicts).toEqual([k.key]);
      expect(r.updated).toEqual([]);
      expect(k.rows()).toEqual(rowBefore); // byte-identical
      const rec = recordOf('p')!;
      expect(rec.conflicts).toHaveLength(1);
      expect(rec.conflicts[0]).toMatchObject({
        path: k.key,
        kind: k.name,
        reason: 'both-changed',
        baselineHash: h0,
      });
      expect(rec.conflicts[0]!.dbHash).not.toBe(rec.conflicts[0]!.packHash);
      expect(rec.rows[k.key]!.hash).toBe(h0);
      expect(diag).toHaveBeenCalledTimes(1);
      expect(diag.mock.calls[0]![0]).toMatchObject({
        severity: 'warning',
        channel: 'pack.p',
      });
      expect(String((diag.mock.calls[0]![0] as { message: string }).message)).toContain(
        `pack diff p ${k.key}`,
      );

      // Persisting conflict: still reported, NOT re-diagnosed.
      const r2 = await PackApi.sync('p', root);
      expect(r2.conflicts).toEqual([k.key]);
      expect(recordOf('p')!.conflicts).toHaveLength(1);
      expect(diag).toHaveBeenCalledTimes(1);
    });

    it('both changed, file == DB → converged: no write, baseline := shared, conflict cleared', async () => {
      const root = await k.install();
      k.editFile(root, 1);
      k.editDb(2);
      await PackApi.sync('p', root);
      expect(recordOf('p')!.conflicts).toHaveLength(1);

      // The operator exports / edits the file to match the DB.
      k.editFile(root, 2);
      const before = structuredClone(k.rows());
      const r = await PackApi.sync('p', root);
      expect(r.conflicts).toEqual([]);
      expect(r.updated).toEqual([]);
      expect(k.rows()).toEqual(before);
      const rec = recordOf('p')!;
      expect(rec.conflicts).toEqual([]);
      const conflictDbHash = rec.rows[k.key]!.hash;
      // baseline is now the shared hash: a further no-op sync sees same/same.
      const r3 = await PackApi.sync('p', root);
      expect([...r3.updated, ...r3.kept, ...r3.conflicts]).toEqual([]);
      expect(recordOf('p')!.rows[k.key]!.hash).toBe(conflictDbHash);
    });

    it('vanished file, DB clean → delete row + drop baseline', async () => {
      const root = await k.install();
      k.removeFile(root);
      const r = await PackApi.sync('p', root);
      expect(r.deleted).toEqual([k.key]);
      expect(k.rows()).toHaveLength(0);
      expect(recordOf('p')!.rows[k.key]).toBeUndefined();
    });

    it('vanished file, DB edited → deleted-vs-edited conflict, row kept', async () => {
      const root = await k.install();
      k.editDb(5);
      k.removeFile(root);
      const r = await PackApi.sync('p', root);
      expect(r.deleted).toEqual([]);
      expect(r.conflicts).toEqual([k.key]);
      expect(k.rows()).toHaveLength(1);
      expect(recordOf('p')!.conflicts[0]).toMatchObject({ reason: 'deleted-vs-edited' });
      expect(diag).toHaveBeenCalledTimes(1);
    });

    it('pinned row: skipped before any comparison, counted, no diagnostic', async () => {
      const root = await k.install();
      recordOf('p')!.pins.push(k.key);
      k.editFile(root, 1);
      k.editDb(2);
      const r = await PackApi.sync('p', root);
      expect(r.pinnedSkipped).toBe(1);
      expect(r.conflicts).toEqual([]);
      expect(r.updated).toEqual([]);
      expect(String(k.dbValue())).toMatch(/2/);
      expect(diag).not.toHaveBeenCalled();
      // Pins are reported every time, even at zero change.
      const r2 = await PackApi.sync('p', root);
      expect(r2.pinnedSkipped).toBe(1);
    });
  });
}

describe('three-way — descriptor-banks smoke row (the shared strategy)', () => {
  it('a DB-edited descriptor bank is kept when the file did not change', async () => {
    const root = writePack('p', []);
    const file = join(root, 'content', 'descriptor-banks', 'potion.yaml');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      'primaryAxis: hue\nsecondaryAxis: vessel\nprimary: [red]\nsecondary: [vial]\nunidentifiedLong: a {descriptor} potion\nunidentifiedDetails: {}\n',
    );
    await PackApi.install([root]);
    expect(recordOf('p')!.rows['/descriptor-banks/potion']!.kind).toBe('descriptor-banks');
    rowsIn('descriptor_banks')[0]!.primary = ['red', 'operator-added'];
    const r = await PackApi.sync('p', root);
    expect(r.kept).toEqual(['/descriptor-banks/potion']);
    expect(rowsIn('descriptor_banks')[0]!.primary).toEqual(['red', 'operator-added']);
  });
});

describe('a stamped row with no baseline (partial older record)', () => {
  it('is normalized from what is written, and counted', async () => {
    const root = writePack('p', [{ rel: GIN_REL, data: { name: 'gin' } }]);
    await PackApi.install([root]);
    delete recordOf('p')!.rows[GIN];
    contentRows()[0]!.data = { name: 'db-edit' };
    const r = await PackApi.sync('p', root);
    expect(r.normalized + r.updated.length).toBe(1);
    expect(recordOf('p')!.rows[GIN]).toBeDefined();
    expect(JSON.parse(recordOf('p')!.rows[GIN]!.body)).toMatchObject({
      class: MATERIAL,
      hydratorClass: HYDRATOR,
      data: { name: 'gin' },
    });
  });
});

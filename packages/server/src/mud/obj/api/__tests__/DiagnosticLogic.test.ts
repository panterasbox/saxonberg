/**
 * DiagnosticLogic (via DiagnosticApi) — the store write/read paths.
 * Covers record (channel + author derivation), the compile supersede
 * (a recheck replaces a file's rows; empty batch clears), list filters +
 * the non-wizard compile redaction, and the clear author/wizard gate.
 *
 * Mongo is faked with a minimal in-memory collection supporting the query
 * operators the logic uses ($in / $gte / $ne / $regex). The
 * execution-context actor, access predicates, and provenance author are
 * spied.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiagnosticApi } from '../../../api/diagnostics';
import { PersistApi } from '../../../api/persist';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { ExecutionContextApi } from '../../../api/execution-context';
import { AccessApi } from '../../../api/access';
import { ProvenanceApi } from '../../../api/provenance';
import type { Stuff } from '../../../lib/stuff/Stuff';

type Row = Record<string, unknown>;

function matchesQuery(doc: Row, query: Row): boolean {
  return Object.entries(query).every(([k, cond]) => {
    const v = doc[k];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      const c = cond as Record<string, unknown>;
      if ('$in' in c) return (c.$in as unknown[]).includes(v);
      if ('$ne' in c) return v !== c.$ne;
      if ('$gte' in c) return (v as number) >= (c.$gte as number);
      if ('$regex' in c)
        return new RegExp(c.$regex as string).test(String(v ?? ''));
      return false;
    }
    return v === cond;
  });
}

function makeFakeCollection(store: Row[]) {
  let idc = 0;
  return {
    async insertOne(doc: Row) {
      store.push({ ...doc, _id: `id${idc++}` });
      return { insertedId: `id${idc}` };
    },
    async deleteMany(query: Row) {
      const before = store.length;
      for (let i = store.length - 1; i >= 0; i--) {
        if (matchesQuery(store[i] as Row, query)) store.splice(i, 1);
      }
      return { deletedCount: before - store.length };
    },
    find(query: Row) {
      let rows = store.filter((d) => matchesQuery(d, query));
      const cursor = {
        sort(spec: Record<string, 1 | -1>) {
          const entry = Object.entries(spec)[0];
          if (entry) {
            const [key, dir] = entry;
            rows = [...rows].sort(
              (a, b) => ((a[key] as number) - (b[key] as number)) * dir
            );
          }
          return cursor;
        },
        limit(n: number) {
          rows = rows.slice(0, n);
          return cursor;
        },
        async toArray() {
          return rows;
        },
      };
      return cursor;
    },
  };
}

let store: Row[];
const actor = {
  getTemplatePath: () => '/obj/Avatar/alice',
} as unknown as Stuff;

beforeEach(() => {
  store = [];
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistenceManager.get(), 'getCollection').mockReturnValue(
    makeFakeCollection(store) as never
  );
  vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(actor);
  vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
  vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue('/obj/Avatar/alice');
});

afterEach(() => vi.restoreAllMocks());

describe('DiagnosticApi.record', () => {
  it('derives channel + author and writes a runtime row', async () => {
    await DiagnosticApi.record({
      path: '/mud/lib/lounge/Bar.ts',
      message: 'brain threw',
      stack: 'at Bar.ts:12',
    });
    expect(store).toHaveLength(1);
    const row = store[0]!;
    expect(row.source).toBe('runtime');
    expect(row.severity).toBe('error');
    expect(row.channel).toBe('zone.lounge');
    expect(row.author).toBe('/obj/Avatar/alice');
    expect(row.message).toBe('brain threw');
  });

  it('is a no-op when disconnected', async () => {
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(false);
    await DiagnosticApi.record({ path: null, message: 'x' });
    expect(store).toHaveLength(0);
  });
});

describe('DiagnosticApi.recordDiagnostics (compile supersede)', () => {
  it('replaces a file rows on recheck and clears on an empty batch', async () => {
    await DiagnosticApi.recordDiagnostics(
      '/mud/lib/spatial/Container.ts',
      'v1',
      [
        { severity: 'error', line: 3, code: 2304, message: 'Cannot find X' },
        { severity: 'warning', line: 9, message: 'unused' },
      ],
      { live: false }
    );
    expect(store).toHaveLength(2);
    expect(store.every((r) => r.channel === 'lib.spatial')).toBe(true);

    // Recheck: one remaining error.
    await DiagnosticApi.recordDiagnostics(
      '/mud/lib/spatial/Container.ts',
      'v2',
      [{ severity: 'error', line: 3, code: 2304, message: 'Cannot find X' }],
      { live: true }
    );
    expect(store).toHaveLength(1);
    expect(store[0]!.versionId).toBe('v2');

    // Fixed: empty batch clears the file.
    await DiagnosticApi.recordDiagnostics(
      '/mud/lib/spatial/Container.ts',
      'v3',
      [],
      { live: true }
    );
    expect(store).toHaveLength(0);
  });
});

describe('DiagnosticApi.list', () => {
  beforeEach(async () => {
    await DiagnosticApi.record({ path: '/mud/lib/lounge/Bar.ts', message: 'a' });
    await DiagnosticApi.recordDiagnostics(
      '/mud/lib/spatial/Container.ts',
      'v1',
      [{ severity: 'error', message: 'type err' }],
      { live: false }
    );
  });

  it('returns [] for a non-author non-wizard actor', async () => {
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    expect(await DiagnosticApi.list({})).toEqual([]);
  });

  it('admits a wizard who is not an author (sees compile rows)', async () => {
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    const rows = await DiagnosticApi.list({});
    expect(rows).toHaveLength(2); // runtime + compile
  });

  it('redacts compile rows from non-wizards', async () => {
    const rows = await DiagnosticApi.list({});
    expect(rows.every((r) => r.source !== 'compile')).toBe(true);
    expect(rows).toHaveLength(1);
    // Explicitly asking for compile as a non-wizard yields nothing.
    expect(await DiagnosticApi.list({ source: 'compile' })).toEqual([]);
  });

  it('a wizard sees compile rows too', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    const rows = await DiagnosticApi.list({});
    expect(rows).toHaveLength(2);
  });

  it('filters by channel', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    const rows = await DiagnosticApi.list({ channels: ['zone.lounge'] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.channel).toBe('zone.lounge');
  });
});

describe('DiagnosticApi.clear', () => {
  beforeEach(async () => {
    await DiagnosticApi.record({ path: '/mud/lib/lounge/Bar.ts', message: 'a' });
  });

  it('lets the author of the path clear it', async () => {
    // authorOf returns '/obj/Avatar/alice' === actor templatePath.
    const n = await DiagnosticApi.clear('/mud/lib/lounge/Bar.ts');
    expect(n).toBe(1);
    expect(store).toHaveLength(0);
  });

  it('denies a non-author non-wizard (returns -1)', async () => {
    vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue('/obj/Avatar/bob');
    const n = await DiagnosticApi.clear('/mud/lib/lounge/Bar.ts');
    expect(n).toBe(-1);
    expect(store).toHaveLength(1);
  });

  it('lets a wizard clear anything', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    vi.spyOn(ProvenanceApi, 'authorOf').mockResolvedValue('/obj/Avatar/bob');
    const n = await DiagnosticApi.clear('/mud/lib/lounge/Bar.ts');
    expect(n).toBe(1);
  });
});

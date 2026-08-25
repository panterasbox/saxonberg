/**
 * The `pack_installs` record (pack-installer W1.3): one record per pack
 * with per-row baselines (hash + canonical body), the one-time adoption
 * normalization, two-boot idempotence at the installer level, per-pack
 * failure isolation, and hash canonicalization.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { PackApi } from '../../../api/pack';
import { QuantityApi } from '../../../api/quantity';
import {
  MATERIAL,
  HYDRATOR,
  store,
  stubPersist,
  stubClassResolution,
  quietConsole,
  contentRows,
  rowsIn,
  recordOf,
  writePack,
  cleanupPacks,
} from './pack-harness';

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  warn = quietConsole().warn;
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const GIN = 'obj/material/spirit/gin.yaml';

describe('the install record', () => {
  it('fresh store: one applied record per pack, with baselines for every row', async () => {
    vi.spyOn(QuantityApi, 'loadTagTables').mockReturnValue({
      registered: ['mass:kg', 'length:m'],
    } as never);
    const root = writePack(
      'p',
      [{ rel: GIN, data: { name: 'gin' } }],
      { nameBanks: [{ key: 'common', given: ['A'], surname: ['B'] }], version: '1.2.3' },
    );
    mkdirSync(join(root, 'content', 'quantity'), { recursive: true });
    writeFileSync(join(root, 'content', 'quantity', 'quantity-tags.yaml'), 'tags: []\n');

    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.quantityTables).toBe(2);

    const rec = recordOf('p')!;
    expect(rec.packId).toBe('p');
    expect(rec.version).toBe('1.2.3');
    expect(rec.principal).toBe('bootstrap');
    expect(rec.status).toBe('applied');
    expect(rec.failure).toBeNull();
    expect(rec.parameters).toEqual({});
    expect(rec.pins).toEqual([]);
    expect(rec.conflicts).toEqual([]);
    expect(rec.sideEffects.kinds).toEqual(['quantity']);
    expect(Object.keys(rec.rows).sort()).toEqual([
      '/name-banks/common',
      '/obj/material/spirit/gin',
    ]);
    const gin = rec.rows['/obj/material/spirit/gin']!;
    expect(gin.kind).toBe('domain');
    expect(gin.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(JSON.parse(gin.body)).toEqual({
      class: MATERIAL,
      hydratorClass: HYDRATOR,
      data: { name: 'gin' },
    });
    const bank = rec.rows['/name-banks/common']!;
    expect(bank.kind).toBe('name-banks');
    expect(JSON.parse(bank.body)).toEqual({ given: ['A'], surname: ['B'] });
    // The one-time line fired exactly once.
    expect(warn.mock.calls.filter((c) => /ONE-TIME adoption/.test(String(c[0])))).toHaveLength(1);
  });

  it('adoption: pre-seeded unstamped rows adopted in place, baselines = the file as written', async () => {
    store.rows.push({
      _id: 'legacy-1',
      path: '/obj/material/spirit/gin',
      class: MATERIAL,
      hydratorClass: HYDRATOR,
      data: { name: 'old gin', operatorTweak: true },
    });
    const root = writePack('p', [{ rel: GIN, data: { name: 'gin' } }]);
    const [r] = await PackApi.install([root]);
    expect(r!.adopted).toEqual(['/obj/material/spirit/gin']);
    expect(contentRows()).toHaveLength(1);
    expect(contentRows()[0]!._id).toBe('legacy-1'); // no wipe
    expect(contentRows()[0]!.data).toEqual({ name: 'gin' }); // divergence overwritten
    const rec = recordOf('p')!;
    expect(JSON.parse(rec.rows['/obj/material/spirit/gin']!.body).data).toEqual({ name: 'gin' });
    expect(warn.mock.calls.filter((c) => /ONE-TIME adoption/.test(String(c[0])))).toHaveLength(1);
  });

  it('second run: record rows deep-equal, no second normalization line, store identical', async () => {
    const root = writePack('p', [{ rel: GIN, data: { name: 'gin', abv: 40 } }], {
      nameBanks: [{ key: 'common', given: ['A'], surname: ['B'] }],
    });
    await PackApi.install([root]);
    const rows1 = structuredClone(recordOf('p')!.rows);
    const store1 = structuredClone(store.rows.filter((r) => r.__col !== 'pack_installs'));
    warn.mockClear();

    const [r2] = await PackApi.install([root]);
    expect([...r2!.inserted, ...r2!.updated, ...r2!.adopted, ...r2!.deleted]).toEqual([]);
    expect(r2!.normalized).toBe(0);
    expect(recordOf('p')!.rows).toEqual(rows1);
    expect(store.rows.filter((r) => r.__col !== 'pack_installs')).toEqual(store1);
    expect(warn.mock.calls.filter((c) => /adoption|normalized/.test(String(c[0])))).toHaveLength(0);
  });

  it('failure isolation: a requires-kernel failure records status failed; siblings apply', async () => {
    const bad = writePack('bad', [
      { rel: GIN },
      { rel: 'obj/material/x.yaml', class: '/obj/material/DoesNotExist' },
    ]);
    const good = writePack('good', [{ rel: 'obj/material/element/iron.yaml' }]);
    const results = await PackApi.install([bad, good]);
    const rb = results.find((r) => r.packId === 'bad')!;
    const rg = results.find((r) => r.packId === 'good')!;
    expect(rb.failure?.step).toBe('requires-kernel');
    expect(rg.failure).toBeNull();
    expect(rg.inserted).toEqual(['/obj/material/element/iron']);
    expect(contentRows().map((r) => r.sourcePack)).toEqual(['good']); // zero writes for bad
    expect(recordOf('bad')!.status).toBe('failed');
    expect(recordOf('bad')!.failure!.step).toBe('requires-kernel');
    expect(recordOf('good')!.status).toBe('applied');
  });

  it('a failed pack that is later fixed re-applies and clears the failure', async () => {
    const root = writePack('p', [
      { rel: 'obj/material/x.yaml', class: '/obj/material/DoesNotExist' },
    ]);
    await PackApi.install([root]);
    expect(recordOf('p')!.status).toBe('failed');
    writeFileSync(
      join(root, 'content', 'obj/material/x.yaml'),
      `class: ${MATERIAL}\nhydratorClass: ${HYDRATOR}\ndata: { name: x }\n`,
    );
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(recordOf('p')!.status).toBe('applied');
    expect(recordOf('p')!.failure).toBeNull();
  });

  it('hash canonicalization: key order is irrelevant; content changes the hash', async () => {
    const root = writePack('p', [{ rel: GIN, data: { a: 1, b: { c: 2, d: 3 } } }]);
    await PackApi.install([root]);
    const h1 = recordOf('p')!.rows['/obj/material/spirit/gin']!.hash;

    const file = join(root, 'content', GIN);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      `hydratorClass: ${HYDRATOR}\ndata:\n  b:\n    d: 3\n    c: 2\n  a: 1\nclass: ${MATERIAL}\n`,
    );
    const [r2] = await PackApi.install([root]);
    expect(r2!.updated).toEqual([]);
    expect(recordOf('p')!.rows['/obj/material/spirit/gin']!.hash).toBe(h1);

    writeFileSync(
      file,
      `class: ${MATERIAL}\nhydratorClass: ${HYDRATOR}\ndata: { a: 1, b: { c: 2, d: 4 } }\n`,
    );
    const [r3] = await PackApi.install([root]);
    expect(r3!.updated).toEqual(['/obj/material/spirit/gin']);
    expect(recordOf('p')!.rows['/obj/material/spirit/gin']!.hash).not.toBe(h1);
    expect(rowsIn('pack_installs')).toHaveLength(1);
  });
});

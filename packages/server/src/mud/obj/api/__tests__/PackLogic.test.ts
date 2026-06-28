/**
 * PackLogic / PackApi reconcile core — drives PackApi.install against fixture
 * packs with a stubbed PersistApi store, asserting the reconcile contract:
 * insert / update (+ no-op second run) / delete / adoption-of-unstamped /
 * coexistence (non-pack rows untouched) / requires-kernel abort (no writes) /
 * content-kind dispatch (domain + quantity, via the real base-library pack).
 *
 * Mongo is faked through the PersistApi chokepoint (the lint:pm-locked
 * surface PackLogic writes through). `StuffApi.loadClassByPath` is stubbed in
 * the fixture tests (hermetic) and exercised for real in the base-library
 * integration test.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import YAML from 'yaml';
import { PackApi } from '../../../api/pack';
import { PersistApi } from '../../../api/persist';
import { StuffApi } from '../../../api/stuff';

const MATERIAL = '/lib/material/Material';
const HYDRATOR = '/lib/persistence/PersistentHydrator';

interface Row extends Record<string, unknown> {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
  sourcePack?: string;
}

let rows: Row[];
let nextId: number;
const tmpRoots: string[] = [];

/** An in-memory `domain` store behind PersistApi (find/save/delete/isConnected). */
function stubPersist(): void {
  rows = [];
  nextId = 1;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      rows
        .filter((r) =>
          Object.entries(query).every(([k, v]) => (r as Row)[k] === v),
        )
        .map((r) => ({ ...r })) as never,
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const d = doc as Row;
      if (d._id) {
        const i = rows.findIndex((r) => r._id === d._id);
        const { _id, ...rest } = d;
        rows[i] = { ...rows[i]!, ...rest, _id }; // $set-by-_id semantics
        return String(d._id);
      }
      const id = `id-${nextId++}`;
      rows.push({ ...d, _id: id });
      return id;
    },
  );
  vi.spyOn(PersistApi, 'delete').mockImplementation(
    async (_col: string, id: string) => {
      const i = rows.findIndex((r) => r._id === id);
      if (i >= 0) rows.splice(i, 1);
    },
  );
}

/** Stub class-resolution: resolve anything but a `DoesNotExist` sentinel. */
function stubClassResolution(): void {
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (p: string) => {
    if (p.includes('DoesNotExist')) {
      throw new Error(`no blueprint at '${p}'`);
    }
    return class {} as never;
  });
}

interface FixtureFile {
  /** content-relative path, e.g. `lib/material/spirit/gin.yaml`. */
  rel: string;
  class?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
}

/** Write a fixture pack to a temp dir; returns its root. */
function writePack(
  id: string,
  files: FixtureFile[],
  dependsOn: string[] = [],
): string {
  const root = mkdtempSync(join(tmpdir(), `pack-${id}-`));
  tmpRoots.push(root);
  writeFileSync(
    join(root, 'pack.yaml'),
    YAML.stringify({ id, version: '0.1.0', dependsOn }),
  );
  for (const f of files) {
    const file = join(root, 'content', f.rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      YAML.stringify({
        class: f.class ?? MATERIAL,
        hydratorClass: f.hydratorClass ?? HYDRATOR,
        data: f.data ?? { name: f.rel },
      }),
    );
  }
  return root;
}

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
});

afterEach(() => {
  vi.restoreAllMocks();
  while (tmpRoots.length) rmSync(tmpRoots.pop()!, { recursive: true, force: true });
});

describe('PackLogic — reconcile (fixture packs, stubbed class resolution)', () => {
  beforeEach(stubClassResolution);

  it('insert: fresh DB → stamped rows, listed in `inserted`', async () => {
    const root = writePack('p', [
      { rel: 'lib/material/spirit/gin.yaml', data: { name: 'gin' } },
      { rel: 'lib/material/element/iron.yaml', data: { name: 'iron' } },
    ]);
    const [r] = await PackApi.install([root]);
    expect(r!.inserted.sort()).toEqual([
      '/lib/material/element/iron',
      '/lib/material/spirit/gin',
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.sourcePack === 'p')).toBe(true);
    expect(rows.find((row) => row.path === '/lib/material/spirit/gin')!.data).toEqual(
      { name: 'gin' },
    );
  });

  it('update: changed file overwrites; second run is a no-op', async () => {
    const root = writePack('p', [
      { rel: 'lib/material/spirit/gin.yaml', data: { name: 'gin', density: 940 } },
    ]);
    await PackApi.install([root]);

    // Edit the file (new density) and re-install.
    writeFileSync(
      join(root, 'content/lib/material/spirit/gin.yaml'),
      YAML.stringify({
        class: MATERIAL,
        hydratorClass: HYDRATOR,
        data: { name: 'gin', density: 950 },
      }),
    );
    const [r2] = await PackApi.install([root]);
    expect(r2!.updated).toEqual(['/lib/material/spirit/gin']);
    expect(rows[0]!.data).toEqual({ name: 'gin', density: 950 });

    // No further edit → no-op (key-order-insensitive equality).
    const [r3] = await PackApi.install([root]);
    expect(r3!.updated).toEqual([]);
    expect(r3!.inserted).toEqual([]);
  });

  it('delete: a stamped row whose file vanished is removed', async () => {
    const root = writePack('p', [
      { rel: 'lib/material/spirit/gin.yaml' },
      { rel: 'lib/material/spirit/rum.yaml' },
    ]);
    await PackApi.install([root]);
    expect(rows).toHaveLength(2);

    rmSync(join(root, 'content/lib/material/spirit/rum.yaml'));
    const [r2] = await PackApi.install([root]);
    expect(r2!.deleted).toEqual(['/lib/material/spirit/rum']);
    expect(rows.map((row) => row.path)).toEqual(['/lib/material/spirit/gin']);
  });

  it('adoption: an unstamped legacy row is stamped + matched, no duplicate', async () => {
    // Simulate a legacy SeederManager row (unstamped) at a pack path.
    rows.push({
      _id: 'legacy-1',
      path: '/lib/material/spirit/gin',
      class: MATERIAL,
      hydratorClass: HYDRATOR,
      data: { name: 'old gin' },
    });
    const root = writePack('p', [
      { rel: 'lib/material/spirit/gin.yaml', data: { name: 'gin' } },
    ]);

    const [r] = await PackApi.install([root]);
    expect(r!.adopted).toEqual(['/lib/material/spirit/gin']);
    expect(r!.inserted).toEqual([]);
    expect(rows).toHaveLength(1); // adopted in place — no duplicate
    expect(rows[0]!._id).toBe('legacy-1');
    expect(rows[0]!.sourcePack).toBe('p');
    expect(rows[0]!.data).toEqual({ name: 'gin' }); // matched to file

    // Second run: now stamped → no-op.
    const [r2] = await PackApi.install([root]);
    expect(r2!.adopted).toEqual([]);
    expect(r2!.updated).toEqual([]);
  });

  it('coexistence: a non-pack row is left completely untouched', async () => {
    rows.push({
      _id: 'other-1',
      path: '/domain/some/player/sword',
      class: '/lib/Thing',
      data: { name: 'sword' },
    });
    const root = writePack('p', [{ rel: 'lib/material/spirit/gin.yaml' }]);
    const [r] = await PackApi.install([root]);
    expect([...r!.inserted, ...r!.updated, ...r!.adopted, ...r!.deleted]).not.toContain(
      '/domain/some/player/sword',
    );
    const other = rows.find((row) => row._id === 'other-1')!;
    expect(other.sourcePack).toBeUndefined();
    expect(other.data).toEqual({ name: 'sword' });
  });

  it('requires-kernel: a bogus class aborts before any write', async () => {
    const root = writePack('p', [
      { rel: 'lib/material/spirit/gin.yaml' },
      { rel: 'lib/material/bad.yaml', class: '/lib/material/DoesNotExist' },
    ]);
    await expect(PackApi.install([root])).rejects.toThrow(/DoesNotExist/);
    expect(rows).toHaveLength(0); // all-or-nothing: nothing written
  });
});

describe('PackLogic — base-library integration (real pack + real class resolution)', () => {
  it('install() discovers the real base-library pack: domain rows + quantity tables', async () => {
    // No stub on loadClassByPath — exercises the real resolver against the
    // shipped Material/Biome classes. No packRoots → real discovery from
    // server deps + module resolution to the @saxonberg/content-base-library
    // pack root.
    const results = await PackApi.install();
    const base = results.find((r) => r.packId === 'base-library');
    expect(base).toBeDefined();
    // Materials + biomes inserted as stamped domain rows.
    expect(base!.inserted).toContain('/lib/material/spirit/gin');
    expect(base!.inserted).toContain('/lib/biome');
    expect(rows.every((r) => r.sourcePack === 'base-library')).toBe(true);
    // Content-kind dispatch: the quantity tag tables were loaded too.
    expect(base!.quantityTables).toBeGreaterThan(0);
  });
});

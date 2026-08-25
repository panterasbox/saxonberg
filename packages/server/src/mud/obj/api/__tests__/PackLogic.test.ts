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

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import YAML from 'yaml';
import { PackApi } from '../../../api/pack';
import { PersistApi } from '../../../api/persist';
import { StuffApi } from '../../../api/stuff';

const MATERIAL = '/obj/material/Material';
const HYDRATOR = '/obj/persistence/PersistentHydrator';

interface Row extends Record<string, unknown> {
  _id?: string;
  path?: string;
  class?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
  sourcePack?: string;
  /** Which collection a row belongs to (the stub is collection-aware so the
   * `domain` and `name_banks` reconciles don't see each other's rows). */
  __col?: string;
}

let rows: Row[];
let nextId: number;
const tmpRoots: string[] = [];

/** An in-memory, collection-aware store behind PersistApi. */
function stubPersist(): void {
  rows = [];
  nextId = 1;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      rows
        .filter(
          (r) =>
            (r.__col ?? 'content') === col &&
            Object.entries(query).every(([k, v]) => (r as Row)[k] === v),
        )
        .map((r) => ({ ...r })) as never,
  );
  vi.spyOn(PersistApi, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const d = doc as Row;
      if (d._id) {
        const i = rows.findIndex((r) => r._id === d._id);
        const { _id, ...rest } = d;
        rows[i] = { ...rows[i]!, ...rest, _id, __col: col }; // $set-by-_id
        return String(d._id);
      }
      const id = `id-${nextId++}`;
      rows.push({ ...d, _id: id, __col: col });
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

interface NameBankFixture {
  key: string;
  given: string[];
  surname: string[];
  style?: string;
}

/** Write a fixture pack to a temp dir; returns its root. */
function writePack(
  id: string,
  files: FixtureFile[],
  dependsOn: string[] = [],
  nameBanks: NameBankFixture[] = [],
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
  for (const nb of nameBanks) {
    const file = join(root, 'content', 'name-banks', `${nb.key}.yaml`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      YAML.stringify({ style: nb.style, given: nb.given, surname: nb.surname }),
    );
  }
  return root;
}

/** The name_banks rows currently in the stubbed store. */
function nameBankRows(): Row[] {
  return rows.filter((r) => r.__col === 'name_banks');
}

/** The `content` rows — the store also holds the `pack_installs` record. */
function contentRows(): Row[] {
  return rows.filter((r) => r.__col === 'content');
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
      { rel: 'obj/material/spirit/gin.yaml', data: { name: 'gin' } },
      { rel: 'obj/material/element/iron.yaml', data: { name: 'iron' } },
    ]);
    const [r] = await PackApi.install([root]);
    expect(r!.inserted.sort()).toEqual([
      '/obj/material/element/iron',
      '/obj/material/spirit/gin',
    ]);
    expect(contentRows()).toHaveLength(2);
    expect(contentRows().every((row) => row.sourcePack === 'p')).toBe(true);
    expect(contentRows().find((row) => row.path === '/obj/material/spirit/gin')!.data).toEqual(
      { name: 'gin' },
    );
  });

  it('update: changed file overwrites; second run is a no-op', async () => {
    const root = writePack('p', [
      { rel: 'obj/material/spirit/gin.yaml', data: { name: 'gin', density: 940 } },
    ]);
    await PackApi.install([root]);

    // Edit the file (new density) and re-install.
    writeFileSync(
      join(root, 'content/obj/material/spirit/gin.yaml'),
      YAML.stringify({
        class: MATERIAL,
        hydratorClass: HYDRATOR,
        data: { name: 'gin', density: 950 },
      }),
    );
    const [r2] = await PackApi.install([root]);
    expect(r2!.updated).toEqual(['/obj/material/spirit/gin']);
    expect(contentRows()[0]!.data).toEqual({ name: 'gin', density: 950 });

    // No further edit → no-op (key-order-insensitive equality).
    const [r3] = await PackApi.install([root]);
    expect(r3!.updated).toEqual([]);
    expect(r3!.inserted).toEqual([]);
  });

  it('delete: a stamped row whose file vanished is removed', async () => {
    const root = writePack('p', [
      { rel: 'obj/material/spirit/gin.yaml' },
      { rel: 'obj/material/spirit/rum.yaml' },
    ]);
    await PackApi.install([root]);
    expect(contentRows()).toHaveLength(2);

    rmSync(join(root, 'content/obj/material/spirit/rum.yaml'));
    const [r2] = await PackApi.install([root]);
    expect(r2!.deleted).toEqual(['/obj/material/spirit/rum']);
    expect(contentRows().map((row) => row.path)).toEqual(['/obj/material/spirit/gin']);
  });

  it('adoption: an unstamped legacy row is stamped + matched, no duplicate', async () => {
    // Simulate a legacy SeederManager row (unstamped) at a pack path.
    rows.push({
      _id: 'legacy-1',
      path: '/obj/material/spirit/gin',
      class: MATERIAL,
      hydratorClass: HYDRATOR,
      data: { name: 'old gin' },
    });
    const root = writePack('p', [
      { rel: 'obj/material/spirit/gin.yaml', data: { name: 'gin' } },
    ]);

    const [r] = await PackApi.install([root]);
    expect(r!.adopted).toEqual(['/obj/material/spirit/gin']);
    expect(r!.inserted).toEqual([]);
    expect(contentRows()).toHaveLength(1); // adopted in place — no duplicate
    expect(contentRows()[0]!._id).toBe('legacy-1');
    expect(contentRows()[0]!.sourcePack).toBe('p');
    expect(contentRows()[0]!.data).toEqual({ name: 'gin' }); // matched to file

    // Second run: now stamped → no-op.
    const [r2] = await PackApi.install([root]);
    expect(r2!.adopted).toEqual([]);
    expect(r2!.updated).toEqual([]);
  });

  it('coexistence: a non-pack row is left completely untouched', async () => {
    rows.push({
      _id: 'other-1',
      path: '/domain/some/player/sword',
      class: '/obj/Prop',
      data: { name: 'sword' },
    });
    const root = writePack('p', [{ rel: 'obj/material/spirit/gin.yaml' }]);
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
      { rel: 'obj/material/spirit/gin.yaml' },
      { rel: 'obj/material/bad.yaml', class: '/obj/material/DoesNotExist' },
    ]);
    // Per-pack failure isolation: boot continues WITHOUT the pack — the
    // failure is recorded, never thrown (A17.1 / A10.10).
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('requires-kernel');
    expect(r!.failure?.error).toMatch(/DoesNotExist/);
    expect(contentRows()).toHaveLength(0); // all-or-nothing: nothing written
    const record = rows.find((row) => row.__col === 'pack_installs')!;
    expect(record.status).toBe('failed');
  });
});

describe('PackLogic — reconcile name banks (fixture packs, the name-bank kind)', () => {
  beforeEach(stubClassResolution);

  const HOMO = 'obj/species/animalia/homo/sapiens.yaml';

  it('insert: name-bank files → stamped name_banks rows (key = file basename)', async () => {
    const root = writePack(
      'p',
      [{ rel: HOMO, class: '/obj/species/Species' }],
      [],
      [
        { key: 'common', given: ['Alden', 'Bella'], surname: ['Ashby'] },
        { key: 'dwarvish', given: ['Durin'], surname: ['Stonebeard'] },
      ],
    );
    const [r] = await PackApi.install([root]);
    expect(r!.nameBanks).toBe(2);
    const banks = nameBankRows();
    expect(banks.map((b) => b.key).sort()).toEqual(['common', 'dwarvish']);
    expect(banks.every((b) => b.sourcePack === 'p')).toBe(true);
    const common = banks.find((b) => b.key === 'common')!;
    expect(common.given).toEqual(['Alden', 'Bella']);
    // The domain reconcile must NOT see the name-bank rows (collection-scoped).
    expect(r!.deleted).toEqual([]);
  });

  it('update: edited bank overwrites; second run is a no-op', async () => {
    const root = writePack('p', [], [], [
      { key: 'common', given: ['Alden'], surname: ['Ashby'] },
    ]);
    await PackApi.install([root]);

    writeFileSync(
      join(root, 'content/name-banks/common.yaml'),
      YAML.stringify({ given: ['Alden', 'Bram'], surname: ['Ashby'] }),
    );
    const [r2] = await PackApi.install([root]);
    expect(r2!.nameBanks).toBe(1); // the update is counted
    expect(nameBankRows().find((b) => b.key === 'common')!.given).toEqual([
      'Alden',
      'Bram',
    ]);

    const [r3] = await PackApi.install([root]);
    expect(r3!.nameBanks).toBe(0); // no edit → no write
  });

  it('adoption: an unstamped legacy name bank is stamped + matched, no duplicate', async () => {
    // Simulate a legacy NameBankSeeder row (unstamped) at a pack key.
    rows.push({
      _id: 'legacy-nb',
      key: 'common',
      given: ['Old'],
      surname: ['Name'],
      __col: 'name_banks',
    });
    const root = writePack('p', [], [], [
      { key: 'common', given: ['Alden'], surname: ['Ashby'] },
    ]);
    const [r] = await PackApi.install([root]);
    expect(r!.nameBanks).toBe(1);
    const banks = nameBankRows();
    expect(banks).toHaveLength(1); // adopted in place — no duplicate
    expect(banks[0]!._id).toBe('legacy-nb');
    expect(banks[0]!.sourcePack).toBe('p');
    expect(banks[0]!.given).toEqual(['Alden']); // matched to the file
  });

  it('delete: a stamped bank whose file vanished is removed', async () => {
    const root = writePack('p', [], [], [
      { key: 'common', given: ['Alden'], surname: ['Ashby'] },
      { key: 'dwarvish', given: ['Durin'], surname: ['Stonebeard'] },
    ]);
    await PackApi.install([root]);
    expect(nameBankRows()).toHaveLength(2);

    rmSync(join(root, 'content/name-banks/dwarvish.yaml'));
    await PackApi.install([root]);
    expect(nameBankRows().map((b) => b.key)).toEqual(['common']);
  });
});

describe('PackLogic — pack integration (real packs + real class resolution)', () => {
  it('install() discovers the shipped packs: base-library + species-and-names + arcane-descriptors + newbie-wilds', async () => {
    // No stub on loadClassByPath — exercises the real resolver against the
    // shipped Material/Biome/Species/Clade classes. No packRoots → real
    // discovery from server deps + module resolution to the
    // @saxonberg/content-* pack roots.
    const results = await PackApi.install();

    const base = results.find((r) => r.packId === 'base-library');
    expect(base).toBeDefined();
    // Materials + biomes inserted as stamped domain rows.
    expect(base!.inserted).toContain('/obj/material/spirit/gin');
    expect(base!.inserted).toContain('/obj/biome');
    // Content-kind dispatch: the quantity tag tables were loaded too.
    expect(base!.quantityTables).toBeGreaterThan(0);

    const sp = results.find((r) => r.packId === 'species-and-names');
    expect(sp).toBeDefined();
    const HOMO =
      '/obj/species/animalia/chordata/mammalia/primates/hominidae/homo';
    // The kingdom Clade, the canonical human, and the two new casts.
    expect(sp!.inserted).toContain('/obj/species/animalia');
    expect(sp!.inserted).toContain(`${HOMO}/sapiens`);
    expect(sp!.inserted).toContain(`${HOMO}/trollius`);
    expect(sp!.inserted).toContain(`${HOMO}/ghulius`);
    // The name-bank content kind installed its banks.
    expect(sp!.nameBanks).toBeGreaterThan(0);
    expect(nameBankRows().some((b) => b.key === 'common')).toBe(true);

    // The descriptor-bank content kind: the pools an unidentified magic
    // item draws its appearance from (magic-items D32). Same shape as
    // name banks, one kind over.
    const desc = results.find((r) => r.packId === 'arcane-descriptors');
    expect(desc).toBeDefined();

    // Every written row is stamped by one of the shipped packs — no
    // unstamped leakage.
    expect(
      contentRows().every(
        (r) =>
          r.sourcePack === 'base-library' ||
          r.sourcePack === 'species-and-names' ||
          r.sourcePack === 'arcane-descriptors' ||
          r.sourcePack === 'newbie-wilds',
      ),
    ).toBe(true);
  });
});

/**
 * PackApi — the runtime surface over PackLogic. Covers:
 *  - sync re-hydrates the affected live singletons (the no-restart loop),
 *  - the FromModule gate rejects a non-PackApi caller of PackLogic,
 *  - discoverPacks reads the real shipped base-library manifest.
 *
 * Mongo is faked through PersistApi; the re-hydrate seam (StuffApi +
 * TemplateApi) is spied, mirroring CmsLogic's go-live test.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import YAML from 'yaml';
import { PackApi } from '../pack';
import { PackLogic } from '../../obj/api/PackLogic';
import { PersistApi } from '../persist';
import { StuffApi } from '../stuff';
import { TemplateApi } from '../template';
import { SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';

const MATERIAL = '/obj/material/Material';
const HYDRATOR = '/obj/persistence/PersistentHydrator';

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

function stubPersist(): void {
  rows = [];
  nextId = 1;
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
  // Collection-aware, like Mongo: a `{sourcePack}` query over
  // `forum_subjects` must not answer with `content` rows (the subject
  // kind would plan an archive for a template — found at the sweep).
  const colOf = (r: Row): string => (r as Row & { __col?: string }).__col ?? 'content';
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      rows
        .filter(
          (r) =>
            colOf(r) === col &&
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
        rows[i] = { ...rows[i]!, ...rest, _id, __col: col } as Row;
        return String(d._id);
      }
      const id = `id-${nextId++}`;
      rows.push({ ...d, _id: id, __col: col } as Row);
      return id;
    },
  );
  vi.spyOn(PersistApi, 'delete').mockImplementation(async () => {});
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
    async () => class {} as never,
  );
}

function writePack(id: string, file: string, data: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), `pack-${id}-`));
  tmpRoots.push(root);
  writeFileSync(
    join(root, 'pack.yaml'),
    YAML.stringify({ id, version: '0.1.0', dependsOn: [] }),
  );
  const f = join(root, 'content', file);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(
    f,
    YAML.stringify({ class: MATERIAL, hydratorClass: HYDRATOR, data }),
  );
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

describe('PackApi.sync', () => {
  it('reconciles and re-hydrates the affected live singletons (no restart)', async () => {
    const root = writePack('p', 'obj/material/spirit/gin.yaml', {
      name: 'gin',
      appearance: 'clear',
    });
    await PackApi.install([root]); // seed the row (boot path: no re-hydrate)

    // Edit the file.
    writeFileSync(
      join(root, 'content/obj/material/spirit/gin.yaml'),
      YAML.stringify({
        class: MATERIAL,
        hydratorClass: HYDRATOR,
        data: { name: 'gin', appearance: 'cloudy' },
      }),
    );

    // A live singleton at the path; spy the re-hydrate seam.
    const liveGin = { stuffId: 'live-gin' } as unknown as Stuff;
    vi.spyOn(StuffApi, 'findAllByTemplatePath').mockReturnValue([liveGin]);
    const restore = vi
      .spyOn(TemplateApi, 'restoreFromTemplate')
      .mockResolvedValue(undefined);

    const result = await PackApi.sync('p', root);
    expect(result.updated).toEqual(['/obj/material/spirit/gin']);
    expect(restore).toHaveBeenCalledWith(liveGin);
    expect(result.rehydrated).toBe(1);
  });
});

describe('PackLogic gating', () => {
  it('rejects a caller that is not PackApi (FromModule gate)', () => {
    const logic = makeStuff(() => new PackLogic());
    // The security gate throws synchronously at the proxy boundary (before a
    // promise is returned), so assert with the sync form — see decorators.test.
    expect(() => logic.install([])).toThrow(SecurityError);
  });
});

describe('PackApi.discoverPacks', () => {
  it('discovers the shipped base-library manifest', async () => {
    const manifests = await PackApi.discoverPacks();
    const base = manifests.find((m) => m.id === 'base-library');
    expect(base).toBeDefined();
    expect(base!.version).toBe('0.3.0');
    expect(base!.dependsOn).toEqual([]);
  });
});

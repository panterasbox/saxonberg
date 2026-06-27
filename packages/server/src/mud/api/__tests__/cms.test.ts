/**
 * CmsApi / CmsLogic tests — the gated structured CMS surface.
 *
 * The Api composes four existing Apis over two backends:
 *   - content (Template docs in `domain`) and
 *   - source  (sandboxed files under the mudlib).
 *
 * SECURITY MODEL UNDER TEST: the API takes **no `actor` argument**. The
 * acting principal is resolved from the execution context
 * (`ExecutionContextApi.getActingAuthor`), never a caller-supplied value,
 * so a privileged-Avatar reference can't be substituted for the gate's
 * subject. Tests drive the context by spying `getActingAuthor`, and the
 * access gates / go-live steps via `vi.spyOn`, so the deny / allow /
 * invoked assertions don't need a full AccessRegistry bootstrap.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CmsApi, CmsError } from '../cms';
import { CmsLogic } from '../../obj/api/CmsLogic';
import { TemplateApi } from '../template';
import { HotReloadApi } from '../hot-reload';
import { AccessApi } from '../access';
import { ExecutionContextApi } from '../execution-context';
import { StuffApi } from '../stuff';
import { SecurityError } from '../../lib/security/errors';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';
import type { Stuff } from '../../lib/stuff/Stuff';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX_ROOT = findPackagesRoot(HERE);

/** A stand-in acting principal. Its identity is irrelevant — the access
 *  gates are spied — but it must be the value the context yields, so the
 *  tests can assert the gate's subject came from context. */
const ACTOR = { stuffId: 'ctx-actor' } as unknown as Stuff;

function findPackagesRoot(start: string): string {
  let dir = start;
  while (path.basename(dir) !== 'packages') {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('test setup: no packages ancestor');
    dir = parent;
  }
  return dir;
}

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

/** An in-memory `domain` store driving Template.find* + saveTemplate. */
function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));
  let nextId = store.length + 1;

  const save = vi.fn(async (collection: string, doc: Doc) => {
    if (collection !== Collections.Domain) {
      throw new Error(`unexpected collection in test: ${collection}`);
    }
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id;
    }
    copy._id = String(nextId++);
    store.push(copy);
    return copy._id;
  });

  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Domain) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      const pathSpec = query.path as { $regex?: string } | undefined;
      if (pathSpec?.$regex) {
        const re = new RegExp(pathSpec.$regex);
        return store.filter((d) => re.test(d.path));
      }
      return store.slice();
    }
  );

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return store;
}

// Real, resolvable class paths: CartesianZone extends Zone (folder);
// Idea is a non-Zone leaf class.
const ZONE_CLASS = '/lib/location/CartesianZone';
const LEAF_CLASS = '/lib/stuff/Idea';

describe('CmsApi — content backend', () => {
  let tmpStore: Doc[];

  beforeEach(() => {
    StuffApi.clearAll();
    // Context yields an author; content reads are author-gated.
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(ACTOR);
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(true);
    tmpStore = installInMemoryStore([
      { path: '/cmstest', class: ZONE_CLASS, data: {} },
      { path: '/cmstest/alpha', class: LEAF_CLASS, data: { hp: 1 } },
      { path: '/cmstest/beta', class: LEAF_CLASS, data: { hp: 2 } },
      { path: '/cmstest/sub', class: ZONE_CLASS, data: {} },
      { path: '/cmstest/sub/deep', class: LEAF_CLASS, data: { hp: 3 } },
      // No template at /cmstest/ghost — only this deep leaf. The tree must
      // still synthesize a browsable `ghost` namespace folder.
      { path: '/cmstest/ghost/leaf', class: LEAF_CLASS, data: { hp: 4 } },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('listTree returns immediate children with correct kinds', async () => {
    const listing = await CmsApi.listTree('content', '/cmstest');
    expect(listing.backend).toBe('content');
    expect(listing.path).toBe('/cmstest');
    const byPath = new Map(listing.entries.map((e) => [e.path, e]));
    // Grandchildren (/cmstest/sub/deep) are excluded; /cmstest/ghost is a
    // synthesized namespace folder (no template doc there).
    expect([...byPath.keys()].sort()).toEqual([
      '/cmstest/alpha',
      '/cmstest/beta',
      '/cmstest/ghost',
      '/cmstest/sub',
    ]);
    expect(byPath.get('/cmstest/alpha')?.kind).toBe('leaf');
    expect(byPath.get('/cmstest/sub')?.kind).toBe('folder');
    expect(byPath.get('/cmstest/alpha')?.name).toBe('alpha');
  });

  it('synthesizes a browsable namespace folder for an intermediate path', async () => {
    // /cmstest/ghost has no template doc, only /cmstest/ghost/leaf below it.
    const parent = await CmsApi.listTree('content', '/cmstest');
    const ghost = parent.entries.find((e) => e.path === '/cmstest/ghost');
    expect(ghost?.kind).toBe('folder');
    // It drills in to the real leaf below.
    const inside = await CmsApi.listTree('content', '/cmstest/ghost');
    expect(inside.entries.map((e) => e.path)).toEqual(['/cmstest/ghost/leaf']);
    expect(inside.entries[0]?.kind).toBe('leaf');
  });

  it('read on a leaf returns JSON body + templateMeta', async () => {
    const res = await CmsApi.read('content', '/cmstest/alpha');
    expect(res.kind).toBe('leaf');
    expect(res.language).toBe('json');
    expect(JSON.parse(res.body)).toEqual({ hp: 1 });
    expect(res.templateMeta?.class).toBe(LEAF_CLASS);
  });

  it('read on a folder throws CmsError(invalid)', async () => {
    await expect(CmsApi.read('content', '/cmstest')).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('read on a missing path throws CmsError(not-found)', async () => {
    await expect(
      CmsApi.read('content', '/cmstest/nope')
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('stat reports existence + kind', async () => {
    expect(await CmsApi.stat('content', '/cmstest/alpha')).toMatchObject({
      exists: true,
      kind: 'leaf',
    });
    expect(await CmsApi.stat('content', '/cmstest')).toMatchObject({
      exists: true,
      kind: 'folder',
    });
    expect(await CmsApi.stat('content', '/cmstest/nope')).toMatchObject({
      exists: false,
    });
  });

  it('write (allowed) updates data + invokes restoreFromTemplate go-live', async () => {
    // Allow the write gate.
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
    // A live clone at the path: spy restoreFromTemplate to observe go-live.
    const fakeInstance = { stuffId: 'x' };
    vi.spyOn(StuffApi, 'findAllByTemplatePath').mockReturnValue([
      fakeInstance as never,
    ]);
    const restore = vi
      .spyOn(TemplateApi, 'restoreFromTemplate')
      .mockResolvedValue(undefined);

    const out = await CmsApi.write(
      'content',
      '/cmstest/alpha',
      JSON.stringify({ hp: 99 })
    );

    expect(out.reloaded).toBe(true);
    expect(restore).toHaveBeenCalledWith(fakeInstance);
    // data persisted: the stored doc now carries hp:99.
    const persisted = tmpStore.find((d) => d.path === '/cmstest/alpha');
    expect(persisted?.data).toEqual({ hp: 99 });
    // class round-tripped unchanged.
    expect(persisted?.class).toBe(LEAF_CLASS);
  });

  it('write with malformed JSON throws CmsError(invalid)', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    await expect(
      CmsApi.write('content', '/cmstest/alpha', '{ not json')
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('write rejects an unresolvable brain path (behavior save-gate)', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    await expect(
      CmsApi.write(
        'content',
        '/cmstest/alpha',
        JSON.stringify({
          behaviors: [
            { brain: '/lib/behavior/does-not-exist', trigger: 'cadence:1s' },
          ],
        })
      )
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('write accepts a resolvable brain path', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
    vi.spyOn(StuffApi, 'findAllByTemplatePath').mockReturnValue([]);
    const out = await CmsApi.write(
      'content',
      '/cmstest/alpha',
      JSON.stringify({
        behaviors: [
          { brain: '/lib/behavior/idles', trigger: 'cadence:9s', config: {} },
        ],
      })
    );
    expect(out.backend).toBe('content');
  });

  it('write to a missing template throws CmsError(not-found)', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    await expect(
      CmsApi.write('content', '/cmstest/nope', JSON.stringify({ hp: 1 }))
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('write denied by can() throws CmsError(denied)', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    await expect(
      CmsApi.write('content', '/cmstest/alpha', JSON.stringify({ hp: 1 }))
    ).rejects.toBeInstanceOf(CmsError);
  });

  // ---- the anti-spoof / context-derivation security model ----

  it('gates on the CONTEXT-derived actor, never a passed value', async () => {
    // The gate subject must be exactly what getActingAuthor yields — there
    // is no actor parameter for a caller to substitute.
    const isAuthor = vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(true);
    await CmsApi.listTree('content', '/cmstest');
    expect(isAuthor).toHaveBeenCalledWith(ACTOR);
  });

  it('read is denied for a non-author context', async () => {
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    await expect(
      CmsApi.read('content', '/cmstest/alpha')
    ).rejects.toMatchObject({ code: 'denied' });
  });

  it('fails closed when the context has no acting principal', async () => {
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(null);
    // Real fail-closed shape: a null subject is never an author.
    vi.spyOn(AccessApi, 'isAuthor').mockImplementation(
      async (s) => s != null
    );
    await expect(
      CmsApi.listTree('content', '/cmstest')
    ).rejects.toMatchObject({ code: 'denied' });
  });
});

describe('CmsApi — source backend', () => {
  let tempDir: string;
  let tempLogical: string;

  beforeEach(async () => {
    StuffApi.clearAll();
    // Context yields a developer; source is developer-gated.
    vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(ACTOR);
    vi.spyOn(AccessApi, 'isDeveloper').mockResolvedValue(true);
    // The CMS source backend is rooted at the mudlib, so the temp tree
    // must live under mud/ and CMS paths are mud-relative.
    const name = `.tmp-cms-${Date.now()}`;
    tempDir = path.join(SANDBOX_ROOT, 'server', 'src', 'mud', name);
    await fs.mkdir(tempDir, { recursive: true });
    tempLogical = `/${name}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('listTree returns files + dirs with correct kinds', async () => {
    await fs.writeFile(path.join(tempDir, 'a.ts'), 'export {}');
    await fs.writeFile(path.join(tempDir, 'b.json'), '{}');
    await fs.mkdir(path.join(tempDir, 'sub'));

    const listing = await CmsApi.listTree('source', tempLogical);
    const byName = new Map(listing.entries.map((e) => [e.name, e]));
    expect(byName.get('a.ts')?.kind).toBe('leaf');
    expect(byName.get('sub')?.kind).toBe('folder');
    expect(byName.get('a.ts')?.path).toBe(`${tempLogical}/a.ts`);
  });

  it('read on a file returns raw body + language hint', async () => {
    await fs.writeFile(path.join(tempDir, 'a.ts'), 'export const x = 1;');
    const res = await CmsApi.read('source', `${tempLogical}/a.ts`);
    expect(res.body).toBe('export const x = 1;');
    expect(res.language).toBe('typescript');
    expect(res.kind).toBe('leaf');
  });

  it('read on a missing file throws CmsError(not-found)', async () => {
    await expect(
      CmsApi.read('source', `${tempLogical}/missing.ts`)
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('read on a "../" escape out of the mud root throws', async () => {
    await expect(
      CmsApi.read('source', '/../../etc/passwd')
    ).rejects.toThrow(/outside the source root/);
  });

  it('source root is the mudlib, not the monorepo', async () => {
    const listing = await CmsApi.listTree('source', '/');
    const names = listing.entries.map((e) => e.name);
    // mud/ top-level dirs; the old monorepo root would have had these.
    expect(names).toContain('api');
    expect(names).toContain('obj');
    expect(names).not.toContain('server');
    expect(names).not.toContain('client');
  });

  it('hides __tests__ folders from source listings', async () => {
    await fs.mkdir(path.join(tempDir, '__tests__'));
    await fs.writeFile(path.join(tempDir, 'real.ts'), 'export {}');
    const listing = await CmsApi.listTree('source', tempLogical);
    const names = listing.entries.map((e) => e.name);
    expect(names).toContain('real.ts');
    expect(names).not.toContain('__tests__');
  });

  it('source read is denied for a non-developer context', async () => {
    vi.spyOn(AccessApi, 'isDeveloper').mockResolvedValue(false);
    await expect(CmsApi.listTree('source', '/')).rejects.toMatchObject({
      code: 'denied',
    });
  });

  it('write (developer) writes bytes + invokes HotReloadApi.reload, reloaded:true', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'resolveSourceFolderZone').mockResolvedValue(null);
    const reload = vi
      .spyOn(HotReloadApi, 'reload')
      .mockResolvedValue(undefined);

    const out = await CmsApi.write(
      'source',
      `${tempLogical}/new.ts`,
      'export const y = 2;'
    );

    expect(out.reloaded).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    const written = await fs.readFile(path.join(tempDir, 'new.ts'), 'utf8');
    expect(written).toBe('export const y = 2;');
  });

  it('write when reload throws persists the file but reports reloaded:false', async () => {
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'resolveSourceFolderZone').mockResolvedValue(null);
    vi.spyOn(HotReloadApi, 'reload').mockRejectedValue(
      new Error('compile boom')
    );

    const out = await CmsApi.write(
      'source',
      `${tempLogical}/bad.ts`,
      'syntax((('
    );
    expect(out.reloaded).toBe(false);
    expect(out.reloadDetail).toBe('compile boom');
    // The bytes are on disk regardless.
    expect(await fs.readFile(path.join(tempDir, 'bad.ts'), 'utf8')).toBe(
      'syntax((('
    );
  });

  it('write by a non-developer throws CmsError(denied)', async () => {
    vi.spyOn(AccessApi, 'isDeveloper').mockResolvedValue(false);
    await expect(
      CmsApi.write('source', `${tempLogical}/x.ts`, 'export {}')
    ).rejects.toMatchObject({ code: 'denied' });
  });
});

describe('CmsLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-CmsApi caller', async () => {
    const logic = makeStuffAtPath(() => new CmsLogic(), '/obj/api/cms');
    expect(StuffApi.findByTemplatePath('/obj/api/cms')).toBe(logic);
    // The test module is not mud/api/cms#CmsApi; the FromModule gate on
    // the logic's own methods denies synchronously.
    expect(() => logic.listTree('content', '/')).toThrow(SecurityError);
  });
});

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateApi, TemplateError } from '../template';
import { TemplateLogic } from '../../platform/idea/api/TemplateLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(): {
  store: Doc[];
  save: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
} {
  const store: Doc[] = [];
  let nextId = 1;

  const save = vi.fn(async (collection: string, doc: Doc) => {
    if (collection !== Collections.Content) {
      throw new Error(`unexpected collection in test: ${collection}`);
    }
    const copy = { ...doc };
    // Folder/leaf invariant now lives in DomainHook, not in saveTemplate;
    // saveTemplate writes a clean doc. The old `__bypassTemplateCheck`
    // sentinel is gone; nothing to strip here.
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(nextId++);
    store.push(copy);
    return copy._id;
  });

  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Content) return [];
    if (typeof query.path === 'string') {
      return store.filter((d) => d.path === query.path);
    }
    const pathSpec = query.path as { $regex?: string } | undefined;
    if (pathSpec?.$regex) {
      const re = new RegExp(pathSpec.$regex);
      return store.filter((d) => re.test(d.path));
    }
    return store.slice();
  });

  const findById = vi.fn(async (collection: string, id: string) => {
    if (collection !== Collections.Content) return null;
    return store.find((d) => d._id === id) ?? null;
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
  } as unknown as PersistenceManager);

  return { store, save, find, findById };
}

describe('TemplateApi.saveTemplate', () => {
  let save: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const harness = installInMemoryStore();
    save = harness.save;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists a domain doc via PersistenceManager with no bypass flag', async () => {
    await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/platform/idea/location/CartesianZone',
      {}
    );
    expect(save).toHaveBeenCalledTimes(1);
    const [, doc] = save.mock.calls[0]!;
    expect((doc as Record<string, unknown>).__bypassTemplateCheck).toBeUndefined();
    expect((doc as Doc).path).toBe('/narnia/castle');
    expect((doc as Doc).class).toBe('/platform/idea/location/CartesianZone');
  });

  it('updates an existing template by _id when one exists at that path', async () => {
    await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/platform/idea/location/CartesianZone',
      { foo: 1 }
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/platform/idea/location/CartesianZone',
      { foo: 2 }
    );
    expect(save).toHaveBeenCalledTimes(2);
    const [, secondDoc] = save.mock.calls[1]!;
    expect((secondDoc as Doc)._id).toBeDefined();
  });

  it('passes hydratorClass through when provided', async () => {
    await TemplateApi.saveTemplate(
      '/narnia/door',
      '/platform/thing/Door',
      {},
      '/platform/idea/persistence/PersistentHydrator'
    );
    const [, doc] = save.mock.calls[0]!;
    expect((doc as Record<string, unknown>).hydratorClass).toBe('/platform/idea/persistence/PersistentHydrator');
  });
});

describe('TemplateApi.validateFolderLeafSave', () => {
  beforeEach(() => {
    installInMemoryStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects paths that do not start with /', async () => {
    await expect(
      TemplateApi.validateFolderLeafSave({
        path: 'narnia/castle',
        class: '/platform/idea/location/CartesianZone',
      })
    ).rejects.toThrow(TemplateError);
  });

  it('rejects docs missing path or class', async () => {
    await expect(
      TemplateApi.validateFolderLeafSave({ class: '/platform/idea/location/CartesianZone' })
    ).rejects.toThrow(/path.*class/);
    await expect(
      TemplateApi.validateFolderLeafSave({ path: '/x' })
    ).rejects.toThrow(/path.*class/);
  });

  it('accepts a Zone template saved under another Zone template', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/platform/idea/location/CartesianZone', {});
    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle/library',
        class: '/platform/idea/location/CartesianZone',
      })
    ).resolves.toBeUndefined();
  });

  it('accepts a leaf template saved beneath a Zone folder', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/platform/idea/location/CartesianZone', {});
    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle/foyer',
        class: '/platform/location/Room',
      })
    ).resolves.toBeUndefined();
  });

  it('rejects a leaf save when descendants already exist', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/platform/idea/location/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/platform/location/Room',
      {}
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle/library',
      '/platform/location/Room',
      {}
    );

    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle',
        class: '/platform/location/Room',
      })
    ).rejects.toThrow(/child template/i);
  });

  it('rejects saves under a non-Zone ancestor', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/platform/idea/location/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/platform/location/Room',
      {}
    );

    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle/foyer/tapestry',
        class: '/platform/location/Room',
      })
    ).rejects.toThrow(/leaf template/i);
  });

  it('admits a non-spatial Zone (Clade) as a folder ancestor', async () => {
    await TemplateApi.saveTemplate(
      '/stuff/idea/species/animalia',
      '/platform/idea/species/Clade',
      { name: 'Animalia', rank: 'kingdom' }
    );
    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/stuff/idea/species/animalia/foo',
        class: '/platform/location/Room',
      })
    ).resolves.toBeUndefined();
  });

  it('allows upgrading a parent path to a Zone template above an existing leaf', async () => {
    await TemplateApi.saveTemplate(
      '/orphanage/playroom',
      '/platform/location/Room',
      {}
    );

    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/orphanage',
        class: '/platform/idea/location/CartesianZone',
      })
    ).resolves.toBeUndefined();
  });
});

describe('TemplateApi.validateReservedPath', () => {
  beforeEach(() => {
    installInMemoryStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects saving a template under the reserved /platform/idea/api/ namespace', async () => {
    await expect(
      TemplateApi.validateReservedPath({
        path: '/platform/idea/api/material',
        class: '/platform/idea/material/Material',
      })
    ).rejects.toThrow(TemplateError);
  });

  it('rejects the bare reserved prefix itself (no trailing segment)', async () => {
    await expect(
      TemplateApi.validateReservedPath({ path: '/platform/idea/api' })
    ).rejects.toThrow(/reserved/);
  });

  it('allows ordinary /obj and /world paths', async () => {
    await expect(
      TemplateApi.validateReservedPath({ path: '/platform/idea/SoulCatalogue' })
    ).resolves.toBeUndefined();
    await expect(
      TemplateApi.validateReservedPath({ path: '/world/lounge/location/bar' })
    ).resolves.toBeUndefined();
  });
});

describe('TemplateApi.validateFolderLeafDelete', () => {
  beforeEach(() => {
    installInMemoryStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows deleting a leaf template', async () => {
    const id = await TemplateApi.saveTemplate(
      '/narnia/foyer',
      '/platform/location/Room',
      {}
    );
    await expect(TemplateApi.validateFolderLeafDelete(id)).resolves.toBeUndefined();
  });

  it('rejects deleting a Zone template that has descendants', async () => {
    const zoneId = await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/platform/idea/location/CartesianZone',
      {}
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/platform/location/Room',
      {}
    );

    await expect(TemplateApi.validateFolderLeafDelete(zoneId)).rejects.toThrow(
      /descendant/i
    );
  });

  it('allows deleting a Zone template with no descendants', async () => {
    const id = await TemplateApi.saveTemplate(
      '/empty-zone',
      '/platform/idea/location/CartesianZone',
      {}
    );
    await expect(TemplateApi.validateFolderLeafDelete(id)).resolves.toBeUndefined();
  });

  it('is a no-op when the doc is missing', async () => {
    await expect(TemplateApi.validateFolderLeafDelete('does-not-exist')).resolves.toBeUndefined();
  });
});

describe('TemplateLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-TemplateApi caller', () => {
    // A facade call lazily creates the logic singleton (ancestorPaths is
    // pure-synchronous, no DB needed).
    TemplateApi.ancestorPaths('/a/b/c');
    const logic = StuffApi.findByTemplatePath<TemplateLogic>(
      '/platform/idea/api/template'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/template#TemplateApi`, so the
    // FromModule gate on the logic's own methods denies the call. The
    // gate fires synchronously even for async methods.
    expect(() => logic!.ancestorPaths('/a/b/c')).toThrow(SecurityError);
  });
});

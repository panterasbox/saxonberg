import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateApi, TemplateError } from '../template';
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
    if (collection !== Collections.Domain) {
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
  });

  const findById = vi.fn(async (collection: string, id: string) => {
    if (collection !== Collections.Domain) return null;
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
      '/lib/spatial/CartesianZone',
      {}
    );
    expect(save).toHaveBeenCalledTimes(1);
    const [, doc] = save.mock.calls[0]!;
    expect((doc as Record<string, unknown>).__bypassTemplateCheck).toBeUndefined();
    expect((doc as Doc).path).toBe('/narnia/castle');
    expect((doc as Doc).class).toBe('/lib/spatial/CartesianZone');
  });

  it('updates an existing template by _id when one exists at that path', async () => {
    await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/lib/spatial/CartesianZone',
      { foo: 1 }
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/lib/spatial/CartesianZone',
      { foo: 2 }
    );
    expect(save).toHaveBeenCalledTimes(2);
    const [, secondDoc] = save.mock.calls[1]!;
    expect((secondDoc as Doc)._id).toBeDefined();
  });

  it('passes hydratorClass through when provided', async () => {
    await TemplateApi.saveTemplate(
      '/narnia/door',
      '/lib/spatial/Door',
      {},
      '/lib/stuff/Hydrator'
    );
    const [, doc] = save.mock.calls[0]!;
    expect((doc as Record<string, unknown>).hydratorClass).toBe('/lib/stuff/Hydrator');
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
        class: '/lib/spatial/CartesianZone',
      })
    ).rejects.toThrow(TemplateError);
  });

  it('rejects docs missing path or class', async () => {
    await expect(
      TemplateApi.validateFolderLeafSave({ class: '/lib/spatial/CartesianZone' })
    ).rejects.toThrow(/path.*class/);
    await expect(
      TemplateApi.validateFolderLeafSave({ path: '/x' })
    ).rejects.toThrow(/path.*class/);
  });

  it('accepts a Zone template saved under another Zone template', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle/library',
        class: '/lib/spatial/CartesianZone',
      })
    ).resolves.toBeUndefined();
  });

  it('accepts a leaf template saved beneath a Zone folder', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle/foyer',
        class: '/lib/spatial/CartesianLocation',
      })
    ).resolves.toBeUndefined();
  });

  it('rejects a leaf save when descendants already exist', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/lib/spatial/CartesianLocation',
      {}
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle/library',
      '/lib/spatial/CartesianLocation',
      {}
    );

    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle',
        class: '/lib/spatial/CartesianLocation',
      })
    ).rejects.toThrow(/child template/i);
  });

  it('rejects saves under a non-Zone ancestor', async () => {
    await TemplateApi.saveTemplate('/narnia/castle', '/lib/spatial/CartesianZone', {});
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/lib/spatial/CartesianLocation',
      {}
    );

    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/narnia/castle/foyer/tapestry',
        class: '/lib/spatial/CartesianLocation',
      })
    ).rejects.toThrow(/leaf template/i);
  });

  it('allows upgrading a parent path to a Zone template above an existing leaf', async () => {
    await TemplateApi.saveTemplate(
      '/orphanage/playroom',
      '/lib/spatial/CartesianLocation',
      {}
    );

    await expect(
      TemplateApi.validateFolderLeafSave({
        path: '/orphanage',
        class: '/lib/spatial/CartesianZone',
      })
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
      '/lib/spatial/CartesianLocation',
      {}
    );
    await expect(TemplateApi.validateFolderLeafDelete(id)).resolves.toBeUndefined();
  });

  it('rejects deleting a Zone template that has descendants', async () => {
    const zoneId = await TemplateApi.saveTemplate(
      '/narnia/castle',
      '/lib/spatial/CartesianZone',
      {}
    );
    await TemplateApi.saveTemplate(
      '/narnia/castle/foyer',
      '/lib/spatial/CartesianLocation',
      {}
    );

    await expect(TemplateApi.validateFolderLeafDelete(zoneId)).rejects.toThrow(
      /descendant/i
    );
  });

  it('allows deleting a Zone template with no descendants', async () => {
    const id = await TemplateApi.saveTemplate(
      '/empty-zone',
      '/lib/spatial/CartesianZone',
      {}
    );
    await expect(TemplateApi.validateFolderLeafDelete(id)).resolves.toBeUndefined();
  });

  it('is a no-op when the doc is missing', async () => {
    await expect(TemplateApi.validateFolderLeafDelete('does-not-exist')).resolves.toBeUndefined();
  });
});

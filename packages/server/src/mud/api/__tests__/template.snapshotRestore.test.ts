/**
 * TemplateApi.restoreFromTemplate tests — mechanism-level coverage.
 *
 * `restoreFromTemplate` re-hydrates a live Stuff from its backing Template's
 * `data` (the CMS / content-pack go-live path — `CmsLogic`/`PackLogic`
 * re-hydrate live clones from an edited template). The **snapshot**
 * direction (`snapshotToTemplate`) was retired with the Avatar migration onto
 * the persistence spine; its capture behavior now lives in
 * `PersistableLogic` and is covered by
 * `lib/persistence/__tests__/persistence-spine.test.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import PersistentHydrator from '../../lib/persistence/PersistentHydrator';
import { StuffApi } from '../stuff';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';
import type { FieldMeta } from '../../lib/mixin';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));

  const save = vi.fn(async (_c: string, doc: Doc) => {
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(store.length + 1);
    store.push(copy);
    return copy._id;
  });

  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    if (collection !== Collections.Domain) return [];
    if (typeof query.path === 'string') {
      return store.filter((d) => d.path === query.path);
    }
    return store.slice();
  });

  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
  } as unknown as PersistenceManager);

  return store;
}

// Test class with a couple of persistent fields and Containable shape.
class TestHost extends ContainableMixin(Idea) {
  static fieldMeta: FieldMeta = {
    nickname: { persistent: true },
    level: { persistent: true },
  };
  public nickname: string = 'default';
  public level: number = 1;
}

describe('TemplateApi.restoreFromTemplate', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('re-applies field values from the current template', async () => {
    const store = installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: { nickname: 'fresh', level: 7 },
      },
    ]);
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);
    host.nickname = 'in-memory';
    host.level = 1;

    // Pre-load the hydrator so the static path is registered first
    // (we're not stubbing loadClassByPath here, since the path
    // resolves via dynamic import). Force a manual register so the
    // restore doesn't need to dynamic-import.
    const hyd = await StuffApi.create(() => new PersistentHydrator());
    StuffApi.unregister(hyd);
    Stuff._stampTemplatePath(hyd, PersistentHydrator.templatePath);
    StuffApi.register(hyd);

    void store;
    await TemplateApi.restoreFromTemplate(host);
    expect(host.nickname).toBe('fresh');
    expect(host.level).toBe(7);
  });

  it('throws when host has no templatePath stamp', async () => {
    installInMemoryStore();
    const host = await StuffApi.create(() => new TestHost());
    await expect(TemplateApi.restoreFromTemplate(host)).rejects.toThrow(
      /no templatePath stamp/
    );
  });

  it('throws when the template does not exist', async () => {
    installInMemoryStore();
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/missing');
    StuffApi.register(host);
    await expect(TemplateApi.restoreFromTemplate(host)).rejects.toThrow(
      /no template at '\/test\/missing'/
    );
  });
});

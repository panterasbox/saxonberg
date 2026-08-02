import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi, TemplateError } from '../template';
import { StuffApi } from '../stuff';
import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';
import type { FieldMeta } from '../../lib/mixin';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
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

// Test class shapes used for the loadClassByPath stub.
class SingletonContainerTarget extends SingletonMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}

class NonSingletonContainerTarget extends ContainerMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

class ContainableSource extends ContainableMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

class NonContainableSource extends Idea {
  static fieldMeta: FieldMeta = {};
}

function stubLoadClassByPath() {
  return vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
    async (path: string) => {
      switch (path) {
        case '/test/SingletonContainerTarget':
          return SingletonContainerTarget as unknown as new (
            ...a: unknown[]
          ) => unknown;
        case '/test/NonSingletonContainerTarget':
          return NonSingletonContainerTarget as unknown as new (
            ...a: unknown[]
          ) => unknown;
        case '/test/ContainableSource':
          return ContainableSource as unknown as new (
            ...a: unknown[]
          ) => unknown;
        case '/test/NonContainableSource':
          return NonContainableSource as unknown as new (
            ...a: unknown[]
          ) => unknown;
        default:
          throw new Error(`unexpected class path: ${path}`);
      }
    }
  );
}

describe('TemplateApi.validateSingletonContainerTarget', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('skips when data.container is absent', async () => {
    installInMemoryStore();
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/x',
        class: '/test/ContainableSource',
        data: {},
      })
    ).resolves.toBeUndefined();
  });

  it('skips when data.container is non-string', async () => {
    installInMemoryStore();
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/x',
        class: '/test/ContainableSource',
        data: { container: { not: 'a string' } },
      })
    ).resolves.toBeUndefined();
  });

  it('skips when doc.class is not a string (folder/leaf validator catches earlier)', async () => {
    installInMemoryStore();
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/x',
        // class missing
        data: { container: '/test/SingletonContainerTarget' },
      })
    ).resolves.toBeUndefined();
  });

  it('throws when source class is not Containable', async () => {
    installInMemoryStore();
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/x',
        class: '/test/NonContainableSource',
        data: { container: '/test/SingletonContainerTarget' },
      })
    ).rejects.toThrow(TemplateError);
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/x',
        class: '/test/NonContainableSource',
        data: { container: '/test/SingletonContainerTarget' },
      })
    ).rejects.toThrow(/does not compose ContainableMixin/);
  });

  it('throws when target template does not exist', async () => {
    installInMemoryStore();
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/source',
        class: '/test/ContainableSource',
        data: { container: '/test/nonexistent' },
      })
    ).rejects.toThrow(/no template exists/);
  });

  it('throws when target class is not Singleton', async () => {
    installInMemoryStore([
      {
        path: '/test/non-singleton-room',
        class: '/test/NonSingletonContainerTarget',
        data: {},
      },
    ]);
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/source',
        class: '/test/ContainableSource',
        data: { container: '/test/non-singleton-room' },
      })
    ).rejects.toThrow(/does not compose `?SingletonMixin`?/);
  });

  it('passes when target is singleton-shaped', async () => {
    installInMemoryStore([
      {
        path: '/test/singleton-room',
        class: '/test/SingletonContainerTarget',
        data: {},
      },
    ]);
    stubLoadClassByPath();
    await expect(
      TemplateApi.validateSingletonContainerTarget({
        path: '/source',
        class: '/test/ContainableSource',
        data: { container: '/test/singleton-room' },
      })
    ).resolves.toBeUndefined();
  });
});

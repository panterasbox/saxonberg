import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Stuff } from '../Stuff';
import { Idea } from '../Idea';
import { SingletonMixin } from '../Singleton';
import { PopulatesMixin } from '../Populates';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import PersistentHydrator from '../../persistence/PersistentHydrator';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';

/**
 * PopulatesMixin tests — exercises the Phase-2 cascade end-to-end via
 * `StuffApi.singleton` against an in-memory Mongo store.
 */
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

// Test classes exposed via /test/* paths in the in-memory store so the
// dynamic-import path in StuffApi.loadClassByPath can resolve them. We
// can't actually do that (the import path would be physical), so we
// register the test classes directly via the in-memory store using
// real existing classes — but for class-shape checking we use
// `MixinApi.hasMixin` overload on the test classes via the export
// names below. Since the loadClassByPath dance is exercised by
// existing Apis (and we can't author new `/test/*.js` modules from
// tests), we test PopulatesMixin against real classes that compose
// the right shapes.

// Container + Singleton (folder-shaped — use ContainableMixin too so
// it's both container and containable, but we'll only use the
// container side here).
const SingletonContainerBase = SingletonMixin(
  ContainableMixin(ContainerMixin(Idea))
);
class SingletonContainerTest extends SingletonContainerBase {
  static persistentFields: string[] = [];
}

// Non-singleton Container.
const NonSingletonContainerBase = ContainableMixin(ContainerMixin(Idea));
class NonSingletonContainerTest extends NonSingletonContainerBase {
  static persistentFields: string[] = [];
}

// A populating Container (composes Populates + Container + Containable;
// no Singleton — we control its life cycle by hand).
const PopulatesHostBase = PopulatesMixin(
  ContainableMixin(ContainerMixin(Idea))
);
class PopulatesHostTest extends PopulatesHostBase {
  static persistentFields: string[] = [];
}

describe('PopulatesMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('declares populates as an instruction field', () => {
    const fields = MixinApi.getAllInstructionFields(PopulatesHostTest);
    expect(fields).toContain('populates');
  });

  it('declares _mixinName = "PopulatesMixin"', () => {
    const mixins = MixinApi.queryMixins(PopulatesHostTest);
    const names = mixins.map((m) => m._mixinName || m.name);
    expect(names).toContain('PopulatesMixin');
  });

  it('exposes applyPopulates on instances', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
    ]);
    const host = await StuffApi.create(() => new PopulatesHostTest());
    expect(typeof (host as unknown as { applyPopulates: unknown }).applyPopulates)
      .toBe('function');
  });

  it('handles empty populates array gracefully', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
    ]);
    const host = await StuffApi.create(() => new PopulatesHostTest());
    await host.applyPopulates([]);
    expect(host.getContents().length).toBe(0);
  });

  it('skips malformed entries (non-strings, empty strings)', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
    ]);
    const host = await StuffApi.create(() => new PopulatesHostTest());
    await host.applyPopulates([
      '',
      null as unknown as string,
      42 as unknown as string,
    ]);
    expect(host.getContents().length).toBe(0);
  });

  it('handles non-array specs as a no-op (defensive)', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
    ]);
    const host = await StuffApi.create(() => new PopulatesHostTest());
    await host.applyPopulates(undefined as unknown as string[]);
    expect(host.getContents().length).toBe(0);
  });

  it('throws when a populates entry references a missing template', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
    ]);
    const host = await StuffApi.create(() => new PopulatesHostTest());
    await expect(
      host.applyPopulates(['/test/missing'])
    ).rejects.toThrow(/no template at '\/test\/missing'/);
  });

  describe('dispatch by singleton-shape', () => {
    // We can't dynamically author /test/*.js modules from tests, so we
    // verify the dispatch by mocking StuffApi.loadClassByPath to return
    // our local test classes and StuffApi.singleton / clone to capture
    // calls. These tests pin the singleton-vs-clone dispatch and the
    // skip-when-already-placed semantics.

    it('dispatches to singleton() for singleton-shaped source templates', async () => {
      installInMemoryStore([
        {
          path: PersistentHydrator.templatePath,
          class: '/lib/persistence/PersistentHydrator',
          data: {},
        },
        {
          path: '/test/singleton-child',
          class: '/test/SingletonContainerTest',
          data: {},
        },
      ]);

      // Stub the class loader to return our test class.
      vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
        async (path: string) => {
          if (path === '/test/SingletonContainerTest') {
            return SingletonContainerTest as unknown as new (
              ...a: unknown[]
            ) => Stuff;
          }
          throw new Error(`unexpected class path: ${path}`);
        }
      );

      // Stub singleton to return a fresh singleton instance (pre-placed nowhere).
      const fakeChild = await StuffApi.create(() => new SingletonContainerTest());
      const singletonSpy = vi
        .spyOn(StuffApi, 'singleton')
        .mockImplementation(async (_path: string) => fakeChild as never);

      const host = await StuffApi.create(() => new PopulatesHostTest());
      await host.applyPopulates(['/test/singleton-child']);

      expect(singletonSpy).toHaveBeenCalledWith('/test/singleton-child');
      expect(host.hasContainable(fakeChild)).toBe(true);
    });

    it('dispatches to clone() for non-singleton source templates', async () => {
      installInMemoryStore([
        {
          path: PersistentHydrator.templatePath,
          class: '/lib/persistence/PersistentHydrator',
          data: {},
        },
        {
          path: '/test/non-singleton-child',
          class: '/test/NonSingletonContainerTest',
          data: {},
        },
      ]);

      vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
        async (path: string) => {
          if (path === '/test/NonSingletonContainerTest') {
            return NonSingletonContainerTest as unknown as new (
              ...a: unknown[]
            ) => Stuff;
          }
          throw new Error(`unexpected class path: ${path}`);
        }
      );

      const fakeChild = await StuffApi.create(
        () => new NonSingletonContainerTest()
      );
      const cloneSpy = vi
        .spyOn(StuffApi, 'clone')
        .mockImplementation(async (_path: string) => fakeChild as never);

      const host = await StuffApi.create(() => new PopulatesHostTest());
      await host.applyPopulates(['/test/non-singleton-child']);

      expect(cloneSpy).toHaveBeenCalledWith('/test/non-singleton-child');
      expect(host.hasContainable(fakeChild)).toBe(true);
    });

    it('skips moving a singleton already placed elsewhere', async () => {
      installInMemoryStore([
        {
          path: PersistentHydrator.templatePath,
          class: '/lib/persistence/PersistentHydrator',
          data: {},
        },
        {
          path: '/test/elsewhere-singleton',
          class: '/test/SingletonContainerTest',
          data: {},
        },
      ]);

      vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
        async () =>
          SingletonContainerTest as unknown as new (...a: unknown[]) => Stuff
      );

      const elsewhere = await StuffApi.create(() => new PopulatesHostTest());
      const child = await StuffApi.create(() => new SingletonContainerTest());
      // Pre-place the child elsewhere.
      const { ContainmentApi } = await import('../../../api/containment');
      ContainmentApi.move(child, elsewhere);
      expect(child.getContainer()).toBe(elsewhere);

      vi.spyOn(StuffApi, 'singleton').mockImplementation(
        async (_path: string) => child as never
      );

      const host = await StuffApi.create(() => new PopulatesHostTest());
      await host.applyPopulates(['/test/elsewhere-singleton']);

      // Still elsewhere — skip preserved its placement.
      expect(child.getContainer()).toBe(elsewhere);
      expect(host.hasContainable(child)).toBe(false);
    });

    it('always moves non-singletons even if they had a prior container (fresh clones)', async () => {
      installInMemoryStore([
        {
          path: PersistentHydrator.templatePath,
          class: '/lib/persistence/PersistentHydrator',
          data: {},
        },
        {
          path: '/test/non-singleton-child',
          class: '/test/NonSingletonContainerTest',
          data: {},
        },
      ]);

      vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
        async () =>
          NonSingletonContainerTest as unknown as new (
            ...a: unknown[]
          ) => Stuff
      );

      const child = await StuffApi.create(
        () => new NonSingletonContainerTest()
      );
      // Pre-place into something else.
      const { ContainmentApi } = await import('../../../api/containment');
      const elsewhere = await StuffApi.create(() => new PopulatesHostTest());
      ContainmentApi.move(child, elsewhere);

      vi.spyOn(StuffApi, 'clone').mockImplementation(
        async (_path: string) => child as never
      );

      const host = await StuffApi.create(() => new PopulatesHostTest());
      await host.applyPopulates(['/test/non-singleton-child']);

      // Moved into host regardless of prior container.
      expect(child.getContainer()).toBe(host);
      expect(host.hasContainable(child)).toBe(true);
      expect(elsewhere.hasContainable(child)).toBe(false);
    });
  });
});

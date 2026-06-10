/**
 * TemplateApi.snapshotToTemplate / restoreFromTemplate tests —
 * mechanism-level coverage. The Avatar-specific delegation tests
 * live alongside Avatar.test.ts; this file pins the substrate.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { Idea } from '../../lib/stuff/Idea';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import PersistentHydrator from '../../lib/persistence/PersistentHydrator';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';

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
  static persistentFields = ['nickname', 'level'];
  public nickname: string = 'default';
  public level: number = 1;
}

class SingletonRoom extends SingletonMixin(ContainerMixin(Idea)) {
  static persistentFields: string[] = [];
}

// Non-Containable test class.
class TestRecord extends Idea {
  static persistentFields = ['note'];
  public note: string = 'init';
}

describe('TemplateApi.snapshotToTemplate', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('captures persistentFields chain back to the template', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: { nickname: 'old', level: 1 },
      },
    ]);
    // Stub the class loader so /test/TestHost resolves locally.
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async () => TestHost as unknown as new (...a: unknown[]) => never
    );
    // Stub clone to mint a registered TestHost stamped at /test/host.
    const host = await StuffApi.create(() => new TestHost());
    const { Stuff } = await import('../../lib/stuff/Stuff');
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);

    host.nickname = 'shiny';
    host.level = 42;

    const tpl = await TemplateApi.snapshotToTemplate(host);
    await tpl.save();

    // tpl.data has the mutated values.
    expect(tpl.data.nickname).toBe('shiny');
    expect(tpl.data.level).toBe(42);
  });

  it('returns the mutated template WITHOUT persisting (caller commits)', async () => {
    const store = installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: { nickname: 'unchanged', level: 1 },
      },
    ]);
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async () => TestHost as unknown as new (...a: unknown[]) => never
    );
    const host = await StuffApi.create(() => new TestHost());
    const { Stuff } = await import('../../lib/stuff/Stuff');
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);
    host.nickname = 'mutated';

    const tpl = await TemplateApi.snapshotToTemplate(host);
    // Do NOT save — verify persisted doc is unchanged.
    expect(tpl.data.nickname).toBe('mutated');
    const persisted = store.find((d) => d.path === '/test/host');
    expect(persisted?.data.nickname).toBe('unchanged');
  });

  it('captures the derived container from the live ref when host is Containable', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: {},
      },
      {
        path: '/test/room-A',
        class: '/test/SingletonRoom',
        data: {},
      },
    ]);
    vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(
      async (p) => {
        if (p === '/test/TestHost') {
          return TestHost as unknown as new (...a: unknown[]) => never;
        }
        return SingletonRoom as unknown as new (...a: unknown[]) => never;
      }
    );
    const { Stuff } = await import('../../lib/stuff/Stuff');

    const room = await StuffApi.create(() => new SingletonRoom());
    StuffApi.unregister(room);
    Stuff._stampTemplatePath(room, '/test/room-A');
    StuffApi.register(room);

    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);

    ContainmentApi.move(host, room);

    const tpl = await TemplateApi.snapshotToTemplate(host);
    expect(tpl.data.container).toBe('/test/room-A');
  });

  it('clears data.container when host is in null container', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: { container: '/test/stale' },
      },
    ]);
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);
    // container remains null.

    const tpl = await TemplateApi.snapshotToTemplate(host);
    expect('container' in tpl.data).toBe(false);
  });

  it('does not touch data.container when host is not Containable', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/record',
        class: '/test/TestRecord',
        data: { container: '/junk/path', note: 'init' },
      },
    ]);
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestRecord());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/record');
    StuffApi.register(host);
    host.note = 'updated';

    const tpl = await TemplateApi.snapshotToTemplate(host);
    expect(tpl.data.container).toBe('/junk/path');
    expect(tpl.data.note).toBe('updated');
  });

  it('preserves non-persistentFields keys in template data', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: { someAuthorAddedKey: 'preserved', nickname: 'old', level: 1 },
      },
    ]);
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);
    host.nickname = 'new';

    const tpl = await TemplateApi.snapshotToTemplate(host);
    expect(tpl.data.someAuthorAddedKey).toBe('preserved');
    expect(tpl.data.nickname).toBe('new');
  });

  it('throws when host has no templatePath stamp', async () => {
    installInMemoryStore();
    const host = await StuffApi.create(() => new TestHost());
    // No stamp.
    await expect(TemplateApi.snapshotToTemplate(host)).rejects.toThrow(
      /no templatePath stamp/
    );
  });

  it('throws when the template does not exist', async () => {
    installInMemoryStore();
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/no-such-template');
    StuffApi.register(host);

    await expect(TemplateApi.snapshotToTemplate(host)).rejects.toThrow(
      /no template at '\/test\/no-such-template'/
    );
  });

  it('captures field values synchronously before first await (R9)', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/lib/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/host',
        class: '/test/TestHost',
        data: { nickname: 'baseline', level: 1 },
      },
    ]);
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const host = await StuffApi.create(() => new TestHost());
    StuffApi.unregister(host);
    Stuff._stampTemplatePath(host, '/test/host');
    StuffApi.register(host);
    host.nickname = 'pre-mutation';

    // Snapshot WITHOUT awaiting; then mutate; then await.
    const p = TemplateApi.snapshotToTemplate(host);
    host.nickname = 'post-mutation';
    const tpl = await p;
    await tpl.save();

    // Sync prefix captured the pre-mutation value.
    expect(tpl.data.nickname).toBe('pre-mutation');
  });
});

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

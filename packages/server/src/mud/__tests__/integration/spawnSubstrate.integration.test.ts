/**
 * Spawn-substrate integration test — exercises the
 * `populates:` / `container:` cascade end-to-end via lazy hydrate
 * from `StuffApi.singleton`. The fixture mirrors the requirements
 * doc's acceptance criteria: a singleton Container, a singleton
 * Containable declaring `data.container`, a non-singleton
 * Containable, and a parent Container declaring `populates:`.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { PopulatesMixin } from '../../lib/stuff/Populates';
import { ContainerMixin } from '../../lib/spatial/Container';
import { ContainableMixin } from '../../lib/spatial/Containable';
import PersistentHydrator from '../../obj/persistence/PersistentHydrator';
import { StuffApi } from '../../api/stuff';
import { HotReloadApi } from '../../api/hot-reload';
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
    if (collection !== Collections.Content) return [];
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

/**
 * Mirror of `StuffApi.#resolveAbsoluteClassPath` so test classes
 * registered via `HotReloadApi._registerForTest` match the absolute
 * path the cloner uses to look them up.
 */
function classPathToAbs(classPath: string): string {
  const mudDir = new URL('../../', import.meta.url);
  return fileURLToPath(new URL(`.${classPath}.ts`, mudDir));
}

// Singleton Container + Containable (a room / room-shaped fixture).
class SpawnTreasury extends SingletonMixin(
  ContainableMixin(ContainerMixin(Idea))
) {
  static fieldMeta: FieldMeta = {};
}

// Singleton Containable that declares `data.container` to land
// itself in the treasury.
class SpawnSword extends SingletonMixin(ContainableMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}

// Non-singleton Containable (a clone-per-need item).
class SpawnPotion extends ContainableMixin(Idea) {
  static fieldMeta: FieldMeta = {};
}

// Singleton Container + Populates parent (the library / spawner).
class SpawnLibrary extends SingletonMixin(
  PopulatesMixin(ContainableMixin(ContainerMixin(Idea)))
) {
  static fieldMeta: FieldMeta = {};
}

function registerTestClasses(): void {
  HotReloadApi._registerForTest(classPathToAbs('/obj/SpawnTreasury'), {
    SpawnTreasury,
  });
  HotReloadApi._registerForTest(classPathToAbs('/obj/SpawnSword'), {
    SpawnSword,
  });
  HotReloadApi._registerForTest(classPathToAbs('/obj/SpawnPotion'), {
    SpawnPotion,
  });
  HotReloadApi._registerForTest(classPathToAbs('/obj/SpawnLibrary'), {
    SpawnLibrary,
  });
}

describe('spawn substrate integration', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    HotReloadApi._clearAllForTest();
    registerTestClasses();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    HotReloadApi._clearAllForTest();
  });

  it('library populates: dispatches singleton-vs-clone correctly', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/obj/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/treasury',
        class: '/obj/SpawnTreasury',
        hydratorClass: PersistentHydrator.templatePath,
        data: {},
      },
      {
        path: '/test/sword',
        class: '/obj/SpawnSword',
        hydratorClass: PersistentHydrator.templatePath,
        data: { container: '/test/treasury' },
      },
      {
        path: '/test/potion',
        class: '/obj/SpawnPotion',
        hydratorClass: PersistentHydrator.templatePath,
        data: {},
      },
      {
        path: '/test/library',
        class: '/obj/SpawnLibrary',
        hydratorClass: PersistentHydrator.templatePath,
        data: { populates: ['/test/sword', '/test/potion'] },
      },
    ]);

    const library = await StuffApi.singleton<SpawnLibrary>('/test/library');
    const treasury = StuffApi.findByTemplatePath<SpawnTreasury>(
      '/test/treasury'
    )!;
    const sword = StuffApi.findByTemplatePath<SpawnSword>('/test/sword')!;

    // Sword is a singleton with data.container; its applyContainer
    // placed it in /test/treasury. Library's applyPopulates skipped
    // it (already elsewhere).
    expect(sword.getContainer()).toBe(treasury);
    expect(library.hasContainable(sword as never)).toBe(false);
    expect(treasury.hasContainable(sword as never)).toBe(true);

    // Potion is non-singleton; library cloned a fresh one and moved
    // it in.
    expect(library.getContents().length).toBe(1);
    const potion = library.getContents()[0]!;
    expect(potion).toBeInstanceOf(SpawnPotion);
    expect(potion.getContainer()).toBe(library);
  });

  it('clone-from-template with data.container places the child via Layer 3 (hydration self-placement)', async () => {
    installInMemoryStore([
      {
        path: PersistentHydrator.templatePath,
        class: '/obj/persistence/PersistentHydrator',
        data: {},
      },
      {
        path: '/test/treasury',
        class: '/obj/SpawnTreasury',
        hydratorClass: PersistentHydrator.templatePath,
        data: {},
      },
      {
        path: '/test/sword',
        class: '/obj/SpawnSword',
        hydratorClass: PersistentHydrator.templatePath,
        data: { container: '/test/treasury' },
      },
    ]);

    // Resolve sword fresh — its applyContainer should have placed
    // it in the treasury during hydration.
    const sword = await StuffApi.singleton<SpawnSword>('/test/sword');
    const treasury = StuffApi.findByTemplatePath<SpawnTreasury>(
      '/test/treasury'
    )!;
    expect(sword.getContainer()).toBe(treasury);
  });
});

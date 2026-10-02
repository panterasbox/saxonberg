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

import "../../../test-bootstrap";
import { EXIT_KIND_TEST_ROWS } from '../../../mud/lib/security/__tests__/test-setup';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { Idea } from '../../lib/stuff/Idea';
import { ContainableMixin } from '../../lib/spatial/Containable';
import TemplateApplier from '../../platform/idea/TemplateApplier';
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
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  // ⭐ Every exit is a clone of a kind row and every boundary's anchor
  // pair is a clone too, so a store with no rows cannot build one.
  const store: Doc[] = [...(EXIT_KIND_TEST_ROWS as unknown as Doc[]), ...initial].map(
    (d, i) => ({ ...d, _id: String(i + 1) }),
  );

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
        path: TemplateApplier.templatePath,
        class: '/platform/idea/TemplateApplier',
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
    const hyd = await StuffApi.create(() => new TemplateApplier());
    StuffApi.unregister(hyd);
    Stuff._stampTemplatePath(hyd, TemplateApplier.templatePath);
    StuffApi.register(hyd);

    void store;
    await TemplateApi.restoreFromTemplate(host);
    expect(host.nickname).toBe('fresh');
    expect(host.level).toBe(7);
  });

  // ⚠⚠ **THE MONEY FIX, through the real go-live path.** `Stackable.quantity`
  // is `birthOnly`, and `restoreFromTemplate` is what a CMS save and a
  // `pack sync` call on every live instance at an edited path. Before
  // 2026-10-01 a save on the coin row re-applied its authored
  // `quantity: 1` to every live stack in the world — minting and burning
  // outside the conservation chokepoint, invisibly, which is exactly what
  // the chokepoint exists to make impossible.
  it('⚠⚠ go-live leaves a live stack alone while an ordinary edit lands', async () => {
    const { Stuff } = await import('../../lib/stuff/Stuff');
    const { StackableMixin } = await import('../../lib/stuff/Stackable');

    class TestStack extends StackableMixin(ContainableMixin(Idea)) {
      static fieldMeta: FieldMeta = {
        nickname: { persistent: true },
      };
      public nickname = 'default';
    }

    installInMemoryStore([
      {
        path: TemplateApplier.templatePath,
        class: '/platform/idea/TemplateApplier',
        data: {},
      },
      {
        path: '/test/stack',
        class: '/test/TestStack',
        // The row authors a starting count of ONE, as `Coin.yaml` does.
        data: { quantity: 1, nickname: 'edited' },
      },
    ]);

    const stack = await StuffApi.create(() => new TestStack());
    StuffApi.unregister(stack);
    Stuff._stampTemplatePath(stack, '/test/stack');
    StuffApi.register(stack);
    // A live stack somebody is holding.
    stack.setQuantity(500);
    stack.nickname = 'in-memory';

    const applier = await StuffApi.create(() => new TemplateApplier());
    StuffApi.unregister(applier);
    Stuff._stampTemplatePath(applier, TemplateApplier.templatePath);
    StuffApi.register(applier);

    await TemplateApi.restoreFromTemplate(stack);

    expect(stack.getQuantity()).toBe(500); // ⬅ nobody's money changed
    expect(stack.nickname).toBe('edited'); // ⬅ the edit still went live
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

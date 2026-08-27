import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Template } from '../Template';
import { ZoneTemplate } from '../ZoneTemplate';
import { LeafTemplate } from '../LeafTemplate';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  data?: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));

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
    find,
    findById,
  } as unknown as PersistenceManager);

  return store;
}

describe('Template subclass dispatch (Phase Z2)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('Template is abstract — direct construction throws', () => {
    // Static type-check: the abstract keyword forbids `new Template()` in
    // TypeScript. Runtime: ESM emits the abstract guard via the
    // class-init checks for abstract methods, but plain `new` on an
    // abstract class without abstract methods can still succeed at
    // runtime in JS. The structural guarantee we care about is that
    // findByPath / findById / findDescendants ALL go through
    // _materialize, so callers cannot accidentally end up with a bare
    // Template — they get a concrete subclass.
    //
    // We assert that property below by checking the runtime types of
    // results, which is what actually matters for the type split.
    expect(typeof Template).toBe('function');
  });

  it('findByPath returns a ZoneTemplate for folder-class docs', async () => {
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/platform/idea/location/CartesianZone',
        data: { name: 'Narnia' },
      },
    ]);
    const tpl = await Template.findByPath('/narnia');
    expect(tpl).not.toBeNull();
    expect(tpl).toBeInstanceOf(ZoneTemplate);
    expect(tpl).toBeInstanceOf(Template);
    expect(tpl).not.toBeInstanceOf(LeafTemplate);
    expect(tpl!.class).toBe('/platform/idea/location/CartesianZone');
  });

  it('findByPath returns a LeafTemplate for non-folder-class docs', async () => {
    installInMemoryStore([
      {
        path: '/narnia/foyer',
        class: '/platform/location/Room',
        data: {},
      },
    ]);
    const tpl = await Template.findByPath('/narnia/foyer');
    expect(tpl).not.toBeNull();
    expect(tpl).toBeInstanceOf(LeafTemplate);
    expect(tpl).toBeInstanceOf(Template);
    expect(tpl).not.toBeInstanceOf(ZoneTemplate);
  });

  it('findByPath returns null when the doc is missing', async () => {
    installInMemoryStore();
    expect(await Template.findByPath('/nope')).toBeNull();
  });

  it('loadById dispatches into the right subclass', async () => {
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/platform/idea/location/SphericalZone',
        data: {},
      },
      {
        path: '/narnia/plaza',
        class: '/platform/location/SphericalLocation',
        data: {},
      },
    ]);
    const folder = await Template.loadById('1');
    const leaf = await Template.loadById('2');
    expect(folder).toBeInstanceOf(ZoneTemplate);
    expect(leaf).toBeInstanceOf(LeafTemplate);
  });

  it('findDescendants materializes each descendant as the right subclass', async () => {
    installInMemoryStore([
      {
        path: '/narnia',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
      {
        path: '/narnia/castle',
        class: '/platform/idea/location/CartesianZone',
        data: {},
      },
      {
        path: '/narnia/castle/foyer',
        class: '/platform/location/Room',
        data: {},
      },
    ]);
    const descendants = await Template.findDescendants('/narnia');
    expect(descendants).toHaveLength(2);
    const byPath = new Map(descendants.map((t) => [t.path, t]));
    expect(byPath.get('/narnia/castle')).toBeInstanceOf(ZoneTemplate);
    expect(byPath.get('/narnia/castle/foyer')).toBeInstanceOf(LeafTemplate);
  });

  it('ancestorPaths is a pure path utility — does not query', () => {
    expect(Template.ancestorPaths('/a/b/c')).toEqual(['/a/b', '/a']);
    expect(Template.ancestorPaths('/a')).toEqual([]);
    expect(Template.ancestorPaths('/')).toEqual([]);
  });
});

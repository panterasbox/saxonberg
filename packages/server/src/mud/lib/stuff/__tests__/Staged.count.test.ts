/**
 * `count:` and `as:` — the entry shape template inheritance needed.
 *
 * ⭐⭐ `as` is the PRECONDITION for inheriting a designation list, not a
 * convenience. Without an entry identity the merge must choose between
 * appending the child's entries and replacing the parent's, and each is
 * right about half the time — a doubled jacket or a missing pair of
 * shoes, neither of which says anything.
 *
 * `count:` is the other half: twelve identical lime lines and six
 * identical stool lines were one authoring gesture written longhand, and
 * a repeat with no identity is an entry no child row can ever address.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Stuff } from '../Stuff';
import { Idea } from '../Idea';
import { SingletonMixin } from '../Singleton';
import { StagedMixin } from '../Staged';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { SurfacedMixin } from '../../spatial/Surfaced';
import PersistentHydrator from '../../../platform/idea/persistence/PersistentHydrator';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { BehavedMixin } from '../../behavior/Behaved';
import type { FieldMeta } from '../../mixin';

type Doc = Record<string, unknown> & {
  _id?: string;
  path: string;
  class: string;
  hydratorClass?: string;
  data: Record<string, unknown>;
};

function installInMemoryStore(initial: Doc[] = []): void {
  const store: Doc[] = initial.map((d, i) => ({ ...d, _id: String(i + 1) }));
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save: vi.fn(async () => 'x'),
    find: vi.fn(async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      if (typeof query.path === 'string') {
        return store.filter((d) => d.path === query.path);
      }
      return store.slice();
    }),
  } as unknown as PersistenceManager);
}

const PlainBase = ContainableMixin(ContainerMixin(Idea));
class PlainThing extends PlainBase {
  static fieldMeta: FieldMeta = {};
}
const SurfaceBase = SurfacedMixin(ContainableMixin(ContainerMixin(Idea)));
class SurfaceThing extends SurfaceBase {
  static fieldMeta: FieldMeta = {};
}
const SingletonBase = SingletonMixin(ContainableMixin(ContainerMixin(Idea)));
class SingletonThing extends SingletonBase {
  static fieldMeta: FieldMeta = {};
}
const AgentBase = BehavedMixin(ContainableMixin(ContainerMixin(Idea)));
class AgentThing extends AgentBase {
  static fieldMeta: FieldMeta = {};
}
const HostBase = StagedMixin(ContainableMixin(ContainerMixin(Idea)));
class HostThing extends HostBase {
  static fieldMeta: FieldMeta = {};
}

const CLASSES: Record<string, unknown> = {
  '/test/PlainThing': PlainThing,
  '/test/SurfaceThing': SurfaceThing,
  '/test/SingletonThing': SingletonThing,
  '/test/AgentThing': AgentThing,
};

const ROWS: Doc[] = [
  { path: PersistentHydrator.templatePath, class: '/platform/idea/persistence/PersistentHydrator', data: {} },
  { path: '/test/lime', class: '/test/PlainThing', data: {} },
  { path: '/test/bench', class: '/test/SurfaceThing', data: {} },
  { path: '/test/only-one', class: '/test/SingletonThing', data: {} },
  { path: '/test/person', class: '/test/AgentThing', data: {} },
];

/**
 * The class loader, the clone and the singleton — stubbed together,
 * because `StuffApi.clone` resolves its class by physical import and a
 * test cannot author `/test/*.ts` modules. The Staged suite beside this
 * one takes the same license for the same reason.
 */
function stubClasses(): void {
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (path: string) => {
    const c = CLASSES[path];
    if (!c) throw new Error(`unexpected class path: ${path}`);
    return c as new (...a: unknown[]) => Stuff;
  });
  const mintOf = async (path: string): Promise<Stuff> => {
    const row = ROWS.find((r) => r.path === path);
    if (!row) throw new Error(`no row at ${path}`);
    const C = CLASSES[row.class] as new () => Stuff;
    return StuffApi.create(() => new C());
  };
  vi.spyOn(StuffApi, 'clone').mockImplementation(
    (path: string) => mintOf(path) as never,
  );
  const singletons = new Map<string, Stuff>();
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
    let s = singletons.get(path);
    if (!s) {
      s = await mintOf(path);
      singletons.set(path, s);
    }
    return s as never;
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  installInMemoryStore(ROWS);
  stubClasses();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('count:', () => {
  it('mints N clones from one line', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await host.applyProps([{ template: '/test/lime', count: 12 }]);
    expect(host.getContents().length).toBe(12);
  });

  it('a bare string is still exactly one', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await host.applyProps(['/test/lime']);
    expect(host.getContents().length).toBe(1);
  });

  it('REFUSES a count on a Singleton — there is only ever one', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await expect(
      host.applyProps([{ template: '/test/only-one', count: 3 }]),
    ).rejects.toThrow(/only ever be one of/);
  });

  it('REFUSES a count on cast — twelve of a person is twelve people', async () => {
    const host = await StuffApi.create(() => new HostThing());
    // `CastSpec` has no `count`, so TypeScript already refuses this — the
    // cast is what a YAML row can do and the compiler cannot.
    await expect(
      host.applyCast([
        { template: '/test/person', count: 3 } as unknown as { template: string },
      ]),
    ).rejects.toThrow(/count is a props feature/);
  });

  it('REFUSES a count that is not a whole number of at least 1', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await expect(
      host.applyProps([{ template: '/test/lime', count: 0 }]),
    ).rejects.toThrow(/whole number of at least 1/);
    await expect(
      host.applyProps([{ template: '/test/lime', count: 2.5 }]),
    ).rejects.toThrow(/whole number of at least 1/);
  });
});

describe('as:', () => {
  it('`onto` resolves against an `as` as well as against a path', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await host.applyProps([
      { template: '/test/bench', as: 'counter' },
      { template: '/test/lime', onto: 'counter' },
    ]);
    const bench = host.getContents().find((c) => c instanceof SurfaceThing)!;
    const lime = host.getContents().find((c) => c instanceof PlainThing)!;
    // The lime rests ON the bench — which is the whole point of `onto`,
    // and the reason `as` has to be a placement key and not just a label.
    expect(lime.getRestingOn()).toBe(bench);
  });

  it('⚠ REFUSES two entries sharing one `as` — an identity with two claimants', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await expect(
      host.applyProps([
        { template: '/test/lime', as: 'x' },
        { template: '/test/bench', as: 'x' },
      ]),
    ).rejects.toThrow(/two entries share/);
  });
});

describe('the once-guard still holds', () => {
  it('a second applyProps lays nothing, merged list or not', async () => {
    const host = await StuffApi.create(() => new HostThing());
    await host.applyProps([{ template: '/test/lime', count: 3 }]);
    await host.applyProps([{ template: '/test/lime', count: 3 }, '/test/bench']);
    expect(host.getContents().length).toBe(3);
  });
});

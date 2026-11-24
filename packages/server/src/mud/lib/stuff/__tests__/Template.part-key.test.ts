/**
 * ⭐⭐ persistence-model D1 + D2 — a kept container keeps wherever it is
 * staged.
 *
 * A kept container standing as a PROP in a plain place is keyed by its part
 * name (the host's handle and the entry's `as`, else its path, a repeat
 * `~n`, a count `#n`), and restores its own record where the staging walk
 * mints it. Before this, a consignment shelf in a plain hall had no key: it
 * never captured and never restored, and came back empty at every boot.
 *
 * `isKept` reads the class and walks the chain: a chest in a kept room is
 * kept, the same chest in a plain room is not, and a body keeps itself.
 */
import '../../../../test-bootstrap';
import { withSaveMany } from '../../persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../Idea';
import type { Stuff } from '../Stuff';
import { StagedMixin } from '../Staged';
import { Template } from '../Template';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { PersistableMixin } from '../../persistence/Persistable';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistenceManager, Collections } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { PersistableApi } from '../../../api/persistable';
import { ContainmentApi } from '../../../api/containment';
import { ParcelApi } from '../../../api/parcel';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

/** A plain (staged) hall. */
class PlainHall extends StagedMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}
/** A kept room. */
class KeptRoom extends PersistableMixin(StagedMixin(ContainerMixin(Idea))) {
  static fieldMeta: FieldMeta = {};
}
/** A kept shelf — a kept container class, not a singleton. */
class KeptShelf extends PersistableMixin(ContainerMixin(ContainableMixin(Idea))) {
  static fieldMeta: FieldMeta = {};
}
/** A plain chest. */
class Chest extends ContainerMixin(ContainableMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}
/** A good. */
class Cup extends ContainableMixin(Idea) {
  static fieldMeta: FieldMeta = { tag: { persistent: true } };
  tag = '';
  getTag(): string {
    return this.tag;
  }
  setTag(v: string): void {
    this.tag = v;
  }
}

const CTORS: Record<string, new () => Stuff> = {
  '/t/KeptShelf': KeptShelf,
  '/t/Chest': Chest,
  '/t/Cup': Cup,
};
const CLASSES: Record<string, () => Stuff> = Object.fromEntries(
  Object.entries(CTORS).map(([k, C]) => [k, () => new C()]),
);
const ROWS: Record<string, string> = {
  '/t/shelf': '/t/KeptShelf',
  '/t/chest': '/t/Chest',
  '/t/cup': '/t/Cup',
};

let snapshots: Record<string, unknown>[];
let seenKeys: string[];

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];
  seenKeys = [];
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col === Collections.Content) {
      const path = query.path as string;
      const cls = ROWS[path];
      return cls ? [{ _id: path, path, class: cls, data: {} }] : [];
    }
    if (col !== 'holder_snapshots') return [];
    return snapshots.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v));
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(
    withSaveMany({ isConnected: () => true, save, find, findById: vi.fn(), delete: vi.fn() }) as unknown as PersistenceManager,
  );
  vi.spyOn(StuffApi, 'loadClassByPath').mockImplementation(async (cls: string) => {
    const C = CTORS[cls];
    if (!C) throw new Error(`unexpected class ${cls}`);
    return C as never;
  });
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    const f = CLASSES[ROWS[path] ?? ''];
    if (!f) throw new Error(`no row at ${path}`);
    return makeStuffAtPath(f, path);
  }) as unknown as typeof StuffApi.clone);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'testbed' });
  const real = PersistableApi.restoreOrSeed.bind(PersistableApi);
  vi.spyOn(PersistableApi, 'restoreOrSeed').mockImplementation(async (host, key) => {
    seenKeys.push(key);
    return real(host, key);
  });
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  vi.spyOn(Template, 'findByPath').mockImplementation(async (path: string) => {
    const cls = ROWS[path];
    return cls ? ({ path, class: cls, data: {} } as unknown as Template) : null;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function shelvesIn(host: Stuff & { getContents(): Stuff[] }): KeptShelf[] {
  return host.getContents().filter((c): c is KeptShelf => c instanceof KeptShelf);
}

describe('⭐ D2 — a kept container standing as a prop is keyed by its part name', () => {
  it('names each part from the host and the entry: `as`, else the path, a repeat ~n, a count #n', async () => {
    const hall = makeStuffAtPath(() => new PlainHall(), '/w/hall');
    await hall.applyProps([
      { template: '/t/shelf', as: 'lockers' },
      '/t/shelf',
      '/t/shelf',
      { template: '/t/shelf', count: 2 },
      '/t/chest',
    ]);
    expect(seenKeys).toEqual([
      '/w/hall/lockers',
      '/w/hall/t/shelf',
      '/w/hall/t/shelf~2',
      '/w/hall/t/shelf~3#1',
      '/w/hall/t/shelf~3#2',
    ]);
    // A plain chest is not keyed — it rides its room.
    expect(shelvesIn(hall)).toHaveLength(5);
  });

  it('⭐ a shelf in a PLAIN hall keeps what was put in it across a simulated restart; the hall restages', async () => {
    const hall = makeStuffAtPath(() => new PlainHall(), '/w/hall');
    await hall.applyProps([{ template: '/t/shelf', as: 'shelf' }]);
    const [shelf] = shelvesIn(hall);
    const cup = makeStuffAtPath(() => new Cup(), '/t/cup');
    cup.setTag('mine');
    ContainmentApi.move(cup, shelf!);
    const loose = makeStuffAtPath(() => new Cup(), '/t/cup');
    loose.setTag('stray');
    ContainmentApi.move(loose, hall);
    await PersistableApi.captureAtShutdown();

    // The restart: everything goes, the hall restages from its row.
    StuffApi.clearAll();
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    const again = makeStuffAtPath(() => new PlainHall(), '/w/hall');
    await again.applyProps([{ template: '/t/shelf', as: 'shelf' }]);
    const [back] = shelvesIn(again);
    const kept = back!.getContents().filter((c): c is Cup => c instanceof Cup);
    expect(kept.map((c) => c.getTag())).toEqual(['mine']);
    // The stray in the plain hall is gone.
    expect(again.getContents().filter((c) => c instanceof Cup)).toHaveLength(0);
  });

  it('two shelves of one row in two places are two records', async () => {
    const a = makeStuffAtPath(() => new PlainHall(), '/w/a');
    const b = makeStuffAtPath(() => new PlainHall(), '/w/b');
    await a.applyProps([{ template: '/t/shelf', as: 'shelf' }]);
    await b.applyProps([{ template: '/t/shelf', as: 'shelf' }]);
    const owners = snapshots.filter((s) => s.scope === '/t/shelf').map((s) => s.owner).sort();
    expect(owners).toEqual(['/w/a/shelf', '/w/b/shelf']);
  });
});

describe('⭐ D1 — isKept reads the class and walks the chain', () => {
  it('a chest in a kept room is kept; the same chest in a plain room is not; a kept shelf is kept anywhere', async () => {
    const room = makeStuffAtPath(() => new KeptRoom(), '/w/room');
    await PersistableApi.capture(room);
    const hall = makeStuffAtPath(() => new PlainHall(), '/w/hall');
    const inRoom = makeStuffAtPath(() => new Chest(), '/t/chest');
    const inHall = makeStuffAtPath(() => new Chest(), '/t/chest');
    ContainmentApi.move(inRoom, room);
    ContainmentApi.move(inHall, hall);
    expect(room.isKept()).toBe(true);
    expect(inRoom.isKept()).toBe(true);
    expect(hall.isKept()).toBe(false);
    expect(inHall.isKept()).toBe(false);
    await hall.applyProps([{ template: '/t/shelf', as: 'shelf' }]);
    const [shelf] = shelvesIn(hall);
    expect(shelf!.isKept()).toBe(true);
  });
});

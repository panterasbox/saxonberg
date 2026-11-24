/**
 * ⭐⭐ persistence-model D9 — a good is kept by its container, whoever holds
 * title.
 *
 *  - An owned good left in a kept room round-trips in THAT ROOM's record
 *    and is absent from its owner's.
 *  - A person's record is what they carry.
 *  - A pinned host writes `pinned: true` on its record, and only when its
 *    key is explicit (N8).
 */
import '../../../../test-bootstrap';
import { withSaveMany } from './pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { PersistableMixin } from '../Persistable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { ChattelMixin } from '../../chattel/Chattel';
import { EstateMixin } from '../../chattel/Estate';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { PersistableApi } from '../../../api/persistable';
import { ContainmentApi } from '../../../api/containment';
import { ParcelApi } from '../../../api/parcel';
import { ChattelApi } from '../../../api/chattel';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

class Room extends PersistableMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}
class Person extends PersistableMixin(EstateMixin(ContainerMixin(ContainableMixin(Idea)))) {
  static fieldMeta: FieldMeta = {};
}
class Cup extends ChattelMixin(ContainableMixin(Idea)) {
  static fieldMeta: FieldMeta = { tag: { persistent: true } };
  tag = '';
  getTag(): string {
    return this.tag;
  }
  setTag(v: string): void {
    this.tag = v;
  }
}
class Pinner extends PersistableMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
  override pinsResidency(): boolean {
    return true;
  }
}

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
  ChattelApi._resetRegistryRefForReload();
  snapshots = [];
  const find = vi.fn(async (col: string, q: Record<string, unknown>) =>
    col === 'holder_snapshots' ? snapshots.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)) : [],
  );
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
    if (i >= 0) snapshots[i] = { ...doc, _id: snapshots[i]!._id };
    else snapshots.push({ ...doc, _id: String(snapshots.length + 1) });
    return 'id';
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(
    withSaveMany({ isConnected: () => true, save, find, findById: vi.fn(), delete: vi.fn() }) as unknown as PersistenceManager,
  );
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'g' });
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) =>
    makeStuffAtPath(() => new Cup(), path)) as unknown as typeof StuffApi.clone);
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});
afterEach(() => vi.restoreAllMocks());

const ALICE = '/platform/agent/Avatar/alice';

describe('⭐ D9 — a good is kept by its container, whoever holds title', () => {
  it('an owned good left in a kept room rides THE ROOM, never its owner', async () => {
    const room = makeStuffAtPath(() => new Room(), '/w/room');
    const alice = makeStuffAtPath(() => new Person(), ALICE);
    const cup = makeStuffAtPath(() => new Cup(), '/t/cup');
    vi.spyOn(cup, 'stampedOwner').mockReturnValue({ kind: 'player', templatePath: ALICE });
    cup.setTag('alice’s');
    ContainmentApi.move(cup, room);
    await PersistableApi.capture(room);
    await PersistableApi.capture(alice);

    const roomRec = JSON.stringify(snapshots.find((s) => s.scope === '/w/room')?.state);
    const aliceRec = JSON.stringify(snapshots.find((s) => s.scope === ALICE)?.state);
    expect(roomRec).toContain('/t/cup');
    expect(aliceRec).not.toContain('/t/cup');

    // The room restarts and the cup is there.
    StuffApi.clearAll();
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    const again = makeStuffAtPath(() => new Room(), '/w/room');
    await PersistableApi.materialize(again);
    const cups = again.getContents().filter((c): c is Cup => c instanceof Cup);
    expect(cups.map((c) => c.getTag())).toEqual(['alice’s']);
  });

  it('a person’s record is what they carry', async () => {
    const alice = makeStuffAtPath(() => new Person(), ALICE);
    const cup = makeStuffAtPath(() => new Cup(), '/t/cup');
    ContainmentApi.move(cup, alice);
    await PersistableApi.capture(alice);
    expect(JSON.stringify(snapshots.find((s) => s.scope === ALICE)?.state)).toContain('/t/cup');
  });
});

describe('⭐ N8 — the pin rides the record', () => {
  it('a pinning host writes pinned:true only once its key is explicit', async () => {
    const p = makeStuffAtPath(() => new Pinner(), '/w/pet');
    await PersistableApi.capture(p);
    expect(snapshots.find((s) => s.scope === '/w/pet')?.pinned).toBe(false);
    await PersistableApi.capture(p, 'pet-1');
    const rec = snapshots.find((s) => s.scope === '/w/pet' && s.owner === 'pet-1');
    expect(rec?.pinned).toBe(true);
    expect(await PersistableApi.pinned()).toEqual([{ scope: '/w/pet', key: 'pet-1' }]);
  });
});

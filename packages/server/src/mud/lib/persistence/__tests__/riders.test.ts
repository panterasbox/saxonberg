/**
 * ⭐ persistence-model D4 — a rider is kept by the host it rides.
 *
 * A thing with no record of its own (a holding's building, a building on
 * its kept entrance) nests its state in a kept host's record under a name.
 * A rider adopted BEFORE the host restores takes its state at the restore;
 * one adopted AFTER takes it at adoption. The rider writes no record.
 */
import '../../../../test-bootstrap';
import { withSaveMany } from './pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { PersistableMixin } from '../Persistable';
import { ContainerMixin } from '../../spatial/Container';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { StuffApi } from '../../../api/stuff';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { FieldMeta } from '../../mixin';

class Room extends PersistableMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}
class House extends Idea {
  static fieldMeta: FieldMeta = { condition: { persistent: true } };
  condition = 1;
  getCondition(): number {
    return this.condition;
  }
  setCondition(v: number): void {
    this.condition = v;
  }
}

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
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
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});
afterEach(() => vi.restoreAllMocks());

describe('⭐ riders (persistence-model D4)', () => {
  it('a rider rides its host’s record, writes none of its own, and comes back whether adopted before or after the restore', async () => {
    const room = makeStuffAtPath(() => new Room(), '/w/room');
    const house = makeStuffAtPath(() => new House(), '/w/house');
    await PersistableApi.adoptRider(room, 'structure', house);
    house.setCondition(0.4);
    // A capture reached through the rider writes its host.
    await PersistableApi.captureHostOf(house);
    expect(snapshots.map((s) => s.scope)).toEqual(['/w/room']);

    // Restart — the rider is adopted AFTER the host restores.
    StuffApi.clearAll();
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    const room2 = makeStuffAtPath(() => new Room(), '/w/room');
    await PersistableApi.materialize(room2);
    const house2 = makeStuffAtPath(() => new House(), '/w/house');
    expect(house2.getCondition()).toBe(1);
    await PersistableApi.adoptRider(room2, 'structure', house2);
    expect(house2.getCondition()).toBe(0.4);

    // ...and BEFORE: adopted first, the restore hands it over.
    StuffApi.clearAll();
    makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
    const room3 = makeStuffAtPath(() => new Room(), '/w/room');
    const house3 = makeStuffAtPath(() => new House(), '/w/house');
    await PersistableApi.adoptRider(room3, 'structure', house3);
    await PersistableApi.materialize(room3);
    expect(house3.getCondition()).toBe(0.4);
  });

  it('a host that keeps no record refuses a rider', async () => {
    const house = makeStuffAtPath(() => new House(), '/w/house');
    const other = makeStuffAtPath(() => new House(), '/w/other');
    await expect(PersistableApi.adoptRider(other, 'structure', house)).rejects.toThrow(/keeps no record/);
  });
});

/**
 * The uniqueness invariant — *no two live instances share a
 * `(scope, key)`* — and the needle that made it vacuous.
 *
 * ⚠⚠ `assertUniqueKey` scanned `findAllByTemplatePath(scope)`, where
 * `scope` is the host's own `getIdentityPath()`. For an
 * identity-stamped host that bucket holds exactly one object — the host
 * — which the loop then skips. So the assertion **never fired for a
 * stamped keyed host**: the market stall counter has never been covered
 * by it, and a second instance standing up on an occupied key wrote to
 * the first one's record.
 *
 * The population that can collide is the ROW's, so the row is what gets
 * scanned. Everything about the record stays put: its `scope` field is
 * still the identity, and the registry's keying is untouched.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistableApi } from '../../../../api/persistable';
import { StuffApi } from '../../../../api/stuff';
import { ParcelApi } from '../../../../api/parcel';
import TemplateApplier from '../../TemplateApplier';
import { PersistableMixin } from '../../../../lib/persistence/Persistable';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import type { FieldMeta } from '../../../../lib/mixin';

// ⚠ A synthetic row under `/test/**`: a KERNEL test proves the kernel,
// and naming the real market stall here would couple the spine's
// invariant to one locality's content (`lint:test-content`). The SHAPE
// is the stall's — an identity-stamped, explicitly keyed host — which is
// the population the needle got wrong. The stall's own suite drives the
// real one.
const ROW = '/test/uniquekey/thing/counter';

/** A keyed, multi-instance holder — the stall counter's shape. */
class Counter extends PersistableMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = { label: { persistent: true } };
  label = '';
  getLabel(): string {
    return this.label;
  }
  setLabel(v: string): void {
    this.label = v;
  }
}

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];

  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return [];
    return snapshots.filter((d) =>
      Object.entries(query).every(([k, v]) => d[k] === v),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex(
      (d) => d.scope === doc.scope && d.owner === doc.owner,
    );
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
    kind: 'group',
    name: 'terminus',
  });

  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('assertUniqueKey covers a stamped keyed host', () => {
  it('⭐⭐ two IDENTITY-STAMPED clones of one row cannot share a key', async () => {
    // This is the case the old needle could not see: each host's own
    // identity bucket holds only itself.
    const first = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/pitch-1`);
    const second = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/pitch-2`);

    await PersistableApi.restoreOrSeed(first, 'renter-key');
    await expect(
      PersistableApi.restoreOrSeed(second, 'renter-key'),
    ).rejects.toThrow(/both keyed 'renter-key'/);
  });

  it('the throw names the ROW, which is the population that collides', async () => {
    const first = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/pitch-1`);
    const second = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/pitch-2`);
    await PersistableApi.restoreOrSeed(first, 'k');
    await expect(PersistableApi.restoreOrSeed(second, 'k')).rejects.toThrow(
      new RegExp(`two live instances of '${ROW}'`),
    );
  });

  it('two UNSTAMPED clones of one row still cannot share a key', async () => {
    // The case that already worked — it must keep working.
    const first = makeStuffAtPath(() => new Counter(), ROW);
    const second = makeStuffAtPath(() => new Counter(), ROW);
    await PersistableApi.restoreOrSeed(first, 'k');
    await expect(PersistableApi.restoreOrSeed(second, 'k')).rejects.toThrow(
      /both keyed 'k'/,
    );
  });

  it('distinct keys stand up side by side, stamped or not', async () => {
    const stampedA = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/p1`);
    const stampedB = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/p2`);
    await PersistableApi.restoreOrSeed(stampedA, 'a');
    await PersistableApi.restoreOrSeed(stampedB, 'b');
    expect(stampedA.getPersistenceKey()).toBe('a');
    expect(stampedB.getPersistenceKey()).toBe('b');

    // And each record is filed under its own IDENTITY, unchanged.
    expect(snapshots.map((d) => d.scope)).toEqual([
      `${ROW}/p1`,
      `${ROW}/p2`,
    ]);
    expect(snapshots.map((d) => d.owner)).toEqual(['a', 'b']);
  });

  it('a freed key can be taken by the next instance', async () => {
    const first = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/p1`);
    await PersistableApi.restoreOrSeed(first, 'k');
    StuffApi.unregister(first);

    const second = makeStuffAtPath(() => new Counter(), ROW, `${ROW}/p2`);
    await expect(
      PersistableApi.restoreOrSeed(second, 'k'),
    ).resolves.toBe(false);
  });
});

/**
 * ⭐ A switch's state survives a restore (aether-devices drive, step 14).
 *
 * `Switchable`'s `on` has no slot of its own — it lives in the bistate
 * core — so the capture's `field in host` check used to skip it, and every
 * switch came back in its row's state: a phone switched off woke up on.
 * The boolean-noun convention reads it from `isOn()`.
 *
 * ⚠ Paths are synthetic (`/test/**`): a kernel test proves the kernel.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistableApi } from '../../../api/persistable';
import { StuffApi } from '../../../api/stuff';
import { ParcelApi } from '../../../api/parcel';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistableMixin } from '../../persistence/Persistable';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { withSaveMany } from '../../persistence/__tests__/pm-fake';
import { Idea } from '../../stuff/Idea';
import { SwitchableMixin } from '../Switchable';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

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
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(withSaveMany({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  }) as unknown as PersistenceManager);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
    kind: 'group',
    name: 'test',
  });
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Capture `a`, then materialize a FRESH instance at the same path. */
async function roundTrip<T extends Stuff>(
  make: () => T,
  path: string,
  set: (host: T) => void,
): Promise<T> {
  const a = makeStuffAtPath(make, path);
  set(a);
  await PersistableApi.capture(a);
  StuffApi.clearAll();
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  const b = makeStuffAtPath(make, path);
  await PersistableApi.materialize(b);
  return b;
}

class Lamp extends PersistableMixin(SwitchableMixin(Idea)) {}

describe('Switchable — the state round-trips', () => {
  it('⭐ switched off, it comes back off', async () => {
    const b = await roundTrip(() => new Lamp(), '/test/switchable/lamp', (h) => {
      h.setOn(true);
      h.setOn(false);
    });
    expect(b.isOn()).toBe(false);
  });

  it('switched on, it comes back on', async () => {
    const b = await roundTrip(() => new Lamp(), '/test/switchable/lamp-on', (h) => h.setOn(true));
    expect(b.isOn()).toBe(true);
  });
});

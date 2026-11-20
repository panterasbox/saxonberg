/**
 * ⭐ The shutdown sweep saves everything inside its grace (db-performance
 * W4, D8): a capture is ONE keyed upsert on `{scope, owner}` — atomic
 * against the unique index, so two first captures of one host can no
 * longer both insert — and the sweep prepares hosts a few at a time and
 * writes twenty-five records to a batch, reporting what it saved, what
 * failed, and how long it took.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { PersistApi } from '../../../api/persist';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { PersistableMixin } from '../Persistable';
import { ContainerMixin } from '../../spatial/Container';
import { StagedMixin } from '../../stuff/Staged';
import { Idea } from '../../stuff/Idea';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { installRecordTestDb, type RecordTestDb } from './record-test-db';
import type { FieldMeta } from '../../mixin';

class Room extends PersistableMixin(StagedMixin(ContainerMixin(Idea))) {
  static fieldMeta: FieldMeta = { label: { persistent: true } };
  label = '';
  setLabel(v: string): void {
    this.label = v;
  }
}

let db: RecordTestDb;

function room(path: string, key: string, label = path): Room {
  const r = makeStuffAtPath(() => new Room(), path) as unknown as Room;
  r.setLabel(label);
  r.setPersistenceKey(key);
  return r;
}

beforeEach(() => {
  StuffApi.clearAll();
  db = installRecordTestDb();
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'lounge' });
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
});

afterEach(() => {
  vi.restoreAllMocks();
  db.reset();
});

describe('a capture is one keyed write', () => {
  it('two concurrent first captures of one host leave ONE row', async () => {
    const r = room('/test/sweep/one', 'k1', 'first');
    await Promise.all([PersistableApi.capture(r), PersistableApi.capture(r)]);
    const rows = db.all('holder_snapshots').filter((x) => x.scope === '/test/sweep/one');
    expect(rows).toHaveLength(1);
  });

  it('a capture makes no read of the record — one write, keyed on scope and owner', async () => {
    const r = room('/test/sweep/two', 'k2');
    const find = vi.spyOn(PersistApi, 'find');
    const many = vi.spyOn(PersistApi, 'saveMany');
    await PersistableApi.capture(r);
    expect(find.mock.calls.filter(([c]) => c === 'holder_snapshots')).toHaveLength(0);
    expect(many).toHaveBeenCalledTimes(1);
    expect(many.mock.calls[0]![1][0]!.key).toEqual(['scope', 'owner']);
  });
});

describe('the shutdown sweep', () => {
  it('writes N hosts in ⌈N/25⌉ batches and reports N', async () => {
    for (let i = 0; i < 60; i++) room(`/test/sweep/r${i}`, `k${i}`);
    const many = vi.spyOn(PersistApi, 'saveMany');
    const report = await PersistableApi.captureAtShutdown();
    expect(report.captured).toBe(60);
    expect(report.failed).toBe(0);
    expect(report.ms).toBeGreaterThanOrEqual(0);
    expect(many.mock.calls.filter(([c]) => c === 'holder_snapshots')).toHaveLength(3);
    expect(db.all('holder_snapshots')).toHaveLength(60);
  });

  it('a host whose prepare throws is counted failed; the rest are written', async () => {
    for (let i = 0; i < 5; i++) room(`/test/sweep/ok${i}`, `ok${i}`);
    const bad = room('/test/sweep/bad', 'bad');
    vi.spyOn(bad, 'getIdentityPath').mockReturnValue(null);
    const report = await PersistableApi.captureAtShutdown();
    expect(report.failed).toBe(1);
    expect(report.captured).toBe(5);
  });

  it('a batch the database refuses is counted failed, whole', async () => {
    for (let i = 0; i < 3; i++) room(`/test/sweep/x${i}`, `x${i}`);
    vi.spyOn(PersistApi, 'saveMany').mockRejectedValueOnce(new Error('the link dropped'));
    const report = await PersistableApi.captureAtShutdown();
    expect(report).toMatchObject({ captured: 0, failed: 3 });
  });
});

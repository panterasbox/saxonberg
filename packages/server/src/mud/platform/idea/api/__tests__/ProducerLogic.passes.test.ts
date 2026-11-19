/**
 * ⭐ The producer pass scores who changed, and decay is read, not
 * rewritten (db-performance W3 — D4, D5, D6). The proof the ANSWER did not
 * change: a standing read at any instant equals what a fresh full pass at
 * that instant stores, to 1e-9 relative, and every band agrees. And the
 * proof the COST did: a pass re-scores only the subjects that changed, an
 * idle pass touches the database not at all, a changed value function
 * forces a full pass, and a failed pass gives its work back.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProducerApi } from '../../../../api/producer';
import { PersistApi } from '../../../../api/persist';
import { AppSettings } from '../../../../lib/config/AppSettings';
import ProducerStanding from '../../../../lib/standing/ProducerStanding';
import { Band } from '../../../../lib/standing/Band';
import { WorldClockApi } from '../../../../api/worldclock';
import { installRecordTestDb, type RecordTestDb } from '../../../../lib/persistence/__tests__/record-test-db';

const DAY = 86_400_000;
const T0 = 1_800_000_000_000;
const A = '/platform/agent/Avatar/a';
const B = '/platform/agent/Avatar/b';
const C = '/platform/agent/Avatar/c';
/** The engaging reader (never an author here). */
const R = '/platform/agent/Avatar/reader';

let db: RecordTestDb;
let now = T0;

async function settings(halfLifeS: string): Promise<void> {
  db.all('app_settings').splice(0);
  AppSettings._resetForTesting();
  const s = new AppSettings();
  s.setValue('producer.bucketSeconds', '600');
  s.setValue('producer.decayHalfLife', halfLifeS);
  await s.save();
  await AppSettings.warm();
}

function close(a: number, b: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));
}

/** Every subject's read, now. */
const reads = (): number[] => [A, B, C].map((s) => ProducerApi.producerOf(s));

beforeEach(async () => {
  db = installRecordTestDb();
  now = T0;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  WorldClockApi._setNowProviderForTesting(() => 4242);
  ProducerStanding._resetForTesting();
  await settings(String(7 * 86_400));
  // A mix: A three old buckets, B one fresh, C five spread over a fortnight.
  for (const d of [1, 3, 9]) await ProducerApi.append({ author: A, actor: R, realAt: T0 - d * DAY });
  await ProducerApi.append({ author: B, actor: R, realAt: T0 - 60_000 });
  for (const d of [0.5, 2, 4, 8, 13]) await ProducerApi.append({ author: C, actor: R, realAt: T0 - d * DAY });
  await ProducerApi.recompute({ full: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  ProducerStanding._resetForTesting();
  AppSettings._resetForTesting();
  db.reset();
});

describe('ProducerLogic — the pass scores who changed; decay is read', () => {
  it('1 — a read days later equals a fresh full pass then, and every band agrees', async () => {
    now = T0 + 3 * DAY + 12_345;
    const decayed = reads();
    expect(decayed[0]).toBeLessThan(3);
    await ProducerApi.recompute({ full: true });
    const fresh = reads();
    decayed.forEach((v, i) => close(v, fresh[i]!));
    decayed.forEach((v, i) => expect(Band.fromScalar(v).name).toBe(Band.fromScalar(fresh[i]!).name));
  });

  it('2 — one subject acts: only its row is written, and every read still equals a full pass', async () => {
    now = T0 + DAY;
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await ProducerApi.append({ author: A, actor: R, realAt: now });
    await ProducerApi.recompute();
    const written = spy.mock.calls.flatMap(([, writes]) => writes.map((w) => w.doc.subject));
    expect(written).toEqual([A]);
    now = T0 + 2 * DAY;
    const viaDirty = reads();
    await ProducerApi.recompute({ full: true });
    viaDirty.forEach((v, i) => close(v, reads()[i]!));
  });

  it('3 — nothing changed: the pass makes no database call at all', async () => {
    const find = vi.spyOn(PersistApi, 'find');
    const many = vi.spyOn(PersistApi, 'saveMany');
    const save = vi.spyOn(PersistApi, 'save');
    now = T0 + DAY;
    await ProducerApi.recompute();
    await ProducerApi.recompute();
    expect(find).not.toHaveBeenCalled();
    expect(many).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('4 — a changed half-life forces a full pass', async () => {
    await settings(String(2 * 86_400));
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await ProducerApi.recompute();
    const written = new Set(spy.mock.calls.flatMap(([, writes]) => writes.map((w) => w.doc.subject)));
    expect(written).toEqual(new Set([A, B, C]));
  });

  it('5 — a point with no instant reads flat (the test seam, an old row)', () => {
    ProducerStanding._putForTesting(ProducerStanding.key('/x', '*'), 2);
    now = T0 + 30 * DAY;
    expect(ProducerApi.producerOf('/x')).toBe(2);
  });

  it('6 — a pass that throws puts its subjects back for the next', async () => {
    await ProducerApi.append({ author: B, actor: R, realAt: now + 700_000 });
    vi.spyOn(PersistApi, 'saveMany').mockRejectedValueOnce(new Error('the link dropped'));
    await expect(ProducerApi.recompute()).rejects.toThrow(/link dropped/);
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await ProducerApi.recompute();
    const written = spy.mock.calls.flatMap(([, writes]) => writes.map((w) => w.doc.subject));
    expect(written).toEqual([B]);
  });

  it('a row written by an earlier pass (stored figure + instant) decays from its instant after a restart', async () => {
    // A fresh warm reads the rows as they are: the figure and its instant.
    ProducerStanding._resetForTesting();
    await ProducerStanding.warm();
    now = T0 + 5 * DAY;
    const warmed = reads();
    await ProducerApi.recompute({ full: true });
    warmed.forEach((v, i) => close(v, reads()[i]!));
  });
});

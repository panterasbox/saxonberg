/**
 * ⭐ The participation pass scores who changed, and decay is read, not
 * rewritten (db-performance W3 — D4, D5, D6). The proof the ANSWER did not
 * change: a standing read at any instant equals what a fresh full pass at
 * that instant stores, to 1e-9 relative, and every band agrees. And the
 * proof the COST did: a pass re-scores only the subjects that changed, an
 * idle pass touches the database not at all, a changed value function
 * forces a full pass, and a failed pass gives its work back.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumerApi } from '../../../../api/consumer';
import { PersistApi } from '../../../../api/persist';
import { StuffApi } from '../../../../api/stuff';
import { AppSettings } from '../../../../lib/config/AppSettings';
import ParticipationStanding from '../../../../lib/standing/ParticipationStanding';
import { Band } from '../../../../lib/standing/Band';
import { WorldClockApi } from '../../../../api/worldclock';
import { installRecordTestDb, type RecordTestDb } from '../../../../lib/persistence/__tests__/record-test-db';

const DAY = 86_400_000;
const T0 = 1_800_000_000_000;
const A = '/platform/agent/Avatar/a';
const B = '/platform/agent/Avatar/b';
const C = '/platform/agent/Avatar/c';

let db: RecordTestDb;
let now = T0;

async function settings(halfLifeS: string): Promise<void> {
  db.all('app_settings').splice(0);
  AppSettings._resetForTesting();
  const s = new AppSettings();
  s.setValue('participation.bucketSeconds', '600');
  s.setValue('participation.decayHalfLife', halfLifeS);
  await s.save();
  await AppSettings.warm();
}

function close(a: number, b: number): void {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));
}

/** Every subject's read, now. */
const reads = (): number[] => [A, B, C].map((s) => ConsumerApi.participationOf(s));

beforeEach(async () => {
  // A fresh logic singleton: its per-bucket credit memo (H1) belongs to
  // the store this test installs.
  StuffApi.clearAll();
  db = installRecordTestDb();
  now = T0;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  WorldClockApi._setNowProviderForTesting(() => 4242);
  ParticipationStanding._resetForTesting();
  await settings(String(7 * 86_400));
  // A mix: A three old buckets, B one fresh, C five spread over a fortnight.
  for (const d of [1, 3, 9]) await ConsumerApi.append({ subject: A, realAt: T0 - d * DAY });
  await ConsumerApi.append({ subject: B, realAt: T0 - 60_000 });
  for (const d of [0.5, 2, 4, 8, 13]) await ConsumerApi.append({ subject: C, realAt: T0 - d * DAY });
  await ConsumerApi.recompute({ full: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  ParticipationStanding._resetForTesting();
  AppSettings._resetForTesting();
  db.reset();
});

describe('ConsumerLogic — the pass scores who changed; decay is read', () => {
  it('1 — a read days later equals a fresh full pass then, and every band agrees', async () => {
    now = T0 + 3 * DAY + 12_345;
    const decayed = reads();
    expect(decayed[0]).toBeLessThan(3);
    await ConsumerApi.recompute({ full: true });
    const fresh = reads();
    decayed.forEach((v, i) => close(v, fresh[i]!));
    decayed.forEach((v, i) => expect(Band.fromScalar(v).name).toBe(Band.fromScalar(fresh[i]!).name));
  });

  it('2 — one subject acts: only its row is written, and every read still equals a full pass', async () => {
    now = T0 + DAY;
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await ConsumerApi.append({ subject: A, realAt: now });
    await ConsumerApi.recompute();
    const written = spy.mock.calls.flatMap(([, writes]) => writes.map((w) => w.doc.subject));
    expect(written).toEqual([A]);
    now = T0 + 2 * DAY;
    const viaDirty = reads();
    await ConsumerApi.recompute({ full: true });
    viaDirty.forEach((v, i) => close(v, reads()[i]!));
  });

  it('3 — nothing changed: the pass makes no database call at all', async () => {
    const find = vi.spyOn(PersistApi, 'find');
    const many = vi.spyOn(PersistApi, 'saveMany');
    const save = vi.spyOn(PersistApi, 'save');
    now = T0 + DAY;
    await ConsumerApi.recompute();
    await ConsumerApi.recompute();
    expect(find).not.toHaveBeenCalled();
    expect(many).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('4 — a changed half-life forces a full pass', async () => {
    await settings(String(2 * 86_400));
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await ConsumerApi.recompute();
    const written = new Set(spy.mock.calls.flatMap(([, writes]) => writes.map((w) => w.doc.subject)));
    expect(written).toEqual(new Set([A, B, C]));
  });

  it('5 — a point with no instant reads flat (the test seam, an old row)', () => {
    ParticipationStanding._putForTesting(ParticipationStanding.key('/x', '*'), 2);
    now = T0 + 30 * DAY;
    expect(ConsumerApi.participationOf('/x')).toBe(2);
  });

  it('6 — a pass that throws puts its subjects back for the next', async () => {
    await ConsumerApi.append({ subject: B, realAt: now + 700_000 });
    vi.spyOn(PersistApi, 'saveMany').mockRejectedValueOnce(new Error('the link dropped'));
    await expect(ConsumerApi.recompute()).rejects.toThrow(/link dropped/);
    const spy = vi.spyOn(PersistApi, 'saveMany');
    await ConsumerApi.recompute();
    const written = spy.mock.calls.flatMap(([, writes]) => writes.map((w) => w.doc.subject));
    expect(written).toEqual([B]);
  });

  it('a row written by an earlier pass (stored figure + instant) decays from its instant after a restart', async () => {
    // A fresh warm reads the rows as they are: the figure and its instant.
    ParticipationStanding._resetForTesting();
    await ParticipationStanding.warm();
    now = T0 + 5 * DAY;
    const warmed = reads();
    await ConsumerApi.recompute({ full: true });
    warmed.forEach((v, i) => close(v, reads()[i]!));
  });
});

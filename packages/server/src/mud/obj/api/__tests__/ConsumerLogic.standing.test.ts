/**
 * ConsumerLogic — the consumer-stock projection `max(0, renownOf) ×
 * participationOf`. Covers the load-bearing `max(0, …)` clamp (register
 * D5 — net notoriety disenfranchises, never anti-enfranchises), the
 * multiplication for positive renown, and that the output carries the
 * `'consumer'` stock tag.
 *
 * Renown is stubbed; participation is seeded into the standing cache.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsumerApi } from '../../../api/consumer';
import { RenownApi } from '../../../api/renown';
import ParticipationStanding, { PARTICIPATION_WIDE } from '../../../lib/standing/ParticipationStanding';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

/** Seed a participation standing into the warmed cache. */
async function seedParticipation(subject: string, value: number): Promise<void> {
  const row = new ParticipationStanding();
  row.subject = subject;
  row.scope = PARTICIPATION_WIDE;
  row.value = value;
  await row.save();
  await ParticipationStanding.warm();
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  ParticipationStanding._resetForTesting();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  ParticipationStanding._resetForTesting();
  StuffApi.clearAll();
});

const S = '/obj/Avatar/subject';

describe('ConsumerApi.standingOf (the projection)', () => {
  it('multiplies positive renown by participation', async () => {
    vi.spyOn(RenownApi, 'renownOf').mockReturnValue(2);
    await seedParticipation(S, 10);
    const st = ConsumerApi.standingOf(S);
    expect(st.scalar).toBe(20);
    expect(st.stock).toBe('consumer');
    expect(st.band.name).toBe('established'); // 20 ≥ established(20)
  });

  it('clamps net-negative renown to the participation-independent floor', async () => {
    vi.spyOn(RenownApi, 'renownOf').mockReturnValue(-5);
    await seedParticipation(S, 1000); // lots of participation...
    const st = ConsumerApi.standingOf(S);
    expect(st.scalar).toBe(0); // ...but max(0, -5) × 1000 = 0
    expect(st.band.name).toBe('dormant');
  });

  it('is zero with no participation regardless of renown', async () => {
    vi.spyOn(RenownApi, 'renownOf').mockReturnValue(50);
    const st = ConsumerApi.standingOf(S); // no participation seeded → 0
    expect(st.scalar).toBe(0);
    expect(st.stock).toBe('consumer');
  });
});

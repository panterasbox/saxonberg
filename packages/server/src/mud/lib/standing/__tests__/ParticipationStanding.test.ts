/**
 * ParticipationStanding — the materialized aggregate Document + its warmed
 * read cache. Covers: a cold cache reads the neutral 0 (never throws);
 * `warm` loads saved rows keyed by `{subject, scope}`; round-trip.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ParticipationStanding, { PARTICIPATION_WIDE } from '../ParticipationStanding';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

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
});

describe('ParticipationStanding', () => {
  it('reads the neutral 0 from a cold cache (never throws)', () => {
    expect(
      ParticipationStanding.cached().get(
        ParticipationStanding.key('/p', PARTICIPATION_WIDE)
      )
    ).toBeUndefined();
  });

  it('warm loads saved rows into the cache, keyed by {subject, scope}', async () => {
    const a = new ParticipationStanding();
    a.subject = '/p1';
    a.value = 3.5;
    a.recomputedAt = 100;
    await a.save();

    await ParticipationStanding.warm();
    expect(
      ParticipationStanding.cached().get(
        ParticipationStanding.key('/p1', PARTICIPATION_WIDE)
      )
    ).toBe(3.5);
  });
});

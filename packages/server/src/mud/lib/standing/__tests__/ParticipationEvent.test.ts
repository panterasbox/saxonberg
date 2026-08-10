/**
 * ParticipationEvent — the append-only active-bucket row. Covers the
 * collection name and that the persisted fields round-trip through the
 * faked PM (the renown harness).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ParticipationEvent from '../ParticipationEvent';
import { Collections, PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

beforeEach(() => {
  store = new Map();
  idCounter = 0;
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

afterEach(() => vi.restoreAllMocks());

describe('ParticipationEvent', () => {
  it('targets the participation_events collection', () => {
    expect(ParticipationEvent.collectionName).toBe(
      Collections.ParticipationEvents
    );
  });

  it('round-trips its persisted fields', async () => {
    const ev = new ParticipationEvent();
    ev.subject = '/p1';
    ev.bucket = 42;
    ev.kind = 'command';
    ev.at = 1000;
    ev.realAt = 25_200_000;
    await ev.save();

    const [loaded] = await ParticipationEvent.find({ subject: '/p1' });
    expect(loaded).toBeDefined();
    expect(loaded!.subject).toBe('/p1');
    expect(loaded!.bucket).toBe(42);
    expect(loaded!.kind).toBe('command');
    expect(loaded!.at).toBe(1000);
    expect(loaded!.realAt).toBe(25_200_000);
  });
});

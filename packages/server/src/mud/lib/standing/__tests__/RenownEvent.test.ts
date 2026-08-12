/**
 * RenownEvent persistence — a plain `Document` (one row per signal) in
 * the `renown_events` collection, indexed/queried on `subject`. Covers: a
 * saved event round-trips its fields; the nested `signal` payload and the
 * `groups` scope axis survive; `subject` is the query key (a different
 * subject's rows are excluded); `selfReaction` is derivable as
 * `source === subject` (not stored).
 *
 * Mongo is faked with an in-memory collection (the chronicle/belief-store
 * harness).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RenownEvent from '../RenownEvent';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RenownEvent', () => {
  it('round-trips its fields, nested signal, and scope axes', async () => {
    const ev = new RenownEvent();
    ev.subject = '/obj/Avatar/p1';
    ev.source = '/obj/Avatar/p2';
    ev.kind = 'reaction';
    ev.signal = { emote: 'applaud', tags: ['cheer'], commandId: 'cmd-1' };
    ev.locality = '/university-avenue';
    ev.groups = ['contacts:thieves-guild', 'contacts:cohort-7'];
    ev.at = 4242; // game-time seconds
    ev.realAt = 1_700_000_000_000; // wall-time epoch ms
    await ev.save();

    const found = await RenownEvent.find({ subject: '/obj/Avatar/p1' });
    expect(found).toHaveLength(1);
    const f = found[0]!;
    expect(f.source).toBe('/obj/Avatar/p2');
    expect(f.kind).toBe('reaction');
    expect(f.signal).toEqual({
      emote: 'applaud',
      tags: ['cheer'],
      commandId: 'cmd-1',
    });
    expect(f.locality).toBe('/university-avenue');
    expect(f.groups).toEqual(['contacts:thieves-guild', 'contacts:cohort-7']);
    expect(f.at).toBe(4242); // game time
    expect(f.realAt).toBe(1_700_000_000_000); // real time
    // selfReaction is derivable, never stored.
    expect(f.source === f.subject).toBe(false);
  });

  it('subject is the query key — other subjects are excluded', async () => {
    const a = new RenownEvent();
    a.subject = '/obj/Avatar/a';
    a.source = '/obj/Avatar/x';
    await a.save();
    const b = new RenownEvent();
    b.subject = '/obj/Avatar/b';
    b.source = '/obj/Avatar/x';
    await b.save();

    const found = await RenownEvent.find({ subject: '/obj/Avatar/a' });
    expect(found).toHaveLength(1);
    expect(found[0]!.subject).toBe('/obj/Avatar/a');
  });

  it('a global-scope event stores null locality and empty groups', async () => {
    const ev = new RenownEvent();
    ev.subject = '/obj/Avatar/p3';
    ev.source = '/obj/Avatar/p4';
    ev.at = 7;
    await ev.save();

    const [f] = await RenownEvent.find({ subject: '/obj/Avatar/p3' });
    expect(f!.locality).toBeNull();
    expect(f!.groups).toEqual([]);
  });
});

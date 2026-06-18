/**
 * RenownApi — the gated append/read surface over the raw renown signal
 * log. Covers: `append` persists a raw, scope-tagged row and defaults
 * `at` from the game-clock; `eventsFor` filters by scope-containment
 * (cooperative-wide = all; Group axis; nested-locality prefix); a
 * disconnected store no-ops.
 *
 * Mongo is faked with an in-memory collection (the chronicle/belief-store
 * harness): we stub PM's friendly surface (find / save), the same wrapper
 * methods `RenownEvent` uses. The gate (`FromModule('mud/api/renown#…')`)
 * is exercised implicitly — calls go through `RenownApi`, the allowed
 * caller — and the string is verified by `pnpm lint:gates`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenownApi } from '../renown';
import { WorldClockApi } from '../worldclock';
import { PersistenceManager } from '../../../backend/PersistenceManager';

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
  WorldClockApi._setNowProviderForTesting(() => 4242);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

const SUBJECT = '/obj/Avatar/p1';
const SOURCE = '/obj/Avatar/p2';

describe('RenownApi append + read', () => {
  it('appends a raw row and defaults `at` from the game-clock', async () => {
    await RenownApi.append({
      subject: SUBJECT,
      source: SOURCE,
      signal: { emote: 'applaud', tags: ['cheer'] },
    });
    const [ev] = await RenownApi.eventsFor(SUBJECT);
    expect(ev!.subject).toBe(SUBJECT);
    expect(ev!.source).toBe(SOURCE);
    expect(ev!.kind).toBe('reaction');
    expect(ev!.signal).toEqual({ emote: 'applaud', tags: ['cheer'] });
    expect(ev!.at).toBe(WorldClockApi.getNow().rawValue()); // game-clock witness
    expect(typeof ev!.at).toBe('number');
  });

  it('honors an explicit `at` over the clock default', async () => {
    await RenownApi.append({ subject: SUBJECT, source: SOURCE, at: 99 });
    const [ev] = await RenownApi.eventsFor(SUBJECT);
    expect(ev!.at).toBe(99);
  });

  it('cooperative-wide (null) scope returns every event for the subject', async () => {
    await RenownApi.append({ subject: SUBJECT, source: SOURCE, groups: ['g:a'] });
    await RenownApi.append({
      subject: SUBJECT,
      source: SOURCE,
      locality: '/town',
    });
    expect(await RenownApi.eventsFor(SUBJECT)).toHaveLength(2);
    expect(await RenownApi.eventsFor(SUBJECT, null)).toHaveLength(2);
  });

  it('filters by the Group scope axis', async () => {
    await RenownApi.append({
      subject: SUBJECT,
      source: SOURCE,
      groups: ['g:guild', 'g:cohort'],
    });
    await RenownApi.append({ subject: SUBJECT, source: SOURCE, groups: ['g:cohort'] });
    expect(await RenownApi.eventsFor(SUBJECT, 'g:guild')).toHaveLength(1);
    expect(await RenownApi.eventsFor(SUBJECT, 'g:cohort')).toHaveLength(2);
    expect(await RenownApi.eventsFor(SUBJECT, 'g:none')).toHaveLength(0);
  });

  it('filters by locality, matching exact and nested prefixes', async () => {
    await RenownApi.append({
      subject: SUBJECT,
      source: SOURCE,
      locality: '/city/market',
    });
    await RenownApi.append({ subject: SUBJECT, source: SOURCE, locality: '/city' });
    // '/city' contains the exact '/city' and the nested '/city/market'.
    expect(await RenownApi.eventsFor(SUBJECT, '/city')).toHaveLength(2);
    // '/city/market' matches only itself, not the parent.
    expect(await RenownApi.eventsFor(SUBJECT, '/city/market')).toHaveLength(1);
    // a sibling prefix matches neither (no false prefix on '/city2').
    expect(await RenownApi.eventsFor(SUBJECT, '/city2')).toHaveLength(0);
  });

  it('no-ops when disconnected', async () => {
    vi.spyOn(PersistenceManager.get(), 'isConnected').mockReturnValue(false);
    await RenownApi.append({ subject: SUBJECT, source: SOURCE });
    expect(store.size).toBe(0);
    expect(await RenownApi.eventsFor(SUBJECT)).toEqual([]);
  });
});

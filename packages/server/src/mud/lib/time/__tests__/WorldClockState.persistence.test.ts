/**
 * WorldClockState persistence tests — the snapshot → save →
 * loadOrSeed → restore round-trip that gives continuous game-time
 * across a restart (acceptance AC3), plus the fresh-DB zero seed.
 *
 * PersistenceManager is stubbed with hand-built fakes (the
 * `Document.test.ts` pattern); no MongoDB.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockState } from '../WorldClockState';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

interface PMStubs {
  saves: Array<{ collection: string; doc: Record<string, unknown> }>;
  setFindResult(docs: Record<string, unknown>[]): void;
}

function stubPM(): PMStubs {
  const saves: PMStubs['saves'] = [];
  let nextFindResult: Record<string, unknown>[] = [];

  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
    saves.push({ collection, doc: doc as Record<string, unknown> });
    return 'inserted-id';
  });
  vi.spyOn(pm, 'find').mockImplementation(async () => nextFindResult);

  return {
    saves,
    setFindResult: (docs) => {
      nextFindResult = docs;
    },
  };
}

describe('WorldClockState persistence (AC3)', () => {
  let pm: PMStubs;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
    WorldClockApi._resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('fresh DB seeds a zero clock (scale 12, no _id)', async () => {
    pm.setFindResult([]);
    const state = await WorldClockState.loadOrSeed();
    expect(state.elapsedGameTimeS).toBe(0);
    expect(state.scale).toBe(12);
    expect(state._id).toBeUndefined();

    WorldClockApi.restore({
      elapsedGameTimeS: state.elapsedGameTimeS,
      scale: state.scale,
      lastShutdownRealMs: state.lastShutdownRealMs,
    });
    expect(WorldClockApi.getNow().rawValue()).toBe(0);
  });

  it('snapshot → save → reload → restore yields continuous game-time', async () => {
    // Stand the clock up at a known elapsed game-time.
    WorldClockApi.restore({
      elapsedGameTimeS: 3600,
      scale: 8,
      lastShutdownRealMs: 999,
    });
    const snap = WorldClockApi.snapshot();
    expect(snap.elapsedGameTimeS).toBe(3600);
    expect(snap.scale).toBe(8);

    // Shutdown write.
    pm.setFindResult([]);
    const state = await WorldClockState.loadOrSeed();
    state.elapsedGameTimeS = snap.elapsedGameTimeS;
    state.scale = snap.scale;
    state.lastShutdownRealMs = snap.lastShutdownRealMs;
    await state.save();

    expect(pm.saves).toHaveLength(1);
    const savedDoc = pm.saves[0]!.doc;
    expect(pm.saves[0]!.collection).toBe('world_state');
    expect(savedDoc.elapsedGameTimeS).toBe(3600);
    expect(savedDoc.scale).toBe(8);

    // Next boot: the row is found, restored into a fresh clock.
    pm.setFindResult([savedDoc]);
    const reloaded = await WorldClockState.loadOrSeed();
    expect(reloaded.elapsedGameTimeS).toBe(3600);
    expect(reloaded.scale).toBe(8);

    WorldClockApi._resetForTesting();
    WorldClockApi.restore({
      elapsedGameTimeS: reloaded.elapsedGameTimeS,
      scale: reloaded.scale,
      lastShutdownRealMs: reloaded.lastShutdownRealMs,
    });
    expect(WorldClockApi.getNow().rawValue()).toBe(3600);
    expect(WorldClockApi.getScale()).toBe(8);
  });

  it('loadOrSeed returns the existing singleton row when present', async () => {
    pm.setFindResult([
      { elapsedGameTimeS: 42, scale: 3, lastShutdownRealMs: 7 },
    ]);
    const state = await WorldClockState.loadOrSeed();
    expect(state.elapsedGameTimeS).toBe(42);
    expect(state.scale).toBe(3);
  });

  it('boot() restores the persisted anchor; shutdown() persists the snapshot', async () => {
    pm.setFindResult([
      { elapsedGameTimeS: 7200, scale: 6, lastShutdownRealMs: 1 },
    ]);

    await WorldClockApi.boot();
    expect(WorldClockApi.getScale()).toBe(6);
    expect(WorldClockApi.getNow().rawValue()).toBe(7200);

    await WorldClockApi.shutdown();
    expect(WorldClockApi.isPaused()).toBe(true);
    expect(pm.saves).toHaveLength(1);
    expect(pm.saves[0]!.collection).toBe('world_state');
    expect(pm.saves[0]!.doc.elapsedGameTimeS).toBe(7200);
    expect(pm.saves[0]!.doc.scale).toBe(6);
  });
});

/**
 * StreamState tests — the livestream overlay-state singleton.
 *
 * Covers the state transitions (`setAway` / `goLive` / `snapshot`) and
 * the change-event contract the `BroadcastFeed` rides: every mutation
 * fires `Events.StreamStateChanged` carrying the full snapshot.
 *
 * Bootstraps an EventRegistry directly (mirrors `api/__tests__/event.test.ts`)
 * so `EventApi.emit/on` resolve without the full boot manifest.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import StreamState from '../StreamState';
import EventRegistry from '../EventRegistry';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import { StuffApi } from '../../api/stuff';
import { ShadowApi } from '../../api/shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import type { StreamStateSnapshot } from '@saxonberg/types';

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function makeStreamState(): Promise<StreamState> {
  return StuffApi.create(() => new StreamState());
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('StreamState', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('defaults to live with no countdown', async () => {
    const state = await makeStreamState();
    expect(state.getMode()).toBe('live');
    expect(state.getAwayUntil()).toBeNull();
    expect(state.snapshot()).toEqual({ mode: 'live', awayUntil: null });
  });

  it('setAway enters standby and stamps the target', async () => {
    const state = await makeStreamState();
    state.setAway(1_000);
    expect(state.getMode()).toBe('standby');
    expect(state.getAwayUntil()).toBe(1_000);
    expect(state.snapshot()).toEqual({ mode: 'standby', awayUntil: 1_000 });
  });

  it('goLive clears standby', async () => {
    const state = await makeStreamState();
    state.setAway(1_000);
    state.goLive();
    expect(state.getMode()).toBe('live');
    expect(state.getAwayUntil()).toBeNull();
  });

  it('fires StreamStateChanged with the full snapshot on mutation', async () => {
    await makeRegistry();
    const state = await makeStreamState();
    const seen: StreamStateSnapshot[] = [];
    EventApi.on<StreamStateSnapshot>(Events.StreamStateChanged, (snap) => {
      seen.push(snap);
    });

    state.setAway(5_000);
    await flushMicrotasks();
    state.goLive();
    await flushMicrotasks();

    expect(seen).toEqual([
      { mode: 'standby', awayUntil: 5_000 },
      { mode: 'live', awayUntil: null },
    ]);
  });

  it('refuses destruction (system singleton)', async () => {
    const state = await makeStreamState();
    expect(state.canDestruct().ok).toBe(false);
  });
});

/**
 * Phase 5 — the residency sweep. Observe-first (culls nothing), enforce
 * culls the idle non-vetoing cold tail via StuffApi.destruct, recently
 * touched objects are skipped, and vetoing objects survive.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Thing from '../../../../lib/stuff/Thing';
import Location from '../../../../lib/stuff/Location';
import { ResidencyApi } from '../../../../api/residency';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { ConnectionApi } from '../../../../api/connection';
import type Interactive from '../../Interactive';
import { AppSettings, AppSettingKeys } from '../../../../lib/config/AppSettings';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

function setSetting(key: string, value: string): void {
  AppSettings.getCached().setValue(key, value);
}

describe('residency sweep', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    // Warm an empty settings cache without Mongo (test seam).
    (AppSettings as unknown as { _cached: AppSettings | null })._cached =
      new AppSettings();
    setSetting(AppSettingKeys.residencyEvictionIdleThresholdMs, '100');
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    setSetting(AppSettingKeys.residencyEvictionMode, 'observe');
  });

  it('observe mode culls nothing', () => {
    setSetting(AppSettingKeys.residencyEvictionMode, 'observe');
    const thing = makeStuff(() => new Thing());
    const id = thing.stuffId;
    vi.setSystemTime(50_000); // idle 49s >> 100ms threshold
    ResidencyApi.evictNow();
    expect(StuffApi.findById(id)).toBeDefined();
  });

  it('enforce mode culls an idle, non-vetoing object', () => {
    setSetting(AppSettingKeys.residencyEvictionMode, 'enforce');
    const thing = makeStuff(() => new Thing());
    const id = thing.stuffId;
    vi.setSystemTime(50_000); // idle 49s >> 100ms threshold
    ResidencyApi.evictNow();
    expect(StuffApi.findById(id)).toBeUndefined();
  });

  it('enforce mode skips a recently touched object', () => {
    setSetting(AppSettingKeys.residencyEvictionMode, 'enforce');
    const thing = makeStuff(() => new Thing());
    const id = thing.stuffId;
    vi.setSystemTime(50_000);
    thing.touch(); // fresh again → within grace
    ResidencyApi.evictNow();
    expect(StuffApi.findById(id)).toBeDefined();
  });

  it('enforce mode spares a vetoing object (a non-empty room)', () => {
    setSetting(AppSettingKeys.residencyEvictionMode, 'enforce');
    const room = makeStuff(() => new Location());
    const item = makeStuff(() => new Thing());
    ContainmentApi.move(item, room);
    const id = room.stuffId;
    vi.setSystemTime(50_000);
    ResidencyApi.evictNow();
    expect(StuffApi.findById(id)).toBeDefined(); // non-empty → Container veto
  });

  it('presence keeps an occupied room’s contents warm', () => {
    setSetting(AppSettingKeys.residencyEvictionMode, 'enforce');
    const room = makeStuff(() => new Location());
    const holder = makeStuff(() => new Thing()); // stand-in avatar
    const item = makeStuff(() => new Thing());
    ContainmentApi.move(holder, room);
    ContainmentApi.move(item, room);
    const itemId = item.stuffId;
    // Fake a connected player whose holder is in the room.
    const spy = vi
      .spyOn(ConnectionApi, 'getAllInteractives')
      .mockReturnValue([{ getHolder: () => holder } as unknown as Interactive]);
    vi.setSystemTime(50_000); // idle by recency...
    ResidencyApi.evictNow(); // ...but the presence walk refreshes it
    expect(StuffApi.findById(itemId)).toBeDefined();
    spy.mockRestore();
  });

  it('without presence, an idle item in a room is culled', () => {
    setSetting(AppSettingKeys.residencyEvictionMode, 'enforce');
    const room = makeStuff(() => new Location());
    const item = makeStuff(() => new Thing());
    ContainmentApi.move(item, room);
    const itemId = item.stuffId;
    const spy = vi
      .spyOn(ConnectionApi, 'getAllInteractives')
      .mockReturnValue([]);
    vi.setSystemTime(50_000);
    ResidencyApi.evictNow();
    expect(StuffApi.findById(itemId)).toBeUndefined();
    spy.mockRestore();
  });
});

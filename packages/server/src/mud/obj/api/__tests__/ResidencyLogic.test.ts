/**
 * Phase 5 — the residency sweep. Observe-first (culls nothing), enforce
 * culls the idle non-vetoing cold tail via StuffApi.destruct, recently
 * touched objects are skipped, and vetoing objects survive.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Thing from '../../../lib/stuff/Thing';
import Location from '../../../lib/stuff/Location';
import { ResidencyApi } from '../../../api/residency';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { AppSettings, AppSettingKeys } from '../../../lib/config/AppSettings';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

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
    setSetting(AppSettingKeys.residencyIdleThresholdMs, '100');
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    setSetting(AppSettingKeys.residencyMode, 'observe');
  });

  it('observe mode culls nothing', () => {
    setSetting(AppSettingKeys.residencyMode, 'observe');
    const thing = makeStuff(() => new Thing());
    const id = thing.stuffId;
    vi.setSystemTime(50_000); // idle 49s >> 100ms threshold
    ResidencyApi.sweepNow();
    expect(StuffApi.findById(id)).toBeDefined();
  });

  it('enforce mode culls an idle, non-vetoing object', () => {
    setSetting(AppSettingKeys.residencyMode, 'enforce');
    const thing = makeStuff(() => new Thing());
    const id = thing.stuffId;
    vi.setSystemTime(50_000); // idle 49s >> 100ms threshold
    ResidencyApi.sweepNow();
    expect(StuffApi.findById(id)).toBeUndefined();
  });

  it('enforce mode skips a recently touched object', () => {
    setSetting(AppSettingKeys.residencyMode, 'enforce');
    const thing = makeStuff(() => new Thing());
    const id = thing.stuffId;
    vi.setSystemTime(50_000);
    thing.touch(); // fresh again → within grace
    ResidencyApi.sweepNow();
    expect(StuffApi.findById(id)).toBeDefined();
  });

  it('enforce mode spares a vetoing object (a room)', () => {
    setSetting(AppSettingKeys.residencyMode, 'enforce');
    const room = makeStuff(() => new Location());
    const id = room.stuffId;
    vi.setSystemTime(50_000);
    ResidencyApi.sweepNow();
    expect(StuffApi.findById(id)).toBeDefined();
  });
});

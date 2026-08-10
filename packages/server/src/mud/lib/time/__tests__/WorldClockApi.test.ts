/**
 * WorldClockApi core-axis tests — advance / scale / pause / resume
 * (acceptance AC1, AC2). Real time is controlled through the injected
 * clock seam (`_setNowProviderForTesting`) so the formula is checked
 * deterministically with no wall-clock wait.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import { WorldClockLogic } from '../../../obj/api/WorldClockLogic';
import { StuffApi } from '../../../api/stuff';
import { SecurityError } from '../../security/errors';

describe('WorldClockApi advance + scale (AC1)', () => {
  let real: number;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    real = 0;
    WorldClockApi._setNowProviderForTesting(() => real);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('advances scale game-seconds per real second (default 12x)', () => {
    expect(WorldClockApi.getScale()).toBe(12);
    expect(WorldClockApi.getNow().rawValue()).toBe(0);
    real = 1000;
    expect(WorldClockApi.getNow().rawValue()).toBe(12);
    real = 2000;
    expect(WorldClockApi.getNow().rawValue()).toBe(24);
  });

  it('reflects a custom scale', () => {
    WorldClockApi.setScale(60);
    real = 1000;
    expect(WorldClockApi.getNow().rawValue()).toBe(60);
  });

  it('setScale re-anchors with no time discontinuity', () => {
    real = 1000;
    expect(WorldClockApi.getNow().rawValue()).toBe(12);
    WorldClockApi.setScale(24);
    // The instant of the scale change must read the same game-time.
    expect(WorldClockApi.getNow().rawValue()).toBe(12);
    real = 2000;
    // 1000 ms more at 24x adds 24 game-seconds.
    expect(WorldClockApi.getNow().rawValue()).toBe(36);
  });

  it('rejects a non-positive scale', () => {
    expect(() => WorldClockApi.setScale(0)).toThrow();
    expect(() => WorldClockApi.setScale(-5)).toThrow();
  });
});

describe('WorldClockApi pause / resume (AC2)', () => {
  let real: number;

  beforeEach(() => {
    WorldClockApi._resetForTesting();
    real = 0;
    WorldClockApi._setNowProviderForTesting(() => real);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('pause freezes getNow; resume continues with no time lost', () => {
    real = 1000;
    expect(WorldClockApi.getNow().rawValue()).toBe(12);

    WorldClockApi.pause();
    expect(WorldClockApi.isPaused()).toBe(true);

    // Real time keeps passing while paused — game-time must not move.
    real = 5000;
    expect(WorldClockApi.getNow().rawValue()).toBe(12);

    WorldClockApi.resume();
    expect(WorldClockApi.isPaused()).toBe(false);
    // Resumes from the frozen value exactly.
    expect(WorldClockApi.getNow().rawValue()).toBe(12);

    // 1000 ms after resume advances 12 game-seconds — nothing gained
    // or lost across the pause.
    real = 6000;
    expect(WorldClockApi.getNow().rawValue()).toBe(24);
  });

  it('pause / resume are idempotent', () => {
    real = 1000;
    WorldClockApi.pause();
    WorldClockApi.pause();
    expect(WorldClockApi.getNow().rawValue()).toBe(12);
    real = 9000;
    WorldClockApi.resume();
    WorldClockApi.resume();
    real = 10000;
    expect(WorldClockApi.getNow().rawValue()).toBe(24);
  });
});

describe('WorldClockLogic singleton encapsulation', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('lives at /obj/api/worldclock once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    WorldClockApi.getScale();
    const logic = StuffApi.findByTemplatePath('/obj/api/worldclock');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-WorldClockApi caller', () => {
    WorldClockApi.getScale();
    const logic = StuffApi.findByTemplatePath<WorldClockLogic>(
      '/obj/api/worldclock'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/worldclock#WorldClockApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.getScale()).toThrow(SecurityError);
  });
});

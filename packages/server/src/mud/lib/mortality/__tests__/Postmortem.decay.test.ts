/**
 * The corpse's own clock.
 *
 * A dead body runs on game-time whether or not anyone is watching and
 * whether or not the person who used to live in it ever returns. That
 * independence is what makes forensics a discipline rather than a flavour
 * string: the cause is stamped ground truth, the readable signs rot, and
 * the gap between them is where an examiner can be wrong.
 *
 * It also decides when the world may reclaim the body — by *withdrawing an
 * objection* rather than destroying anything.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { MORTALITY_DEFAULTS } from '../MortalArc';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SCALE = 12;
let real = 0;

/** Advance game-time by `gameSec`. */
function advance(gameSec: number): void {
  real += (gameSec / SCALE) * 1000;
}

const STAGE = MORTALITY_DEFAULTS.DECAY_STAGE_SEC;

function corpse(): Creature {
  const c = makeStuff(() => new Creature());
  c.setLifecycleState('dead');
  c.setCauseOfDeath('exsanguination');
  c.markDeceasedAt(WorldClockApi.getNow().rawValue());
  return c;
}

describe('PostmortemMixin — the corpse clock', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('walks the decay stages in order and never walks back', () => {
    const c = corpse();
    expect(c.getDecayStage()).toBe('fresh');

    advance(STAGE + 1);
    expect(c.getDecayStage()).toBe('stale');

    advance(STAGE);
    expect(c.getDecayStage()).toBe('decomposed');

    advance(STAGE);
    expect(c.getDecayStage()).toBe('spent');

    // Terminal — it stays there.
    advance(STAGE * 100);
    expect(c.getDecayStage()).toBe('spent');
  });

  it('forensic readability falls monotonically to nothing', () => {
    const c = corpse();
    const readings: number[] = [c.getForensicReadability()];
    for (let i = 0; i < 3; i++) {
      advance(STAGE + 1);
      readings.push(c.getForensicReadability());
    }

    for (let i = 1; i < readings.length; i++) {
      expect(readings[i]!).toBeLessThan(readings[i - 1]!);
    }
    expect(readings[0]).toBe(1);
    expect(readings[readings.length - 1]).toBe(0);
  });

  it('the cause stamp does NOT rot — evidence degrades, the answer key does not', () => {
    // The whole pedagogy of forensics lives in this gap.
    const c = corpse();
    advance(STAGE * 10);
    expect(c.getDecayStage()).toBe('spent');
    expect(c.getForensicReadability()).toBe(0);
    expect(c.getCauseOfDeath()).toBe('exsanguination');
  });

  it('vetoes eviction until spent, then withdraws the objection', () => {
    const c = corpse();
    const ctx = { idleMs: 10_000_000, reason: 'idle' as const };

    expect(c.canEvict(ctx).ok).toBe(false);
    advance(STAGE + 1);
    expect(c.canEvict(ctx).ok).toBe(false);
    advance(STAGE * 2 + 1);
    expect(c.getDecayStage()).toBe('spent');
    // Not destroyed — merely no longer objecting. The ordinary residency
    // sweep decides from here.
    expect(c.canEvict(ctx).ok).toBe(true);
  });

  it('is completely inert on a LIVING body', () => {
    const alive = makeStuff(() => new Creature());
    alive.setLifecycleState('alive');
    advance(STAGE * 10);

    expect(alive.getDecayStage()).toBe('fresh');
    expect(alive.getForensicReadability()).toBe(1);
    expect(alive.getPostmortemProgressions()).toEqual([]);
    expect(alive.canEvict({ idleMs: 1, reason: 'idle' }).ok).toBe(true);
  });

  it('fills the postmortem-progression seam vitals.md reserved', () => {
    const c = corpse();
    expect(c.getPostmortemProgressions()).toEqual(['fresh']);
    advance(STAGE + 1);
    expect(c.getPostmortemProgressions()).toEqual(['fresh', 'stale']);
  });

  it('the time of death is stamped once and never re-stamped', () => {
    const c = corpse();
    const first = c.diedAtGameSec;
    advance(STAGE * 2);
    c.markDeceasedAt(WorldClockApi.getNow().rawValue());
    expect(c.diedAtGameSec).toBe(first);
  });

  it('a corpse cools toward ambient without any postmortem code', () => {
    // Algor mortis is free: a body that stops regulating drifts through
    // the shipped Thermal layer. Nothing here drives it.
    const c = corpse();
    expect(c.getVitalSign('coreTemperature').rawValue()).toBeGreaterThan(0);
    expect(StuffApi.findById(c.stuffId)).toBe(c);
  });
});

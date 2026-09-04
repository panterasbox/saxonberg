/**
 * ⭐⭐⭐ **The hay fire** (W14 / D48) — the single most instructive
 * failure in the design, and it cost almost no new mechanism.
 *
 * > It destroys the entire winter feed store **weeks after** a mistake
 * > that was invisible at the time.
 *
 * You cut in a damp spell and stacked before it was fit. The stack looked
 * fine, and went on looking fine for a fortnight. There is **no roll
 * anywhere in it**: microbes in wet forage respire, respiration makes
 * heat, a big stack has almost no surface to lose it through, and above
 * about 55 °C the chemistry no longer needs the microbes and runs away.
 * Every step of that is real, and it is genuinely how barns burn.
 *
 * ⚠ It is also D52's **sudden total loss** shape — the one that teaches
 * why you insure and why you diversify — reached from an ordinary
 * decision rather than from anybody's malice.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelfHeatingMixin, SAFE_MOISTURE, DANGEROUS_MOISTURE } from '../SelfHeating';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;

class TestRick extends SelfHeatingMixin(Thing) {}

describe('a rick', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;

  const rick = (moisture: number): TestRick => {
    const r = makeStuff(() => {
      const x = new TestRick();
      x.baledMoistureFraction = moisture;
      return x;
    });
    r.reconcileHeating();
    return r;
  };

  const advance = (gameDays: number): void => {
    clock.mockReturnValue(Quantity.of(base + gameDays * DAY, 's'));
  };

  beforeEach(() => {
    makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ hay put up DRY keeps indefinitely, and never gets warm', () => {
    const dry = rick(SAFE_MOISTURE - 0.04);
    advance(400);
    expect(dry.rickBand()).toBe('cold');
    expect(dry.isRunningAway()).toBe(false);
  });

  it('⭐⭐ hay put up WET heats — and it takes WEEKS', () => {
    const wet = rick(DANGEROUS_MOISTURE + 0.15);
    // ⚠ On the day you stacked it there is a warning — if somebody puts
    // an arm into it. Nobody does, and it reads as nothing wrong: it is
    // not hot, it is not smoking, and the stack looks exactly like a
    // stack. That is the whole point of the failure.
    advance(1);
    expect(wet.isRunningAway()).toBe(false);
    expect(wet.rickBand()).not.toBe('smoking');
    advance(60);
    expect(wet.isRunningAway()).toBe(true);
    expect(wet.rickBand()).toBe('smoking');
  });

  it('⭐ and the band a HAND reads is the only warning anybody gets', () => {
    const wet = rick(0.45);
    const bands = new Set<string>();
    for (let d = 0; d <= 60; d += 2) {
      advance(d);
      bands.add(wet.rickBand());
    }
    // It passes through `warm` on the way. A player who learned to put a
    // hand into a rick can catch it; one who did not, cannot.
    expect(bands.has('warm')).toBe(true);
    expect(bands.has('hot')).toBe(true);
    for (const b of bands) expect(b).not.toMatch(/\d/);
  });

  it('⚠⚠ past the runaway point it does NOT stop — that is what runaway means', () => {
    const wet = rick(0.5);
    advance(200);
    const hot = wet.coreTemperatureK();
    expect(wet.isRunningAway()).toBe(true);
    advance(260);
    expect(wet.coreTemperatureK()).toBeGreaterThan(hot);
  });

  it('the band between safe and dangerous is where JUDGEMENT lives', () => {
    // Nothing rounds moisture to a boolean. A marginal rick warms and
    // settles; a wet one does not.
    const marginal = rick((SAFE_MOISTURE + DANGEROUS_MOISTURE) / 2);
    advance(120);
    expect(marginal.isRunningAway()).toBe(false);
    expect(marginal.rickBand()).not.toBe('cold');
  });

  it('⚠ no far-past guard — it happens while nobody is watching', () => {
    const wet = rick(0.4);
    advance(2000);
    expect(wet.isRunningAway()).toBe(true);
  });
});

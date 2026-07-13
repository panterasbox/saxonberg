/**
 * Lamp — a clock-driven lamppost: on at night (dusk..dawn), off by day.
 * `refreshForTimeOfDay()` reads the game hour off the world clock and
 * toggles the Switchable state; the day/night schedule just calls it on a
 * cadence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Lamp from '../Lamp';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import '../../obj/WorldClockRegistry';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

/**
 * getNow() seconds = provider-ms / 1000 * scale(12) after a reset (zero
 * anchor). So provider-ms for game-second `g` is `g / 12 * 1000`.
 */
function providerMsForGameHour(hour: number): number {
  const gameSeconds = hour * 3600;
  return (gameSeconds / 12) * 1000;
}

function lamp(): Lamp {
  return makeStuff(() => new Lamp());
}

describe('Lamp', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
  });
  afterEach(() => WorldClockApi._resetForTesting());

  it('composes Switchable and LightSource', () => {
    const l = lamp();
    expect(MixinApi.isSwitchable(l as never)).toBe(true);
    expect(MixinApi.isLightSource(l as never)).toBe(true);
  });

  it('is on at night (20:00)', () => {
    WorldClockApi._setNowProviderForTesting(() => providerMsForGameHour(20));
    const l = lamp();
    l.refreshForTimeOfDay();
    expect(l.isOn()).toBe(true);
  });

  it('is off by day (12:00)', () => {
    WorldClockApi._setNowProviderForTesting(() => providerMsForGameHour(12));
    const l = lamp();
    l.switchOn();
    l.refreshForTimeOfDay();
    expect(l.isOn()).toBe(false);
  });

  it('is on in the small hours (03:00, before dawn)', () => {
    WorldClockApi._setNowProviderForTesting(() => providerMsForGameHour(3));
    const l = lamp();
    l.refreshForTimeOfDay();
    expect(l.isOn()).toBe(true);
  });
});

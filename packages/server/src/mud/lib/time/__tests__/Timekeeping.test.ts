/**
 * Timekeeping — the `Time` clock-face value object and the capability
 * mixin's read contract + registry wiring.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { Time } from '../Time';
import { TimekeepingMixin } from '../Timekeeping';
import Thing from '../../stuff/Thing';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestClock extends TimekeepingMixin(Thing) {}

describe('Time', () => {
  it('formats as zero-padded HH:MM', () => {
    expect(Time.ofHourMinute(4, 0).format()).toBe('04:00');
    expect(Time.ofHourMinute(13, 7).format()).toBe('13:07');
    expect(Time.ofHourMinute(0, 0).format()).toBe('00:00');
  });

  it('wraps minutes-of-day into a single day', () => {
    expect(Time.ofMinutes(1440).format()).toBe('00:00'); // +24h
    expect(Time.ofMinutes(1440 + 65).format()).toBe('01:05');
    expect(Time.ofMinutes(-1).format()).toBe('23:59'); // before midnight
  });

  it('exposes hour/minute components', () => {
    const t = Time.ofMinutes(13 * 60 + 45);
    expect(t.hour).toBe(13);
    expect(t.minute).toBe(45);
    expect(t.minutes).toBe(825);
  });

  it('parses HH:MM and H:MM, rejecting garbage and out-of-range', () => {
    expect(Time.parse('4:00').format()).toBe('04:00');
    expect(Time.parse('23:59').format()).toBe('23:59');
    expect(() => Time.parse('noon')).toThrow();
    expect(() => Time.parse('24:00')).toThrow();
    expect(() => Time.parse('4:99')).toThrow();
  });

  it('compares by minute of day', () => {
    expect(Time.ofMinutes(60).equals(Time.ofHourMinute(1, 0))).toBe(true);
    expect(Time.ofMinutes(60).equals(Time.ofMinutes(61))).toBe(false);
  });
});

describe('TimekeepingMixin', () => {
  afterEach(() => StuffApi.clearAll());

  it('is registered and narrows via MixinApi.isTimekeeping', () => {
    const clock = makeStuff(() => new TestClock());
    const plain = makeStuff(() => new Thing());
    expect(MixinApi.isTimekeeping(clock as never)).toBe(true);
    expect(MixinApi.isTimekeeping(plain as never)).toBe(false);
  });

  it('reads null by default (override supplies real physics)', () => {
    const clock = makeStuff(() => new TestClock());
    expect(clock.currentReading()).toBeNull();
  });
});

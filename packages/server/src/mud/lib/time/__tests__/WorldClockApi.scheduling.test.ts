/**
 * WorldClockApi scheduling tests — after / at / every, the cancel
 * family, host-destruct auto-cancel, and handle introspection
 * (acceptance AC5), plus the deferred-not-skipped `at` behaviour
 * (AC4). Game-time is driven through the `_advanceForTesting` seam at
 * scale 1 (game-ms ≈ advance-ms).
 *
 * Host-scoped schedules subscribe to `Events.StuffDestructed`, so the
 * suite bootstraps the EventRegistry singleton the same way
 * `SchedulerApi.hostDestruction.test.ts` does.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../obj/EventRegistry';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { Stuff } from '../../stuff/Stuff';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';

async function makeRegistry(): Promise<EventRegistry> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  return reg;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('WorldClockApi scheduling (AC5 / AC4)', () => {
  beforeEach(async () => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    await makeRegistry();
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
    EventApi._clearAllForTesting();
  });

  describe('after', () => {
    it('fires once at the delay and not before', () => {
      let fired = 0;
      WorldClockApi.after(Quantity.of(5, 's'), () => fired++);
      WorldClockApi._advanceForTesting(4000);
      expect(fired).toBe(0);
      WorldClockApi._advanceForTesting(1000);
      expect(fired).toBe(1);
      WorldClockApi._advanceForTesting(10000);
      expect(fired).toBe(1);
    });

    it('parses string durations', () => {
      let fired = 0;
      WorldClockApi.after('2 minutes', () => fired++);
      WorldClockApi._advanceForTesting(119_000);
      expect(fired).toBe(0);
      WorldClockApi._advanceForTesting(1000);
      expect(fired).toBe(1);
    });

    it('throws on an unparseable string duration', () => {
      expect(() => WorldClockApi.after('soon', () => {})).toThrow();
    });
  });

  describe('at', () => {
    it('fires at an absolute deadline', () => {
      let fired = 0;
      WorldClockApi.at(Quantity.of(10, 's'), () => fired++);
      WorldClockApi._advanceForTesting(9000);
      expect(fired).toBe(0);
      WorldClockApi._advanceForTesting(1000);
      expect(fired).toBe(1);
    });

    it('deferred-not-skipped: a deadline already in the past fires on the next tick (AC4)', () => {
      WorldClockApi._advanceForTesting(5000); // game-time now 5s
      let fired = 0;
      WorldClockApi.at(Quantity.of(2, 's'), () => fired++); // 2s — already past
      expect(fired).toBe(0); // not retroactively fired on registration
      WorldClockApi._advanceForTesting(1); // a single tick forward
      expect(fired).toBe(1); // fired, not silently skipped
    });
  });

  describe('every', () => {
    it('fires on a fixed game-time cadence', () => {
      let count = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => count++);
      WorldClockApi._advanceForTesting(3000);
      expect(count).toBe(3);
      WorldClockApi._advanceForTesting(2000);
      expect(count).toBe(5);
    });

    it('honours a runs cap', () => {
      let count = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => count++, { runs: 2 });
      WorldClockApi._advanceForTesting(10_000);
      expect(count).toBe(2);
    });

    it('honours startAt', () => {
      let count = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => count++, {
        startAt: Quantity.of(5, 's'),
      });
      WorldClockApi._advanceForTesting(4000);
      expect(count).toBe(0);
      WorldClockApi._advanceForTesting(1000);
      expect(count).toBe(1);
    });

    it('rejects a non-positive interval', () => {
      expect(() => WorldClockApi.every(Quantity.of(0, 's'), () => {})).toThrow();
    });
  });

  describe('handle introspection', () => {
    it('reports nextFireAt and fireCount accurately', () => {
      const h = WorldClockApi.every(Quantity.of(1, 's'), () => {});
      expect(h.nextFireAt?.rawValue()).toBe(1);
      expect(h.fireCount).toBe(0);
      WorldClockApi._advanceForTesting(1000);
      expect(h.fireCount).toBe(1);
      expect(h.nextFireAt?.rawValue()).toBe(2);
    });

    it('nextFireAt is null after cancel', () => {
      const h = WorldClockApi.after(Quantity.of(1, 's'), () => {});
      h.cancel();
      expect(h.nextFireAt).toBeNull();
    });
  });

  describe('cancel family', () => {
    it('cancel() stops future fires', () => {
      let count = 0;
      const h = WorldClockApi.every(Quantity.of(1, 's'), () => count++);
      WorldClockApi._advanceForTesting(2000);
      expect(count).toBe(2);
      WorldClockApi.cancel(h);
      WorldClockApi._advanceForTesting(5000);
      expect(count).toBe(2);
    });

    it('cancelByTag() cancels matching schedules and returns the count', () => {
      let a = 0;
      let b = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => a++, { tag: 'group' });
      WorldClockApi.every(Quantity.of(1, 's'), () => a++, { tag: 'group' });
      WorldClockApi.every(Quantity.of(1, 's'), () => b++, { tag: 'other' });
      const cancelled = WorldClockApi.cancelByTag('group');
      expect(cancelled).toBe(2);
      WorldClockApi._advanceForTesting(2000);
      expect(a).toBe(0);
      expect(b).toBe(2);
    });

    it('cancelByHost() cancels every schedule for a host', () => {
      const host = makeStuff(() => new Idea());
      let count = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => count++, { host });
      WorldClockApi.after(Quantity.of(2, 's'), () => count++, { host });
      const cancelled = WorldClockApi.cancelByHost(host);
      expect(cancelled).toBe(2);
      WorldClockApi._advanceForTesting(5000);
      expect(count).toBe(0);
    });
  });

  describe('host-destruct auto-cancel', () => {
    it('cancels host-scoped schedules when the host destructs', async () => {
      const host = makeStuff(() => new Idea());
      let count = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => count++, { host });
      WorldClockApi._advanceForTesting(1000);
      expect(count).toBe(1);

      await StuffApi.destruct(host);
      await flushMicrotasks();

      WorldClockApi._advanceForTesting(5000);
      expect(count).toBe(1); // no further fires after host destruct
    });

    it('leaves other hosts schedules alone', async () => {
      const host = makeStuff(() => new Idea());
      const other = makeStuff(() => new Idea());
      let count = 0;
      WorldClockApi.every(Quantity.of(1, 's'), () => count++, { host: other });

      await StuffApi.destruct(host);
      await flushMicrotasks();

      WorldClockApi._advanceForTesting(2000);
      expect(count).toBe(2);
    });
  });
});

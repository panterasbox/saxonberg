/**
 * Residency (self-eviction) base surface on Stuff — Phase 1.
 *
 * Covers the `canEvict` consent hook (default cull + overridable) and
 * the `touch()` / `getLastTouched()` recency surface. The sweep itself
 * (ResidencyLogic) and the gate rewire land in later phases.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import Thing from '../Thing';
import type { EvictionContext } from '../Stuff';
import type { VetoResult } from '../../errors';
import { makeStuff } from '../../security/__tests__/test-setup';

const IDLE: EvictionContext = { idleMs: 999_999, reason: 'idle' };

describe('Stuff residency surface', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canEvict', () => {
    it('defaults to cull ({ ok: true })', () => {
      const thing = makeStuff(() => new Thing());
      expect(thing.canEvict(IDLE)).toEqual({ ok: true });
    });

    it('is overridable to veto', () => {
      class StubbornThing extends Thing {
        public canEvict(context: EvictionContext): VetoResult {
          void context;
          return { ok: false, reason: 'test-veto' };
        }
      }
      const stubborn = makeStuff(() => new StubbornThing());
      expect(stubborn.canEvict(IDLE)).toEqual({
        ok: false,
        reason: 'test-veto',
      });
    });
  });

  describe('recency', () => {
    it('a fresh Stuff is warm (getLastTouched ~ construction time)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      const thing = makeStuff(() => new Thing());
      expect(thing.getLastTouched()).toBe(1_000);
    });

    it('touch() advances the recency timestamp to now', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      const thing = makeStuff(() => new Thing());
      vi.setSystemTime(5_000);
      thing.touch();
      expect(thing.getLastTouched()).toBe(5_000);
    });

    it('getLastTouched() does not itself advance recency', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      const thing = makeStuff(() => new Thing());
      vi.setSystemTime(9_000);
      // Reading is not touching: the value stays at construction time.
      expect(thing.getLastTouched()).toBe(1_000);
    });
  });
});

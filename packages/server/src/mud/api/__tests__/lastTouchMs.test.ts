/**
 * `Stuff.#lastTouchMs` lockdown + maintenance tests.
 *
 * The slot is hard-private (`#`), tamper-resistant by construction:
 *   - Not reachable via bracket access on the proxy or raw target.
 *   - Not in `PASSTHROUGH_KEYS`, not in `persistentFields`.
 *   - Only writer is `Stuff.touch(stuff)` (timestamp-fixed).
 *   - Only reader is `Stuff.getLastTouchMs(stuff)` (returns the
 *     raw-target slot).
 *
 * The security gate writes it after the entry policy passes — so
 * denied calls do NOT advance the timestamp.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Stuff } from '../../lib/stuff/Stuff';
import { Idea } from '../../lib/stuff/Idea';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ProxyApi } from '../proxy';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class TouchProbe extends Idea {
  public called = 0;
  public bump(): void {
    this.called += 1;
  }
}

describe('Stuff.lastTouchMs initialization', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('is set at construction time', () => {
    const before = Date.now();
    const s = makeStuff(() => new TouchProbe());
    const after = Date.now();
    const t = Stuff.getLastTouchMs(s);
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
  });
});

describe('Stuff.lastTouchMs maintenance', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('advances on every successful method dispatch', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const s = makeStuff(() => new TouchProbe());
      expect(Stuff.getLastTouchMs(s)).toBe(1_000);

      vi.setSystemTime(2_500);
      s.bump();
      expect(Stuff.getLastTouchMs(s)).toBe(2_500);

      vi.setSystemTime(4_000);
      s.bump();
      expect(Stuff.getLastTouchMs(s)).toBe(4_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT advance on a denied (policy-rejected) dispatch', () => {
    // Define a class with a method that denies via a class-level
    // CallSecurity-style policy. We use a custom always-deny policy
    // on a single method.
    const DenyAll = SecurityPolicies.Custom(() => false, 'DenyAll');
    class Gated extends Idea {
      @CallSecurity(DenyAll)
      public locked(): void {
        // never reached
      }
    }
    vi.useFakeTimers();
    try {
      vi.setSystemTime(10_000);
      const s = makeStuff(() => new Gated());
      const initial = Stuff.getLastTouchMs(s);

      vi.setSystemTime(12_000);
      expect(() => s.locked()).toThrow(SecurityError);
      // Denied: timestamp unchanged.
      expect(Stuff.getLastTouchMs(s)).toBe(initial);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Stuff.touch accepts either the proxy or the raw target', () => {
    const s = makeStuff(() => new TouchProbe());
    const raw = (s as unknown as Record<symbol, Stuff>)[ProxyApi.RAW_TARGET];
    expect(raw).toBeDefined();

    vi.useFakeTimers();
    try {
      vi.setSystemTime(5_000);
      Stuff.touch(s);
      expect(Stuff.getLastTouchMs(s)).toBe(5_000);
      vi.setSystemTime(7_000);
      Stuff.touch(raw as Stuff);
      expect(Stuff.getLastTouchMs(s)).toBe(7_000);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Stuff.lastTouchMs tamper resistance', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('writing (s as any).lastTouchMs does NOT change the slot', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(100);
      const s = makeStuff(() => new TouchProbe());
      const before = Stuff.getLastTouchMs(s);

      (s as unknown as { lastTouchMs: number }).lastTouchMs = 999_999_999;
      expect(Stuff.getLastTouchMs(s)).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('(s as any).lastTouchMs reads undefined (no public field)', () => {
    const s = makeStuff(() => new TouchProbe());
    expect((s as unknown as { lastTouchMs?: unknown }).lastTouchMs).toBe(
      undefined
    );
  });

  it('JSON.stringify(s) does not include lastTouchMs', () => {
    const s = makeStuff(() => new TouchProbe());
    // We don't depend on the exact serialized shape (it's brittle),
    // but the lastTouchMs slot must not appear anywhere.
    const dumped = JSON.stringify(s);
    expect(dumped).not.toContain('lastTouchMs');
  });

  it('persistentFields does not include lastTouchMs', () => {
    // Slot is hard-private; the Hydrator can't see it. Sanity check.
    const fields =
      (Stuff as unknown as { persistentFields?: string[] }).persistentFields ??
      [];
    expect(fields).not.toContain('lastTouchMs');
  });
});

describe('Stuff.lastTouchMs is transient', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('a fresh Stuff has a recent lastTouchMs regardless of any prior Stuff', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const a = makeStuff(() => new TouchProbe());
      expect(Stuff.getLastTouchMs(a)).toBe(1_000);

      vi.setSystemTime(2_000);
      const b = makeStuff(() => new TouchProbe());
      expect(Stuff.getLastTouchMs(b)).toBe(2_000);
      // a's timestamp didn't move because no call was made on it.
      expect(Stuff.getLastTouchMs(a)).toBe(1_000);
    } finally {
      vi.useRealTimers();
    }
  });
});

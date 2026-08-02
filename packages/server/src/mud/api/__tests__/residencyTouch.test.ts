/**
 * Residency dispatch-touch — the security gate maintains each Stuff's
 * recency timestamp (`Stuff.touch` / `getLastTouched`) so the future
 * self-eviction sweep can tell cold objects from warm ones.
 *
 * Gate contract (phase 2):
 *   - Fires `touch()` on the raw target after a **successful** dispatch.
 *   - Only on real **method** calls, not **getter** reads (`!ctx.isGetter`).
 *   - Not on **denied** (policy-rejected) dispatch.
 *   - Only through the **proxy**; a call on the raw target bypasses the
 *     gate entirely (this is how the sweep reads without self-touching).
 *
 * Observations read `getLastTouched()` on the RAW target so the read
 * itself never counts as a touch.
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
import { MixinApi } from '../mixin';

class TouchProbe extends Idea {
  public called = 0;
  public bump(): void {
    this.called += 1;
  }
  public get reading(): number {
    return this.called;
  }
}

describe('residency dispatch-touch', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('a fresh Stuff is touched at construction time', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const raw = ProxyApi.unwrap(makeStuff(() => new TouchProbe()));
      expect(raw.getLastTouched()).toBe(1_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('advances on a successful method dispatch through the proxy', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const s = makeStuff(() => new TouchProbe());
      const raw = ProxyApi.unwrap(s);
      expect(raw.getLastTouched()).toBe(1_000);

      vi.setSystemTime(2_500);
      s.bump();
      expect(raw.getLastTouched()).toBe(2_500);

      vi.setSystemTime(4_000);
      s.bump();
      expect(raw.getLastTouched()).toBe(4_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT advance on a getter read', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const s = makeStuff(() => new TouchProbe());
      const raw = ProxyApi.unwrap(s);

      vi.setSystemTime(9_000);
      void s.reading; // getter dispatch — a passive read is not a touch
      expect(raw.getLastTouched()).toBe(1_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT advance on a denied (policy-rejected) dispatch', () => {
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
      const raw = ProxyApi.unwrap(s);
      const initial = raw.getLastTouched();

      vi.setSystemTime(12_000);
      expect(() => s.locked()).toThrow(SecurityError);
      expect(raw.getLastTouched()).toBe(initial);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does NOT advance when a method is called on the RAW target', () => {
    // The sweep reads/asks via the raw target precisely so its own
    // introspection never counts as a touch. A raw call bypasses the gate.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const raw = ProxyApi.unwrap(makeStuff(() => new TouchProbe()));

      vi.setSystemTime(8_000);
      (raw as unknown as TouchProbe).bump(); // raw call — no gate, no touch
      expect(raw.getLastTouched()).toBe(1_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recency is transient (a fresh Stuff is unaffected by prior Stuff)', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const a = ProxyApi.unwrap(makeStuff(() => new TouchProbe()));
      expect(a.getLastTouched()).toBe(1_000);

      vi.setSystemTime(2_000);
      const b = ProxyApi.unwrap(makeStuff(() => new TouchProbe()));
      expect(b.getLastTouched()).toBe(2_000);
      expect(a.getLastTouched()).toBe(1_000); // a untouched — no call was made
    } finally {
      vi.useRealTimers();
    }
  });

  it('lastTouched is not a persistent field', () => {
    const fields =
      MixinApi.getAllPersistentFields(Stuff) ??
      [];
    expect(fields).not.toContain('lastTouched');
  });
});

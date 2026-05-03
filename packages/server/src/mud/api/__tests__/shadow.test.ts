/**
 * Stage 3 — shadow tests.
 *
 * Covers the §3.12 verification list at a tractable scope:
 *   - inferred surface walk (mixin composition + @Shadowing)
 *   - dispatch through 0 / 1 / 2+ shadows
 *   - callDown chain semantics + bypass marker
 *   - callBypass shape
 *   - attach/detach atomicity, idempotency, @Unshadowable rejection
 *   - StuffApi.destruct lifecycle ordering
 *   - shadow-as-Stuff sanity (stuffId, registry lookup)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShadowApi } from '../shadow';
import { Shadow } from '../../lib/stuff/Shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import { NamedMixin } from '../../lib/character/Named';
import { Shadowing, ShadowSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ShadowError, SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// A Stuff host carrying NamedMixin (firstName/lastName/fullName).
class NamedHost extends NamedMixin(Stuff) {}

// Plain shadow that re-implements NamedMixin's surface; the mixin's
// defaults run against the shadow's own state.
class RenameShadow extends NamedMixin(Shadow) {}

// Shadow that overrides the `fullName` getter (NamedMixin's only
// real method on the prototype). `firstName`/`lastName` are field
// initializers, not prototype methods, so they're not part of the
// inferred surface — only `fullName` (a getter) is.
class LiarShadow extends NamedMixin(Shadow) {
  override get fullName(): string {
    return 'LIAR';
  }
}

// Shadow that wraps `fullName` via callDown (observer + delegate).
class CountShadow extends NamedMixin(Shadow) {
  public count = 0;
  override get fullName(): string {
    this.count++;
    return this.callDown<string>();
  }
}

// Shadow with @Shadowing — host method `say`, local method `loudSay`.
class LoudShadow extends Shadow {
  public lastSaid = '';
  @Shadowing('say')
  loudSay(text: string): string {
    this.lastSaid = text;
    return this.callDown<string>(text.toUpperCase());
  }
}

// Host that has a `say` method.
class TalkingHost extends Stuff {
  public lastUttered = '';
  say(text: string): string {
    this.lastUttered = text;
    return text;
  }
}

import { Unshadowable } from '../../lib/security/decorators';

// Host with an @Unshadowable method.
class GuardedHost extends Stuff {
  @Unshadowable
  guarded(): string {
    return 'guarded';
  }
}

describe('ShadowApi.attach / detach', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('rejects a shadow with no surface', () => {
    class NoSurface extends Shadow {}
    const host = makeStuff(() => new NamedHost());
    const sh = makeStuff(() => new NoSurface());
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });

  it('attaches a mixin-derived shadow and exposes interceptedMethods', () => {
    const host = makeStuff(() => new NamedHost());
    const sh = makeStuff(() => new RenameShadow());
    ShadowApi.attach(host, sh);
    expect(sh.host).toBe(host);
    expect([...sh.interceptedMethods].sort()).toEqual(['fullName']);
    // (Note: NamedMixin's `firstName`/`lastName` are field initializers,
    // not own properties on the prototype, so the prototype-walk
    // intercept set captures `fullName` only. That's the documented
    // behaviour: the inferred surface is "every property defined on
    // the mixin's prototype layer" — methods, getters, setters.)
  });

  it('rejects re-attach without intervening detach', () => {
    const host = makeStuff(() => new NamedHost());
    const sh = makeStuff(() => new RenameShadow());
    ShadowApi.attach(host, sh);
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });

  it('detach is idempotent (no host → no-op)', () => {
    const sh = makeStuff(() => new RenameShadow());
    expect(() => ShadowApi.detach(sh)).not.toThrow();
    expect(sh.host).toBeNull();
  });

  it('detach clears both directions atomically', () => {
    const host = makeStuff(() => new NamedHost());
    const sh = makeStuff(() => new RenameShadow());
    ShadowApi.attach(host, sh);
    ShadowApi.detach(sh);
    expect(sh.host).toBeNull();
    expect(ShadowApi.getAllShadows(host).size).toBe(0);
  });

  it('rejects attach to host with @Unshadowable method that the shadow covers', () => {
    const host = makeStuff(() => new GuardedHost());
    class GuardedShadow extends Shadow {
      @Shadowing('guarded')
      g(): string {
        return 'shadow';
      }
    }
    const sh = makeStuff(() => new GuardedShadow());
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });
});

describe('ShadowApi dispatch (proxy invocation)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('runs the host method when no shadows attached', () => {
    const host = makeStuff(() => new TalkingHost());
    expect(host.say('hi')).toBe('hi');
  });

  it('a shadow that overrides without callDown fully replaces', () => {
    const host = makeStuff(() => new NamedHost());
    host.firstName = 'Alice';
    host.lastName = 'A';
    const sh = makeStuff(() => new LiarShadow());
    ShadowApi.attach(host, sh);
    // LiarShadow overrides `fullName` to always return 'LIAR' with
    // no callDown — the host's fullName getter never runs.
    expect(host.fullName).toBe('LIAR');
  });

  it('a shadow that calls down chains through to the host original', () => {
    const host = makeStuff(() => new NamedHost());
    host.firstName = 'Bob';
    host.lastName = 'B';
    const sh = makeStuff(() => new CountShadow());
    ShadowApi.attach(host, sh);
    // CountShadow's fullName getter increments and calls down. Since
    // it's the only shadow, callDown lands at the host's original
    // fullName getter (which composes firstName + lastName).
    expect(host.fullName).toBe('Bob B');
    expect(sh.count).toBe(1);
  });

  it('@Shadowing intercepts a host method by name', () => {
    const host = makeStuff(() => new TalkingHost());
    const sh = makeStuff(() => new LoudShadow());
    ShadowApi.attach(host, sh);
    const result = host.say('hello');
    expect(result).toBe('HELLO');
    expect(sh.lastSaid).toBe('hello');
    expect(host.lastUttered).toBe('HELLO');
  });

  it('two shadows compose: top → bottom → host', () => {
    const host = makeStuff(() => new TalkingHost());
    class PrefixShadow extends Shadow {
      @Shadowing('say')
      addPrefix(text: string): string {
        return this.callDown<string>('[!]' + text);
      }
    }
    class SuffixShadow extends Shadow {
      @Shadowing('say')
      addSuffix(text: string): string {
        return this.callDown<string>(text + '[?]');
      }
    }
    const prefix = makeStuff(() => new PrefixShadow());
    const suffix = makeStuff(() => new SuffixShadow());
    ShadowApi.attach(host, prefix);
    ShadowApi.attach(host, suffix);
    // Install order: prefix first, suffix second. Newest (suffix)
    // runs at the top, calls down to prefix, calls down to host.
    expect(host.say('hi')).toBe('[!]hi[?]');
  });

  it('callDown outside dispatch throws', () => {
    const sh = makeStuff(() => new LoudShadow());
    expect(() => (sh as unknown as { loudSay: (s: string) => string }).loudSay('x'))
      .toThrow(ShadowError);
  });
});

describe('callBypass', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('throws if the shadow has no host', () => {
    class BypassShadow extends Shadow {
      @Shadowing('say')
      say(text: string): string {
        return this.callDown<string>(text);
      }
      runBypass(method: string): unknown {
        return this.callBypass(method);
      }
    }
    const sh = makeStuff(() => new BypassShadow());
    expect(() => sh.runBypass('say')).toThrow(ShadowError);
  });

  it('bypasses other shadows and runs the host original', () => {
    const host = makeStuff(() => new TalkingHost());
    class AlwaysRedShadow extends Shadow {
      @Shadowing('say')
      reply(_text: string): string {
        return 'RED';
      }
    }
    class TracerShadow extends Shadow {
      public seen = '';
      @Shadowing('say')
      tracer(text: string): string {
        // Bypass the AlwaysRedShadow above us in the chain to read
        // the unmediated host value.
        const real = this.callBypass<string>('say', text);
        this.seen = real;
        return this.callDown<string>(text);
      }
    }
    const red = makeStuff(() => new AlwaysRedShadow());
    const trace = makeStuff(() => new TracerShadow());
    ShadowApi.attach(host, red);
    ShadowApi.attach(host, trace);
    expect(host.say('hello')).toBe('RED');
    expect(trace.seen).toBe('hello');
  });
});

describe('Lifecycle on host destruct', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('detaches every shadow before destroy runs', () => {
    const host = makeStuff(() => new TalkingHost());
    const sh = makeStuff(() => new LoudShadow());
    ShadowApi.attach(host, sh);
    expect(sh.host).toBe(host);
    StuffApi.destruct(host);
    expect(sh.host).toBeNull();
  });

  it('shadow itself remains alive after host destruct', () => {
    const host = makeStuff(() => new TalkingHost());
    const sh = makeStuff(() => new LoudShadow());
    ShadowApi.attach(host, sh);
    StuffApi.destruct(host);
    expect(sh.isDestroyed()).toBe(false);
    expect(sh.host).toBeNull();
  });
});

describe('@ShadowSecurity', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('@ShadowSecurity({ attach }) gates attach', () => {
    class StrictHost extends Stuff {
      @ShadowSecurity({ attach: SecurityPolicies.SystemRoot })
      sensitive(): string {
        return 'untouched';
      }
    }
    class SensitiveShadow extends Shadow {
      @Shadowing('sensitive')
      override(): string {
        return 'hooked';
      }
    }
    const host = makeStuff(() => new StrictHost());
    const sh = makeStuff(() => new SensitiveShadow());
    // SystemRoot only allows null caller. The shadow attach is
    // called from a test, so caller is non-null → policy denies.
    expect(() => ShadowApi.attach(host, sh)).toThrow(SecurityError);
  });
});

describe('Shadow-as-Stuff sanity', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('shadow has a stuffId and is in the StuffApi registry', () => {
    const sh = makeStuff(() => new LoudShadow());
    expect(sh.stuffId).toBeTruthy();
    expect(StuffApi.findById(sh.stuffId)).toBe(sh);
  });
});

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
import { NamedMixin } from '../../lib/description/Named';
import { Shadowing, ShadowSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ShadowError, SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { Idea } from "../../lib/stuff/Idea";

// A Stuff host with a `describe()` method. The shadow chain
// dispatches methods only (accessors are filtered at attach time),
// so all of the dispatch-mechanics tests below use methods.
class DescribeHost extends Idea {
  public greeting: string = 'plain';
  describe(): string {
    return this.greeting;
  }
}

// Shadow whose own-class body declares `describe()` — the canonical
// own-prototype path that enrols a method into the intercept set.
// Composition alone wouldn't enrol; the override here does.
class PassthroughShadow extends Shadow {
  describe(): string {
    return this.callDown<string>();
  }
}

// Shadow that overrides `describe()` and ignores callDown — fully
// replaces the host's behaviour for that method.
class ReplaceShadow extends Shadow {
  describe(): string {
    return 'REPLACED';
  }
}

// Shadow that wraps `describe()` via callDown — observer + delegate.
class CountingShadow extends Shadow {
  public count = 0;
  describe(): string {
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
class TalkingHost extends Idea {
  public lastUttered = '';
  say(text: string): string {
    this.lastUttered = text;
    return text;
  }
}

import { Unshadowable } from '../../lib/security/decorators';

// Host with an @Unshadowable method.
class GuardedHost extends Idea {
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
    const host = makeStuff(() => new DescribeHost());
    const sh = makeStuff(() => new NoSurface());
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });

  it('attaches a shadow with own-method overrides and exposes interceptedMethods', () => {
    const host = makeStuff(() => new DescribeHost());
    const sh = makeStuff(() => new PassthroughShadow());
    ShadowApi.attach(host, sh);
    expect(sh.host).toBe(host);
    // Only methods declared in the shadow's own class body intercept.
    // PassthroughShadow declares one: `describe()`.
    expect([...sh.interceptedMethods]).toEqual(['describe']);
  });

  it('shadow composing a mixin without own overrides has empty intercept set', () => {
    // NamedMixin contributes accessors and methods to its prototype,
    // but BareMixinShadow's own prototype only carries `constructor`.
    // Inherited methods are part of the type contract, not the
    // intercept set.
    class BareMixinShadow extends NamedMixin(Shadow) {}
    const host = makeStuff(() => new DescribeHost());
    const sh = makeStuff(() => new BareMixinShadow());
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });

  it('shadow that only overrides accessors has empty intercept set', () => {
    // Accessors are host-internal, never part of the shadow surface.
    // A shadow whose only own-prototype properties are getters/setters
    // gets an empty intercept set and attach throws.
    class AccessorOnlyShadow extends NamedMixin(Shadow) {
      override get fullName(): string {
        return 'IGNORED';
      }
    }
    const host = makeStuff(() => new DescribeHost());
    const sh = makeStuff(() => new AccessorOnlyShadow());
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });

  it('rejects re-attach without intervening detach', () => {
    const host = makeStuff(() => new DescribeHost());
    const sh = makeStuff(() => new PassthroughShadow());
    ShadowApi.attach(host, sh);
    expect(() => ShadowApi.attach(host, sh)).toThrow(ShadowError);
  });

  it('detach is idempotent (no host → no-op)', () => {
    const sh = makeStuff(() => new PassthroughShadow());
    expect(() => ShadowApi.detach(sh)).not.toThrow();
    expect(sh.host).toBeNull();
  });

  it('detach clears both directions atomically', () => {
    const host = makeStuff(() => new DescribeHost());
    const sh = makeStuff(() => new PassthroughShadow());
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
    const host = makeStuff(() => new DescribeHost());
    host.greeting = 'plain';
    const sh = makeStuff(() => new ReplaceShadow());
    ShadowApi.attach(host, sh);
    // ReplaceShadow overrides `describe()` with no callDown — the
    // host's method never runs.
    expect(host.describe()).toBe('REPLACED');
  });

  it('a shadow that calls down chains through to the host original', () => {
    const host = makeStuff(() => new DescribeHost());
    host.greeting = 'hello';
    const sh = makeStuff(() => new CountingShadow());
    ShadowApi.attach(host, sh);
    // CountingShadow increments and calls down. Since it's the only
    // shadow, callDown lands at the host's original describe().
    expect(host.describe()).toBe('hello');
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
    class StrictHost extends Idea {
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

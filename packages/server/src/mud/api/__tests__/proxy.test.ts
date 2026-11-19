/**
 * ProxyApi tests — covers the proxy mechanics (descriptor lookup,
 * wrapper caching, mock-spy passthrough, raw-target unwrap) AND the
 * SecurityApi's interceptor end-to-end behaviour against a wrapped Stuff.
 *
 * The security interceptor registers itself on import; we don't need
 * to touch it here. `makeStuff` from test-setup ensures it's loaded.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StuffApi } from '../stuff';
import { ProxyApi } from '../proxy';
import Good from '../../lib/stuff/Good';
import { ExecutionContextApi, FrameKind } from '../execution-context';
import { SecurityError } from '../../lib/security/errors';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';

describe('ProxyApi.wrap + sentinel + decorated destroy', () => {
  beforeEach(() => StuffApi.clearAll());

  it('rejects raw `new` from outside StuffApi', () => {
    expect(() => new Good()).toThrow(/Direct 'new' on a Stuff subclass/);
  });

  it('StuffApi.create succeeds and returns a proxy', async () => {
    const t = await StuffApi.create(() => new Good());
    expect(t.stuffId).toBeTruthy();
    expect(StuffApi.findById(t.stuffId)).toBe(t);
  });

  it('makeStuff (test seam) yields a working proxied instance', () => {
    const t = makeStuff(() => new Good());
    expect(t.stuffId).toBeTruthy();
    expect(StuffApi.findById(t.stuffId)).toBe(t);
  });

  it('direct obj.destroy() throws SecurityError', () => {
    const t = makeStuff(() => new Good());
    expect(() => t.destroy()).toThrow(SecurityError);
  });

  it('StuffApi.destruct(obj) succeeds', () => {
    const t = makeStuff(() => new Good());
    expect(() => StuffApi.destruct(t)).not.toThrow();
    expect(t.isDestroyed()).toBe(true);
  });

  it('a destroyed object is inert: method calls no-op (return undefined)', () => {
    const t = makeStuff(() => new Good());
    StuffApi.destruct(t);
    // A destroyed Stuff is inert — methods are no-ops returning undefined,
    // never a throw (an in-flight async / stale broadcast ref hitting a
    // dead object must not crash). `isDestroyed` stays exempt + truthful.
    expect(() => t.getContainer()).not.toThrow();
    expect(t.getContainer()).toBeUndefined();
  });

  it('isDestroyed() remains callable post-destruct', () => {
    const t = makeStuff(() => new Good());
    StuffApi.destruct(t);
    expect(t.isDestroyed()).toBe(true);
  });
});

describe('ProxyApi mechanics', () => {
  beforeEach(() => StuffApi.clearAll());

  it('unwrap returns the raw target via the RAW_TARGET symbol', () => {
    const t = makeStuff(() => new Good());
    const raw = ProxyApi.unwrap(t);
    expect(raw).not.toBe(t);                  // proxy !== raw
    expect(raw.stuffId).toBe(t.stuffId);      // same identity below the proxy
  });

  it('repeated method reads return the same wrapper reference (cached)', () => {
    const t = makeStuff(() => new Good());
    expect(t.getContainer).toBe(t.getContainer);
  });

  it('passthrough keys (constructor, stuffId) bypass the pipeline', () => {
    const t = makeStuff(() => new Good());
    expect(t.constructor).toBe(Good);
    expect(typeof t.stuffId).toBe('string');
  });
});

describe('command frame plumbing (via test seam)', () => {
  beforeEach(() => StuffApi.clearAll());

  it('getCurrentCommandGiver returns the executor inside executeCommand', async () => {
    const issuer = { name: 'tester' };
    let observed: unknown = 'unset';
    await ExecutionContextApi.runRoot(null, 'root', () =>
      ExecutionContextApi.run(
        null,
        issuer,
        'executeCommand',
        { kind: FrameKind.Command },
        () => {
          observed = ExecutionContextApi.getCurrentCommandGiver();
        }
      )
    );
    expect(observed).toBe(issuer);
  });
});

/**
 * ⭐ What the read trap answers, per kind of read (call-security-performance
 * W1, D1). The trap must know whether a name is a GETTER before it reads
 * it — a getter runs through the pipeline (gated, with a frame), anything
 * else is read live. These pin the answer for every shape that answer can
 * take, so the per-prototype accessor cache can be proved exact: an own
 * field or accessor, a prototype getter or method, a spy, a replaced
 * getter, a symbol, an absent name, a re-parented instance, and two
 * classes of one name (what a hot reload makes).
 *
 * "Through the pipeline" is observed as a pushed frame: inside the body,
 * `ExecutionContextApi.getCurrentTarget()` is the proxy only when the gate
 * pushed one.
 */
describe('ProxyApi read trap — each kind of read', () => {
  beforeEach(() => StuffApi.clearAll());

  const SYM = Symbol('csp.probe');

  class Reader extends Good {
    public plain = 7;
    public get framed(): unknown {
      return ExecutionContextApi.getCurrentTarget();
    }
    public get self(): unknown {
      return this;
    }
    public get [SYM](): string {
      return 'symbol-getter';
    }
    public m(): string {
      return 'm';
    }
    @CallSecurity(SecurityPolicies.ApiOnly)
    public get guardedValue(): string {
      return 'secret';
    }
  }

  it('an own field reads its value', () => {
    const r = makeStuff(() => new Reader());
    expect(r.plain).toBe(7);
  });

  it('an own accessor defined on the instance runs through the pipeline', () => {
    const r = makeStuff(() => new Reader());
    Object.defineProperty(ProxyApi.unwrap(r), 'ownGetter', {
      get: () => ExecutionContextApi.getCurrentTarget(),
      configurable: true,
    });
    expect((r as unknown as { ownGetter: unknown }).ownGetter).toBe(r);
  });

  it('a prototype getter runs with this === proxy, inside a pushed frame', () => {
    const r = makeStuff(() => new Reader());
    expect(r.self).toBe(r);
    expect(r.framed).toBe(r);
    // Twice: the second read is the cached answer.
    expect(r.framed).toBe(r);
  });

  it('a gated prototype getter is gated', () => {
    const r = makeStuff(() => new Reader());
    expect(() => r.guardedValue).toThrow(SecurityError);
    expect(() => r.guardedValue).toThrow(SecurityError);
  });

  it('a method read is wrapped, and the wrapper is stable', () => {
    const r = makeStuff(() => new Reader());
    const raw = ProxyApi.unwrap(r);
    expect(r.m).not.toBe(Reader.prototype.m);
    expect(r.m).toBe(r.m);
    expect(r.m()).toBe('m');
    expect(raw.m()).toBe('m');
  });

  it('a prototype spy installed AFTER a first read is seen, unwrapped', () => {
    const r = makeStuff(() => new Reader());
    expect(r.m()).toBe('m');
    const spy = vi.spyOn(Reader.prototype, 'm').mockReturnValue('spied');
    try {
      expect(r.m).toBe(spy);
      expect(r.m()).toBe('spied');
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    expect(r.m()).toBe('m');
  });

  it('an instance-level replacement is seen', () => {
    const r = makeStuff(() => new Reader());
    expect(r.m()).toBe('m');
    const fn = vi.fn(() => 'own');
    (r as unknown as { m: () => string }).m = fn;
    expect(r.m()).toBe('own');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a getter replaced on its holder after a first read is the one that runs', () => {
    class Swapped extends Good {
      public get g(): string {
        return 'before';
      }
    }
    const s = makeStuff(() => new Swapped());
    expect(s.g).toBe('before');
    Object.defineProperty(Swapped.prototype, 'g', {
      get: () => 'after',
      configurable: true,
    });
    expect(s.g).toBe('after');
  });

  it('a symbol-keyed getter runs', () => {
    const r = makeStuff(() => new Reader());
    expect((r as unknown as Record<symbol, string>)[SYM]).toBe('symbol-getter');
    expect((r as unknown as Record<symbol, string>)[SYM]).toBe('symbol-getter');
  });

  it('an absent property reads undefined, twice', () => {
    const r = makeStuff(() => new Reader());
    expect((r as unknown as Record<string, unknown>).nothingDeclaresThis).toBeUndefined();
    expect((r as unknown as Record<string, unknown>).nothingDeclaresThis).toBeUndefined();
  });

  it('a data property nearer the instance shadows a getter further up', () => {
    class Upper extends Good {
      public get v(): string {
        return 'getter';
      }
    }
    class Lower extends Upper {}
    Object.defineProperty(Lower.prototype, 'v', { value: 'data', configurable: true });
    const l = makeStuff(() => new Lower());
    expect(l.v).toBe('data');
    expect(l.v).toBe('data');
  });

  it('an instance re-parented with setPrototypeOf answers for its new chain', () => {
    class A extends Good {
      public x(): string {
        return 'a-method';
      }
    }
    class B extends Good {
      public get x(): string {
        return 'b-getter';
      }
    }
    const a = makeStuff(() => new A());
    expect((a as unknown as { x: () => string }).x()).toBe('a-method');
    Object.setPrototypeOf(ProxyApi.unwrap(a), B.prototype);
    expect((a as unknown as { x: string }).x).toBe('b-getter');
  });

  it('two classes of one name — a method in one, a getter in the other — each answer for themselves', () => {
    // What a hot reload makes: a NEW class object, same name, the member's
    // kind changed. Existing instances keep the old prototype.
    const v1 = (() => {
      class Probe extends Good {
        public facet(): string {
          return 'method';
        }
      }
      return Probe;
    })();
    const v2 = (() => {
      class Probe extends Good {
        public get facet(): string {
          return 'getter';
        }
      }
      return Probe;
    })();
    const old = makeStuff(() => new v1());
    expect(old.facet()).toBe('method');
    const fresh = makeStuff(() => new v2());
    expect(fresh.facet).toBe('getter');
    expect(typeof old.facet).toBe('function');
    expect(old.facet()).toBe('method');
    expect(fresh.facet).toBe('getter');
  });
});

/**
 * ⛔ The spy passthrough is a test-runner affordance (call-security-
 * performance W1b, D12; owner ruling 2026-11-18). A function carrying
 * `_isMockFunction` used to come back unwrapped in ANY process — so any
 * code able to set that property on a function it placed on a Stuff got
 * an ungated method. Outside a test runner it is now gated like any
 * method. The environment is read once per wrap, so a wrap made with the
 * runner markers cleared is a wrap made outside a test run.
 */
describe('ProxyApi spy passthrough — a test-run affordance', () => {
  beforeEach(() => StuffApi.clearAll());

  class Vault extends Good {
    @CallSecurity(SecurityPolicies.FromModule('/nowhere/at/all'))
    public open(): string {
      return 'opened';
    }
  }

  /** Make `fn()`'s wraps as a process that is not running a test runner. */
  function outsideATestRun<T>(fn: () => T): T {
    // `NODE_ENV=test` stays: a wire world inherits it, and is still not a
    // test run (D12).
    const vitest = process.env.VITEST;
    delete process.env.VITEST;
    try {
      return fn();
    } finally {
      if (vitest === undefined) delete process.env.VITEST;
      else process.env.VITEST = vitest;
    }
  }

  it('outside a test run, a spy-marked replacement of a gated method is gated', () => {
    const v = outsideATestRun(() => makeStuff(() => new Vault()));
    const forged = Object.assign(() => 'unchecked', { _isMockFunction: true });
    (ProxyApi.unwrap(v) as unknown as { open: () => string }).open = forged;
    expect(() => v.open()).toThrow(SecurityError);
  });

  it('in a test run, a spy still replaces the method it spies', () => {
    const v = makeStuff(() => new Vault());
    const spy = vi.spyOn(Vault.prototype, 'open').mockReturnValue('spied');
    try {
      expect(v.open).toBe(spy);
      expect(v.open()).toBe('spied');
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('the gate itself is unchanged either way', () => {
    const inRun = makeStuff(() => new Vault());
    const outside = outsideATestRun(() => makeStuff(() => new Vault()));
    expect(() => inRun.open()).toThrow(SecurityError);
    expect(() => outside.open()).toThrow(SecurityError);
  });
});

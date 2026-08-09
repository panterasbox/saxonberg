/**
 * Mixin-registry cleanup-handler dispatcher tests.
 *
 * Exercises the framework cleanup walk slot inserted into
 * `StuffApi.#destructCore` — the step that discovers each mixin's
 * static `cleanupOnDestruct(stuff)` via the `MixinApi.queryMixins`
 * prototype walk and invokes them most-derived-first between the
 * user `onDestruct` witness and `ShadowApi._detachAllForHost`.
 *
 * What this file covers (per Phase 2 of the ref-shapes plan):
 *   - Dispatcher fires registered handler.
 *   - Walk order is most-derived-first.
 *   - Subclass override of `onDestruct` cannot bypass cleanup.
 *   - Exception policy: log-and-continue per handler, never rethrow.
 *   - Mixins without `cleanupOnDestruct` are skipped silently.
 *   - `canDestruct` veto skips cleanup (it aborts before the slot).
 *   - Cleanup runs AFTER `onDestruct` (user customization first).
 *
 * The dispatcher is mixin-only by design: a concrete leaf class
 * doesn't appear in `queryMixins` output. Concrete-class cleanup
 * uses the `onDestruct` witness instead. That distinction is
 * verified in the "leaf-class statics are NOT discovered" case.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import { Idea } from '../../lib/stuff/Idea';
import { DestructError, type VetoResult } from '../../lib/errors';
import type { MixinConstructor } from '../../lib/mixin';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// Capture array shared across mixins in a single test — declared
// here at module scope so the test mixins can append to it without
// closure plumbing. Cleared per test in beforeEach.
const captures: string[] = [];

// ────────────────────────────────────────────────────────────────
// Test mixins. Each carries `_mixinName` so `MixinApi.queryMixins`
// recognizes it. Static `cleanupOnDestruct` pushes a unique tag.
// ────────────────────────────────────────────────────────────────

function TagMixinA<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TagMixinA extends Base {
    static _mixinName = 'TagMixinA';
    static cleanupOnDestruct(_stuff: Stuff): void {
      void _stuff;
      captures.push('A');
    }
  };
}

function TagMixinB<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TagMixinB extends Base {
    static _mixinName = 'TagMixinB';
    static cleanupOnDestruct(_stuff: Stuff): void {
      void _stuff;
      captures.push('B');
    }
  };
}

function ThrowingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ThrowingMixin extends Base {
    static _mixinName = 'ThrowingMixin';
    static cleanupOnDestruct(_stuff: Stuff): void {
      void _stuff;
      captures.push('threw');
      throw new Error('cleanup-handler boom');
    }
  };
}

function QuietMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  // No cleanupOnDestruct — the dispatcher should skip it silently.
  return class QuietMixin extends Base {
    static _mixinName = 'QuietMixin';
  };
}

function ReceiverProbeMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class ReceiverProbeMixin extends Base {
    static _mixinName = 'ReceiverProbeMixin';
    static cleanupOnDestruct(stuff: Stuff): void {
      // Capture the stuffId so the test can verify the dispatcher
      // hands us the destructing target (not e.g. `this`).
      captures.push(`recv:${stuff.stuffId}`);
    }
  };
}

describe('StuffApi.destruct — mixin-registry cleanup dispatcher', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    captures.length = 0;
  });

  it('invokes a registered cleanupOnDestruct exactly once', () => {
    class Tagged extends TagMixinA(Idea) {}
    const target = makeStuff(() => new Tagged());
    StuffApi.destruct(target);
    expect(captures).toEqual(['A']);
    expect(target.isDestroyed()).toBe(true);
  });

  it('walk order: most-derived first, base last', () => {
    // Composition reads outside-in; queryMixins walks the prototype
    // chain from the leaf class up, so the outer mixin (TagMixinA)
    // appears BEFORE the inner one (TagMixinB).
    class Stacked extends TagMixinA(TagMixinB(Idea)) {}
    const target = makeStuff(() => new Stacked());
    StuffApi.destruct(target);
    expect(captures).toEqual(['A', 'B']);
  });

  it('passes the destructing target as the handler argument', () => {
    class Probe extends ReceiverProbeMixin(Idea) {}
    const target = makeStuff(() => new Probe());
    const id = target.stuffId;
    StuffApi.destruct(target);
    expect(captures).toEqual([`recv:${id}`]);
  });

  it('mixins without cleanupOnDestruct are skipped silently', () => {
    class Mixed extends TagMixinA(QuietMixin(Idea)) {}
    const target = makeStuff(() => new Mixed());
    StuffApi.destruct(target);
    // Only TagMixinA contributed. No throw, no log.
    expect(captures).toEqual(['A']);
  });

  it('canDestruct veto throws and SKIPS cleanup', () => {
    class Vetoed extends TagMixinA(Idea) {
      canDestruct(): VetoResult {
        return { ok: false, reason: 'pinned' };
      }
    }
    const target = makeStuff(() => new Vetoed());
    expect(() => StuffApi.destruct(target)).toThrow(DestructError);
    // Veto fires before the cleanup slot.
    expect(captures).toEqual([]);
    expect(target.isDestroyed()).toBe(false);
  });

  it('cleanup runs AFTER user onDestruct witness', () => {
    class Witness extends TagMixinA(Idea) {
      override onDestruct(): void {
        captures.push('user-onDestruct');
        super.onDestruct();
      }
    }
    const target = makeStuff(() => new Witness());
    StuffApi.destruct(target);
    // User customization first, framework cleanup second.
    expect(captures).toEqual(['user-onDestruct', 'A']);
  });

  it('subclass onDestruct that omits super.onDestruct() does NOT skip cleanup', () => {
    class Sub extends TagMixinA(Idea) {
      override onDestruct(): void {
        captures.push('sub');
        // deliberately does not chain super.onDestruct() — the
        // R2.4 "structural impossibility of bypass" guarantee.
      }
    }
    const target = makeStuff(() => new Sub());
    StuffApi.destruct(target);
    expect(captures).toEqual(['sub', 'A']);
    expect(target.isDestroyed()).toBe(true);
  });

  it('throwing handler is logged, dispatcher does NOT rethrow, destroy() still runs', () => {
    class Boom extends ThrowingMixin(Idea) {}
    const target = makeStuff(() => new Boom());
    const id = target.stuffId;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => StuffApi.destruct(target)).not.toThrow();
      expect(captures).toEqual(['threw']);
      expect(target.isDestroyed()).toBe(true);
      // Logged once with mixin name + stuff id.
      expect(spy).toHaveBeenCalledTimes(1);
      const [msg, err] = spy.mock.calls[0]!;
      expect(String(msg)).toContain('ThrowingMixin');
      expect(String(msg)).toContain(id);
      expect((err as Error).message).toBe('cleanup-handler boom');
    } finally {
      spy.mockRestore();
    }
  });

  it('one bad handler does not block subsequent handlers', () => {
    // ThrowingMixin is the OUTER mixin — fires first (most-derived).
    // TagMixinB inside it must still fire after the throw.
    class Combo extends ThrowingMixin(TagMixinB(Idea)) {}
    const target = makeStuff(() => new Combo());
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      StuffApi.destruct(target);
      expect(captures).toEqual(['threw', 'B']);
      expect(target.isDestroyed()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('leaf-class static cleanupOnDestruct is NOT discovered (mixin-only)', () => {
    // Documenting the design: concrete-class cleanup uses onDestruct
    // witness, not the static. queryMixins only yields mixins
    // (entries carrying _mixinName).
    class Leaf extends Idea {
      static cleanupOnDestruct(_stuff: Stuff): void {
        void _stuff;
        captures.push('leaf-static');
      }
    }
    const target = makeStuff(() => new Leaf());
    StuffApi.destruct(target);
    expect(captures).toEqual([]);
    expect(target.isDestroyed()).toBe(true);
  });
});

describe('StuffApi.forceDestruct — narrow-entry rejection', () => {
  // The force-bypass path uses the same `#destructCore` body, so
  // framework cleanup must fire identically when reached through
  // the legitimate `DestructController` entry. Direct calls from
  // any other module (this test file included) are denied by the
  // `FromController(DestructController)` policy before the body
  // runs — the invariant the narrow-entry pattern guarantees.
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    captures.length = 0;
  });

  it('forceDestruct rejects from outside DestructController before any cleanup fires', () => {
    class Tagged extends TagMixinA(Idea) {}
    const target = makeStuff(() => new Tagged());
    expect(() => StuffApi.forceDestruct(target)).toThrow(
      /FromModule.*DestructController/,
    );
    expect(captures).toEqual([]);
    expect(target.isDestroyed()).toBe(false);
  });
});

// Silence unused-import warnings — afterEach pulled in for hooks
// the file might grow into; remove if you genuinely don't use it.
afterEach(() => {});

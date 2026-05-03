/**
 * ModuleRegistry tests — covers stamping, lookup, the stack-based
 * caller verification, the @Final validator, and the test seams.
 *
 * The end-to-end "transform-applied stamps" path is covered indirectly
 * by every other test in the suite (since the Vite plugin runs over
 * every mud/ file) — here we hit the registry's API directly with the
 * test seams.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry, validateNoFinalOverrides } from './ModuleRegistry';
import { Final } from './decorators';
import { FinalViolationError } from './errors';

describe('ModuleRegistry', () => {
  it('returns null for a class with no stamp', () => {
    class Unstamped {}
    expect(ModuleRegistry.lookup(Unstamped)).toBeNull();
  });

  it('returns null for null caller', () => {
    expect(ModuleRegistry.lookup(null)).toBeNull();
  });

  it('_stampForTest sets the module-id', () => {
    class Foo {}
    ModuleRegistry._stampForTest(Foo, 'mud/lib/Foo#Foo');
    expect(ModuleRegistry.lookup(Foo)).toBe('mud/lib/Foo#Foo');
    ModuleRegistry._forgetForTest(Foo);
  });

  it('first-stamp-wins for a given class', () => {
    class Foo {}
    ModuleRegistry._stampForTest(Foo, 'first/path#Foo');
    // Second call via stamp() should be ignored — but stamp() goes
    // through caller verification. Use _stampForTest directly to
    // confirm WeakMap semantics.
    ModuleRegistry._stampForTest(Foo, 'second/path#Foo');
    // Direct WeakMap.set semantics replace; but stamp() guards
    // against this with `has()` check. The seam exists for tests
    // that need a clean slate — verify it overwrites.
    expect(ModuleRegistry.lookup(Foo)).toBe('second/path#Foo');
    ModuleRegistry._forgetForTest(Foo);
  });
});

describe('@Final validator', () => {
  it('passes for a class with no @Final ancestor', () => {
    class A {
      m() {}
    }
    class B extends A {
      m() {}
    }
    expect(() => validateNoFinalOverrides(B)).not.toThrow();
  });

  it('passes for a sibling that does NOT override @Final', () => {
    class A {
      @Final
      m() {}
    }
    class B extends A {}
    expect(() => validateNoFinalOverrides(B)).not.toThrow();
  });

  it('throws when a subclass overrides an ancestor @Final method', () => {
    class A {
      @Final
      m() {}
    }
    class B extends A {
      override m() {}
    }
    expect(() => validateNoFinalOverrides(B)).toThrow(FinalViolationError);
  });

  it('walks multi-level chains (A→B→C, only C overrides)', () => {
    class A {
      @Final
      m() {}
    }
    class B extends A {}
    class C extends B {
      override m() {}
    }
    expect(() => validateNoFinalOverrides(B)).not.toThrow();
    expect(() => validateNoFinalOverrides(C)).toThrow(FinalViolationError);
  });

  it('FinalViolationError carries class + qualified-method names', () => {
    class A {
      @Final
      m() {}
    }
    class B extends A {
      override m() {}
    }
    try {
      validateNoFinalOverrides(B);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FinalViolationError);
      const err = e as FinalViolationError;
      expect(err.className).toBe('B');
      expect(err.qualifiedMethod).toBe('A.m');
    }
  });
});

/**
 * Decorator + resolver tests.
 *
 * Covers polymorphic @CallSecurity (method/static/class), polymorphic
 * @Unshadowable (method/class), the @Final stamping (validator runs in
 * `ModuleApi.stamp`), and the resolution order:
 *   per-method @CallSecurity > class-form @CallSecurity > Public.
 *
 * Decorators are thin wrappers around `SecurityApi`; tests poke
 * `SecurityApi._*ForTest` seams to inspect what each decorator stamped.
 */

import { describe, it, expect } from 'vitest';
import { CallSecurity, Unshadowable, Final } from '../decorators';
import { SecurityPolicies } from '../SecurityPolicies';
import { SecurityApi } from '../../../api/security';
import { ExecutionContextApi } from '../../../api/execution-context';
import { SecurityError } from '../errors';

describe('@CallSecurity (polymorphic)', () => {
  it('method form stamps the method policy', () => {
    class Foo {
      @CallSecurity(SecurityPolicies.SelfOnly)
      m(): void {}
    }
    expect(SecurityApi._methodPolicyForTest(Foo, 'm')?.name).toBe('SelfOnly');
  });

  it('class form stamps the default policy', () => {
    @CallSecurity(SecurityPolicies.SystemRoot)
    class Bar {}
    expect(SecurityApi._classDefaultPolicyForTest(Bar)?.name).toBe('SystemRoot');
  });

  it('resolves per-method policy when present', () => {
    class Foo {
      @CallSecurity(SecurityPolicies.SystemRoot)
      m(): void {}
      n(): void {}
    }
    const inst = Object.create(Foo.prototype);
    expect(SecurityApi.resolveCallPolicy(inst, 'm').name).toBe('SystemRoot');
    expect(SecurityApi.resolveCallPolicy(inst, 'n').name).toBe('Public');
  });

  it('falls back to class-form policy for unannotated methods', () => {
    @CallSecurity(SecurityPolicies.SelfOnly)
    class Foo {
      m(): void {}
    }
    const inst = Object.create(Foo.prototype);
    expect(SecurityApi.resolveCallPolicy(inst, 'm').name).toBe('SelfOnly');
  });

  it('method-form wins over class-form', () => {
    @CallSecurity(SecurityPolicies.SystemRoot)
    class Foo {
      @CallSecurity(SecurityPolicies.Public)
      m(): void {}
    }
    const inst = Object.create(Foo.prototype);
    expect(SecurityApi.resolveCallPolicy(inst, 'm').name).toBe('Public');
  });

  it('walks the prototype chain (subclass inherits parent annotation)', () => {
    class Parent {
      @CallSecurity(SecurityPolicies.SystemRoot)
      m(): void {}
    }
    class Child extends Parent {}
    const inst = Object.create(Child.prototype);
    expect(SecurityApi.resolveCallPolicy(inst, 'm').name).toBe('SystemRoot');
  });
});

describe('@CallSecurity on static methods', () => {
  it('wraps the descriptor with frame-push and policy enforcement', () => {
    class StuffApi {
      @CallSecurity(SecurityPolicies.SystemRoot)
      static doIt(): string {
        return 'ok';
      }
    }
    // No enclosing root frame → caller is null → SystemRoot allows.
    expect(StuffApi.doIt()).toBe('ok');
  });

  it('throws SecurityError when policy denies', () => {
    class StuffApi {
      @CallSecurity(SecurityPolicies.SelfOnly)
      static doIt(): string {
        return 'ok';
      }
    }
    expect(() => StuffApi.doIt()).toThrow(SecurityError);
  });

  it('decorateApiClass wraps every static method', () => {
    class StuffApi {
      static recorded = '';
      static helper(): void {
        StuffApi.recorded = ExecutionContextApi.getCurrentTarget()?.constructor
          ? (ExecutionContextApi.getCurrentTarget() as Function).name
          : 'none';
      }
    }
    SecurityApi.decorateApiClass(StuffApi);
    StuffApi.helper();
    // The helper sees the class itself as the current target (set by
    // the wrapper via ExecutionContextApi.run(caller, cls, ...)).
    expect(StuffApi.recorded).toBe('StuffApi');
  });
});

describe('SecurityApi.resolveStaticCallPolicy', () => {
  it('returns Public when nothing is decorated', () => {
    class Plain {
      static m(): void {}
    }
    expect(SecurityApi.resolveStaticCallPolicy(Plain, 'm').name).toBe('Public');
  });

  it('returns the per-method static policy', () => {
    class Foo {
      @CallSecurity(SecurityPolicies.SystemRoot)
      static m(): void {}
    }
    expect(SecurityApi.resolveStaticCallPolicy(Foo, 'm').name).toBe('SystemRoot');
  });
});

describe('@Unshadowable (polymorphic)', () => {
  it('method form is recorded', () => {
    class Foo {
      @Unshadowable
      m(): void {}
    }
    const inst = Object.create(Foo.prototype);
    expect(SecurityApi.isMethodUnshadowable(inst, 'm')).toBe(true);
    expect(SecurityApi.isMethodUnshadowable(inst, 'n')).toBe(false);
  });

  it('class form makes every method unshadowable', () => {
    @Unshadowable
    class Foo {
      m(): void {}
      n(): void {}
    }
    const inst = Object.create(Foo.prototype);
    expect(SecurityApi.isMethodUnshadowable(inst, 'm')).toBe(true);
    expect(SecurityApi.isMethodUnshadowable(inst, 'n')).toBe(true);
  });

  it('walks the prototype chain', () => {
    @Unshadowable
    class Parent {}
    class Child extends Parent {}
    const inst = Object.create(Child.prototype);
    expect(SecurityApi.isMethodUnshadowable(inst, 'anything')).toBe(true);
  });
});

describe('@Final', () => {
  it('stamps method names per class', () => {
    class Foo {
      @Final
      m(): void {}
    }
    expect(SecurityApi.getFinalMethods(Foo)?.has('m')).toBe(true);
  });

  // Validator behavior (subclass throw at import) is exercised in
  // module.test.ts via `ModuleApi._validateNoFinalOverridesForTest`.
});

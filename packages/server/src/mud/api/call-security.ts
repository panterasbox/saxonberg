/**
 * CallSecurityApi — public surface of the call-security framework.
 *
 * Single ergonomic import for the four authoring concerns:
 *   - decorators (`@CallSecurity`, `@Unshadowable`, `@Final`)
 *   - policies (`SecurityPolicies.Public`, `.ApiOnly`, etc.)
 *   - context (`ExecutionContextApi.getCaller()`, `getCurrentTarget()`, …)
 *   - errors (`SecurityError`, `DestroyedObjectError`, …)
 *
 * Re-exports rather than wraps — there's nothing for an Api class to
 * encapsulate beyond making the names easy to find. The class itself
 * exposes a couple of resolver utilities for code that needs to inspect
 * policy decisions outside of a regular call (testing, audit hooks).
 */

import { SecurityApi } from './security';

export { ExecutionContextApi, FrameKind } from './execution-context';
export type {
  CallFrame,
  CallStack,
  RunFrameOpts,
} from './execution-context';
export { ModuleApi } from './module';
export { SecurityPolicies } from '../lib/security/SecurityPolicies';
export type { SecurityPolicy } from '../lib/security/SecurityPolicies';
export {
  CallSecurity,
  Unshadowable,
  Final,
} from '../lib/security/decorators';
export {
  SecurityError,
  DestroyedObjectError,
  ShadowError,
  FinalViolationError,
} from '../lib/security/errors';

/**
 * Static-class helpers for code that needs to consult the policy
 * resolver outside of a regular dispatch (audit hooks, tests, future
 * tooling). All real enforcement runs inside the Proxy — these are
 * inspection utilities, not enforcement points.
 */
export class CallSecurityApi {
  private constructor() {}

  /**
   * Resolve the entry policy that will fire when `methodName` is
   * invoked on `instance`. Walks the prototype chain per the
   * decorator resolver.
   */
  public static resolvePolicyFor(instance: object, methodName: string) {
    return SecurityApi.resolveCallPolicy(instance, methodName);
  }

  /**
   * Same as `resolvePolicyFor`, but for static methods on `cls`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static resolveStaticPolicyFor(
    cls: abstract new (...args: any[]) => unknown,
    methodName: string
  ) {
    return SecurityApi.resolveStaticCallPolicy(cls, methodName);
  }

  /**
   * Returns true if Stage-3's `ShadowApi.attach` would refuse to
   * shadow `methodName` on `host` because of an `@Unshadowable`
   * stamp. Useful for guarding against bad calls in advance.
   */
  public static isUnshadowable(host: object, methodName: string): boolean {
    return SecurityApi.isMethodUnshadowable(host, methodName);
  }
}

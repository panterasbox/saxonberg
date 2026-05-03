/**
 * Public re-export hub for the call-security framework.
 *
 * One ergonomic import for the four authoring concerns:
 *   - decorators (`@CallSecurity`, `@Unshadowable`, `@Final`,
 *     `@Shadowing`, `@ShadowSecurity`)
 *   - policies (`SecurityPolicies.Public`, `.ApiOnly`, etc.)
 *   - context (`ExecutionContextApi.getCaller()`,
 *     `getCurrentTarget()`, …)
 *   - errors (`SecurityError`, `DestroyedObjectError`,
 *     `ShadowError`, `FinalViolationError`)
 *
 * Plus the four framework Apis:
 *   - `SecurityApi` — decorator-driven metadata + resolver pipeline.
 *   - `ExecutionContextApi` — async-safe call stack.
 *   - `ModuleApi` — class-to-module-URL identity.
 *   - `ProxyApi` — generic Stuff-instance Proxy infrastructure.
 *
 * No class of its own; this file is *only* re-exports. Consumers
 * that need to call resolver utilities use `SecurityApi.*` directly.
 */

export { SecurityApi } from './security';
export type { ShadowSecuritySpec } from './security';
export { ExecutionContextApi, FrameKind } from './execution-context';
export type {
  CallFrame,
  CallStack,
  RunFrameOpts,
} from './execution-context';
export { ModuleApi } from './module';
export { ProxyApi } from './proxy';
export type { Interceptor, InterceptionContext } from './proxy';
export { SecurityPolicies } from '../lib/security/SecurityPolicies';
export type { SecurityPolicy } from '../lib/security/SecurityPolicies';
export {
  CallSecurity,
  Unshadowable,
  Final,
  Shadowing,
  ShadowSecurity,
} from '../lib/security/decorators';
export {
  SecurityError,
  DestroyedObjectError,
  ShadowError,
  FinalViolationError,
} from '../lib/security/errors';

/**
 * Test seams for the call-security framework.
 *
 * Stage 1 wires a hard sentinel that rejects raw `new SomeStuff()` from
 * outside `StuffApi`. Production code must go through `StuffApi.create`
 * or `StuffApi.clone`. Tests that historically called `new` directly
 * either need to migrate to `await StuffApi.create(() => new T())` (the
 * canonical path) or, for terse synchronous tests that don't exercise
 * the async hydrate / postRegister machinery, use `makeStuff` below.
 *
 * `makeStuff` does the minimum a Stuff needs:
 *   - flips the construction sentinel so `new` is allowed,
 *   - wraps the raw instance in the call-security Proxy,
 *   - registers the proxy under its `stuffId`.
 *
 * It deliberately skips `Hydrator.hydrate()` and `postRegister()` — if
 * a test needs those, use `await StuffApi.create(...)` instead.
 *
 * Stage 2's loader-hook spike may add a setupFiles fallback here that
 * stamps module IDs manually (see plan §Stage 2 spike). For now the
 * file is just the `makeStuff` helper.
 */

import type { Stuff } from '../../stuff/Stuff';
import { Stuff as StuffClass } from '../../stuff/Stuff';
import { ProxyApi } from '../../../api/proxy';
import { StuffApi } from '../../../api/stuff';
import { ExecutionContextApi } from '../../../api/execution-context';
// SecurityApi installs its proxy interceptor in a static initializer
// at module-load time. We import it here so tests that reach for the
// proxy via `ProxyApi.wrap` (through `makeStuff`) always have the
// security gate in place — no side-effect-import gymnastics needed.
import { SecurityApi } from '../../../api/security';
void SecurityApi; // referenced only for the static-init side effect

/**
 * Synchronously construct, wrap, and register a Stuff. Mirrors the
 * Stage-1 production path minus the async hydrate / postRegister step.
 * Use only from tests.
 *
 * @internal — do not import from production code.
 */
export function makeStuff<T extends Stuff>(factory: () => T): T {
  const prevSentinel = StuffClass._beginConstruction();
  let raw: T;
  try {
    raw = factory();
  } finally {
    StuffClass._endConstruction(prevSentinel);
  }
  const proxy = ProxyApi.wrap(raw);
  StuffApi.register(proxy);
  return proxy;
}

/**
 * Wrap a function in a synthetic root frame so any guarded call
 * inside it sees a well-defined `caller: null` root. Useful for
 * integration tests that need to assert call-stack walks.
 *
 * @internal
 */
export function withRootContext<T>(target: unknown, method: string, fn: () => T): T {
  return ExecutionContextApi.runRoot(target, method, fn);
}

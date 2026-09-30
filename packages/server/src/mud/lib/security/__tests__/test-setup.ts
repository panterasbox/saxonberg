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
import { MixinApi, type AnyConstructor } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { ExecutionContextApi } from '../../../api/execution-context';
import {
  installStore,
  type Doc,
} from '../../persistence/__tests__/backend-store';
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
  const proxy = ProxyApi.wrap(
    raw,
    MixinApi.getWeakRefFields(raw.constructor as AnyConstructor)
  );
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

/**
 * Stamp a Stuff's `templatePath` from test code. The slot is
 * hard-private (`Stuff.#templatePath`) since the ref-shapes
 * lockdown; the only writers are `Stuff.setTemplatePath`
 * (ApiOnly-gated) and `Stuff._stampTemplatePath` (caller-gated
 * — only `mud/api/stuff.ts`, this file, and `.test.ts` files
 * may invoke it). Test code uses this helper to stamp +
 * re-index without bracket-casting onto a non-existent field.
 *
 * Pass `register=true` to atomically unregister + re-register the
 * stuff so the `byTemplatePath` index picks it up. Pass `false`
 * when the stuff isn't yet registered (e.g., when stamping inside
 * a factory body before `makeStuff` runs).
 *
 * @internal
 */
export function stampTemplatePathForTest(
  stuff: Stuff,
  path: string,
  register = true
): void {
  if (register) {
    StuffApi.unregister(stuff);
  }
  StuffClass._stampTemplatePath(stuff, path);
  if (register) {
    StuffApi.register(stuff);
  }
}

/**
 * Stamp a minted instance IDENTITY (the D17 `asIdentityPath` axis) on a
 * test Stuff — the registry index keys on `identity ?? templatePath`,
 * so re-registering files the stuff under the identity. The mirror of
 * `stampTemplatePathForTest` for the identity slot.
 *
 * @internal
 */
export function stampIdentityPathForTest(
  stuff: Stuff,
  path: string,
  register = true
): void {
  if (register) {
    StuffApi.unregister(stuff);
  }
  StuffClass._stampIdentityPath(stuff, path);
  if (register) {
    StuffApi.register(stuff);
  }
}

/**
 * Make a Stuff and stamp its `templatePath` before registering, so
 * the `byTemplatePath` index picks it up on the initial register
 * pass. Equivalent to `makeStuff` plus an inline stamp.
 *
 * @internal
 */
/**
 * Register a Stuff at `path`.
 *
 * ⭐ `identityPath` models the D17 split — a **shared template row plus a
 * minted per-instance identity**, which is what a player Avatar actually
 * is. Pass it whenever the fixture stands in for something whose
 * identity is not its lineage; leaving it off makes a fixture whose
 * identity path IS its template path, which is what an `Extra`, a
 * generic clone or an unnamed animal genuinely looks like.
 *
 * ⚠ The distinction became load-bearing when belief persistence started
 * demanding a **durable-unique** viewer key: a fixture that fakes an
 * Avatar by registering at an Avatar-shaped path is, structurally, a
 * generic clone, and now behaves like one.
 */
export function makeStuffAtPath<T extends Stuff>(
  factory: () => T,
  path: string,
  identityPath?: string
): T {
  const prevSentinel = StuffClass._beginConstruction();
  let raw: T;
  try {
    raw = factory();
  } finally {
    StuffClass._endConstruction(prevSentinel);
  }
  const proxy = ProxyApi.wrap(
    raw,
    MixinApi.getWeakRefFields(raw.constructor as AnyConstructor)
  );
  StuffClass._stampTemplatePath(proxy, path);
  if (identityPath) StuffClass._stampIdentityPath(proxy, identityPath);
  StuffApi.register(proxy);
  return proxy;
}

/**
 * The async twin of {@link makeStuffAtPath}: registers AND runs
 * `postRegister`, which is what a real clone does.
 *
 * ⭐ Needed since a `Boundary` mints its two anchors there (they are
 * clones of `/platform/thing/BoundaryAnchor` now). A `Door` built with
 * the sync helper has no anchor pair and cannot be installed — which is
 * the honest consequence, not a test bug: nothing in the world is built
 * that way any more.
 */
export async function makeStuffAtPathAsync<T extends Stuff>(
  factory: () => T,
  path: string,
  identityPath?: string,
): Promise<T> {
  const stuff = makeStuffAtPath(factory, path, identityPath);
  const hook = stuff as unknown as {
    postRegister?: (context?: unknown) => Promise<void> | void;
  };
  if (typeof hook.postRegister === 'function') await hook.postRegister();
  return stuff;
}

/**
 * Register a marshaller singleton at its templatePath so
 * `StuffApi.findByTemplatePath` resolves it. Tests that exercise
 * marshaller-bound fields/props must call this once per marshaller
 * before the first save / hydrate / setProp on a marshalled value.
 *
 * @internal
 */
export function registerMarshallerForTest<T extends Stuff>(
  factory: () => T,
  templatePath: string
): T {
  return makeStuffAtPath(factory, templatePath);
}

/**
 * Install an in-memory store holding the kernel rows plus `extra` — the
 * one-liner a suite that builds exits or boundaries puts in its
 * `beforeEach`.
 *
 * ⭐ It DELEGATES to `installStore`, the collection-aware stub every
 * standup test already uses, rather than carrying a second one. The
 * first cut was a content-only fake, and the sandbox round-trip went
 * red reading back a bank ledger it had just written: a stub that
 * replaces the store has to answer for every collection, not the one
 * the author was thinking about.
 *
 * Returns the live store array, so a suite can push more rows later.
 */
export function seedKernelContentStore(
  extra: ReadonlyArray<Record<string, unknown>> = [],
): Array<Record<string, unknown>> {
  return installStore(extra as unknown as Doc[]);
}

/**
 * ⭐ The kernel rows any suite that MINTS AN EXIT or a BOUNDARY needs in
 * its in-memory content store — re-exported from `test-bootstrap`,
 * which is where the platform declares them.
 */
export { KERNEL_CONTENT_ROWS as EXIT_KIND_TEST_ROWS } from '../../../../test-bootstrap';

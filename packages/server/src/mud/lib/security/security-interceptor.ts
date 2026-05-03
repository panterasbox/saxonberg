/**
 * Security interceptor — the call-security framework's plug-in into
 * `ProxyApi`. Registered at module-import time; runs first in the
 * interceptor pipeline so security gating happens before any other
 * cross-cutting concern.
 *
 * Responsibilities (in order, per dispatch):
 *
 *   (a) Honour `ShadowApi`'s bypass marker — `Shadow.callBypass()`
 *       and `callDown()` at the bottom of the chain set it to mean
 *       "this single onward read/invocation should run raw,
 *       skipping every check below."
 *   1.  Destroyed-object guard. `isDestroyed` and `toString` exempt.
 *   2.  Resolve and run the entry policy via `SecurityApi`. The
 *       caller is the previous frame's target (the spec's
 *       "caller = previous target" invariant).
 *   3.  If shadows are attached for this method, dispatch through
 *       them with per-shadow CallFrames. Each shadow runs as its
 *       own target so onward calls show the shadow's identity, not
 *       the host's.
 *   4.  No shadows → push the host's frame and call `next()`, which
 *       runs the raw operation (the descriptor's value for methods,
 *       the descriptor's getter for accessors).
 *
 * Importing this module has the side-effect of registering the
 * interceptor with `ProxyApi`. `mud/api/stuff.ts` imports it for
 * exactly that reason — `StuffApi.create` and `clone` both need the
 * security interceptor in place before the first `ProxyApi.wrap`.
 */

import {
  ProxyApi,
  type Interceptor,
  type InterceptionContext,
} from '../../api/proxy';
import { ExecutionContextApi } from '../../api/execution-context';
import { SecurityApi } from '../../api/security';
import { ShadowApi } from '../../api/shadow';
import { DestroyedObjectError, SecurityError } from './errors';

const securityInterceptor: Interceptor = (
  ctx: InterceptionContext,
  next: () => unknown
): unknown => {
  // (a) bypass marker — single-shot, consumed atomically.
  if (ShadowApi._consumeBypass()) {
    return next();
  }

  // 1. destroyed-object guard
  if (
    ctx.prop !== 'isDestroyed' &&
    ctx.prop !== 'toString' &&
    ctx.target.isDestroyed()
  ) {
    throw new DestroyedObjectError(ctx.target.stuffId, ctx.prop);
  }

  // 2. entry policy. Caller = previous target; falls back to null
  // at the root.
  const policy = SecurityApi.resolveCallPolicy(ctx.target, ctx.prop);
  const caller = ExecutionContextApi.getCurrentTarget();
  if (!policy.allows(caller, ctx.proxy, ctx.prop)) {
    throw new SecurityError(
      `Policy ${policy.name} denied ${ctx.prop}() on Stuff ${ctx.target.stuffId}`,
      {
        stuffId: ctx.target.stuffId,
        methodName: ctx.prop,
        policyName: policy.name,
      }
    );
  }

  // 3. shadow dispatch. Lookup keyed by proxyRef — `ShadowApi.attach`
  // stored the proxy, so lookup must use the same identity. When
  // shadows fire, the chain is a complete replacement for the raw
  // call — we don't call next() in this branch.
  const shadows = ShadowApi._shadowsFor(ctx.proxy, ctx.prop);
  if (shadows && shadows.length > 0) {
    return ShadowApi._withDispatch(
      ctx.proxy,
      ctx.prop,
      shadows,
      ctx.args as unknown[],
      () => {
        const top = shadows[shadows.length - 1]!;
        return ExecutionContextApi.run(
          caller,
          top,
          ctx.prop,
          undefined,
          () =>
            ShadowApi._invokeOnShadow(
              top,
              ctx.prop,
              ctx.isGetter ? [] : (ctx.args as unknown[])
            )
        );
      }
    );
  }

  // 4. no shadows — push the host's frame and continue the pipeline.
  // `next()` runs the raw operation (or the next interceptor, when
  // future interceptors are registered).
  return ExecutionContextApi.run(
    caller,
    ctx.proxy,
    ctx.prop,
    undefined,
    () => next()
  );
};

ProxyApi.registerInterceptor(securityInterceptor);

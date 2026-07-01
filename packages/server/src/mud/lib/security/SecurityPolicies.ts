/**
 * SecurityPolicies — built-in policy catalogue for the call-security framework.
 *
 * A policy answers `allows(caller, target, method)` against the current
 * execution context. The Proxy resolves the policy attached to the called
 * method (per-method, then class-level fallback, then framework Public
 * default) and runs it before invoking the body.
 *
 * v1 catalogue: Public, SystemRoot, ApiOnly (stub in Stage 1, real in
 * Stage 2), SelfOnly, Custom, FromTemplate, FromModule (Stage 2), and the
 * AllOf / AnyOf / Not combinators. Avatar-aware policies (Admin,
 * ByCommandGiver, ByActingAvatar, ByResponsibleAvatar) are deferred — no
 * v1 consumer needs them.
 *
 * The SecurityPolicy interface lives alongside the catalogue because there
 * is no other consumer worth extracting it through a separate types file.
 */

import { ExecutionContextApi } from '../../api/execution-context';
import { ModuleApi } from '../../api/module';
import { PathPatternApi } from '../../api/path-pattern';

/**
 * One policy. `allows()` returns `true` to permit the call, `false` to
 * deny it. `name` is used in audit logs and error messages.
 *
 * `allows` may return a `boolean` synchronously or a `Promise<boolean>`
 * for policies that need an async lookup (group membership, zone
 * inheritance walk, etc.). The security gate detects the shape and
 * only takes the async branch when a Promise is returned; existing
 * sync policies continue to run sync through the gate.
 */
export interface SecurityPolicy {
  readonly name: string;
  allows(
    caller: unknown | null,
    target: unknown | null,
    method: string,
  ): boolean | Promise<boolean>;
}

/**
 * Public — anyone can call. Used as the framework default when no
 * decorator is present.
 */
const PublicPolicy: SecurityPolicy = {
  name: 'Public',
  allows: () => true,
};

/**
 * SystemRoot — only the synthetic root frame can call. Useful for ops
 * that should only run from `Backend → Application` boundary code.
 */
const SystemRootPolicy: SecurityPolicy = {
  name: 'SystemRoot',
  allows: (caller) => caller === null,
};

/**
 * SelfOnly — only the target can call itself. The frame's caller must
 * be reference-identical to the target.
 */
const SelfOnlyPolicy: SecurityPolicy = {
  name: 'SelfOnly',
  allows: (caller, target) => caller !== null && caller === target,
};

/**
 * Resolve a caller's "caller path" string used by identity-keyed
 * policies. Order:
 *   1. If the caller is a `Stuff` proxy with a `templatePath`, use it.
 *   2. If the caller is (or carries) a class with a stamped module ID,
 *      use the module ID.
 * Returns `null` if neither is present — identity-keyed policies fail
 * closed (deny) when this returns null.
 */
function resolveCallerPath(caller: unknown | null): string | null {
  if (caller === null || caller === undefined) return null;
  // (1) Template path — set at clone time on the Stuff instance.
  // Read via `getTemplatePath()` since the slot is hard-private
  // (Stuff.#templatePath) post-lockdown; the method unwraps RAW_TARGET
  // internally. The try/catch handles the rare reflection-test case
  // where `caller` carries Stuff's prototype but wasn't constructed
  // via the Stuff constructor (e.g., `Object.create(Sub.prototype)`)
  // — the `#templatePath` slot doesn't exist on such objects and a
  // direct read throws "Cannot read private member."
  if (typeof caller === 'object') {
    const obj = caller as {
      getTemplatePath?: () => string | null;
      constructor?: object;
    };
    if (typeof obj.getTemplatePath === 'function') {
      try {
        const path = obj.getTemplatePath();
        if (typeof path === 'string' && path.length > 0) return path;
      } catch {
        // Fall through to constructor-based lookup.
      }
    }
    // (2a) Caller is an instance — look up its class.
    if (obj.constructor) {
      const id = ModuleApi.lookup(obj.constructor as object);
      if (id) return id;
    }
  }
  // (2b) Caller is a class itself (static-method synthesised frame).
  if (typeof caller === 'function') {
    const id = ModuleApi.lookup(caller as object);
    if (id) return id;
  }
  return null;
}

/**
 * `FromTemplate(glob)` — caller's CMS template path matches `glob`.
 *
 * Useful for "anything cloned from /domain/narnia/**" rules.
 */
function FromTemplate(glob: string): SecurityPolicy {
  return {
    name: `FromTemplate(${glob})`,
    allows(caller) {
      const path = resolveCallerPath(caller);
      if (path === null) return false;
      // Template paths begin with '/' by convention; module IDs don't.
      // Reject module IDs at this gate — FromTemplate is template-only.
      if (!path.startsWith('/')) return false;
      return PathPatternApi.matches(path, glob);
    },
  };
}

/**
 * `FromModule(glob, opts)` — caller's stamped module ID matches `glob`.
 *
 * Module IDs have the form `<mud-relative-path>#<exportName>` (or
 * bare `<path>` for default exports) — rooted at `mud/`, so a module ID
 * lines up segment-for-segment with the template path it parallels,
 * differing only by the leading slash (`obj/command/X` vs
 * `/obj/command/X`). Examples:
 *   - `api/stuff#StuffApi`
 *   - `lib/spatial/Door#Door`
 *
 * Glob examples:
 *   - `'api/**'` matches every Api export under `api/` (src/mud/api/).
 *   - `'lib/spatial/Door#Door'` matches exactly Door.
 *   - `'domain/narnia/**'` matches every export under that
 *     subtree — useful for the "developers don't trust each other"
 *     story where a subsystem owner gates onward calls into their
 *     module's privileged surface.
 *
 * `opts.includeSubclasses` (default: `false`) walks the caller's
 * prototype chain looking for ANY ancestor whose module ID matches.
 * Set this for "this class and any subclass" rules.
 */
function FromModule(
  glob: string,
  opts: { includeSubclasses?: boolean } = {}
): SecurityPolicy {
  return {
    name: `FromModule(${glob})`,
    allows(caller) {
      if (caller === null || caller === undefined) return false;
      // Direct match against the immediate caller's identity.
      const path = resolveCallerPath(caller);
      if (path !== null && !path.startsWith('/')) {
        if (PathPatternApi.matches(path, glob)) return true;
      }
      if (!opts.includeSubclasses) return false;
      // Walk the prototype chain: each ancestor class might be the
      // one that lives at the matched module.
      let proto: unknown =
        typeof caller === 'function'
          ? Object.getPrototypeOf(caller)
          : Object.getPrototypeOf(
              (caller as { constructor?: unknown }).constructor ?? caller
            );
      while (proto && proto !== Function.prototype && proto !== Object.prototype) {
        const id = ModuleApi.lookup(proto as object);
        if (id && PathPatternApi.matches(id, glob)) return true;
        proto = Object.getPrototypeOf(proto);
      }
      return false;
    },
  };
}

/**
 * `ApiOnly` — the Api tier: callers under `api/**` plus the Api's
 * hot-reloadable logic singletons under `obj/api/**`.
 *
 * Stage 1 shipped a forgeable constructor-name stub; Stage 2 replaced
 * it with the real loader-stamped module-id matcher. The
 * surface-architecture refactor moved each Api's *guts* into a stateless
 * `Stuff` logic singleton at `obj/api/<Foo>Logic` (the `FooApi`
 * statics forward to it). Those singletons ARE the Api implementation,
 * so they must retain Api-tier calling privileges — e.g. `split` calls
 * the `ApiOnly`-gated `ContainmentApi.placeDirect`. `obj/api/`
 * contains nothing BUT those logic singletons, so admitting it widens
 * the gate to exactly the Api tier and never to content. This only
 * *adds* admitted callers, so every prior allow/deny decision for
 * non-logic callers is unchanged.
 *
 * The logic singletons are registered `Stuff` at `/obj/api/<feature>`,
 * so a caller frame resolves to that *template path* (not the module
 * id) — hence the `/obj/api/**` arm uses `FromTemplate`, not
 * `FromModule`.
 */
const ApiOnlyPolicy: SecurityPolicy = (() => {
  const fm = FromModule('api/**', { includeSubclasses: true });
  const fmLogic = FromTemplate('/obj/api/**');
  return {
    name: 'ApiOnly',
    allows: (caller, target, method) =>
      fm.allows(caller, target, method) ||
      fmLogic.allows(caller, target, method),
  };
})();

/**
 * `FromController(...controllers)` — sugar over `FromModule` keyed by
 * the controller class's stamped module id. Implements the
 * **narrow-entry pattern**: a privileged Api method gets restricted
 * to one (or a few) verb controllers, and the verb controller does
 * the resource-targeted access check before invoking. Combined, the
 * mutation has exactly one legitimate entry path AND that path
 * enforces who is authorized.
 *
 * `FromController(C)` resolves `C`'s module id eagerly when possible
 * and falls back to a lazy lookup if `C` hasn't been stamped yet at
 * decorator-evaluation time — `ModuleApi.lookup(C)` is consulted at
 * call time, fail-closed if still unstamped.
 *
 * For multiple controllers, returns an `AnyOf(...)` union.
 *
 * Sample usage:
 *   `@CallSecurity(FromController(DestructController))`
 *   `@CallSecurity(FromController(TeleportController, GotoController))`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControllerClass = abstract new (...args: any[]) => unknown;

function FromController(...controllers: ControllerClass[]): SecurityPolicy {
  if (controllers.length === 0) {
    throw new Error('FromController: at least one controller required');
  }
  if (controllers.length === 1) {
    return lazyFromModulePolicy(controllers[0]!);
  }
  return AnyOf(...controllers.map((c) => lazyFromModulePolicy(c)));
}

/**
 * Build a FromModule policy that resolves the controller class's
 * module id at call time. This handles the cyclic-import edge case
 * where the controller class isn't stamped yet at decorator-
 * evaluation time — the module-id lookup deferred until the gate
 * actually fires gives the rest of module evaluation a chance to
 * complete.
 */
function lazyFromModulePolicy(cls: ControllerClass): SecurityPolicy {
  return {
    name: `FromController(${(cls as { name?: string }).name ?? '<class>'})`,
    allows(caller, target, method) {
      const id = ModuleApi.lookup(cls as object);
      if (!id) return false;
      return FromModule(id).allows(caller, target, method);
    },
  };
}

/**
 * Combinators — compose policies into richer rules.
 */

function AllOf(...policies: SecurityPolicy[]): SecurityPolicy {
  const policyNames = policies.map((p) => p.name).join(' & ');
  return {
    name: `AllOf(${policyNames})`,
    allows(caller, target, method) {
      const results = policies.map((p) => p.allows(caller, target, method));
      if (results.some((r) => r instanceof Promise)) {
        return (async () => {
          for (const r of results) {
            if (!(await r)) return false;
          }
          return true;
        })();
      }
      return (results as boolean[]).every(Boolean);
    },
  };
}

function AnyOf(...policies: SecurityPolicy[]): SecurityPolicy {
  const policyNames = policies.map((p) => p.name).join(' | ');
  return {
    name: `AnyOf(${policyNames})`,
    allows(caller, target, method) {
      const results = policies.map((p) => p.allows(caller, target, method));
      if (results.some((r) => r instanceof Promise)) {
        return (async () => {
          for (const r of results) {
            if (await r) return true;
          }
          return false;
        })();
      }
      return (results as boolean[]).some(Boolean);
    },
  };
}

function Not(policy: SecurityPolicy): SecurityPolicy {
  return {
    name: `Not(${policy.name})`,
    allows(caller, target, method) {
      const r = policy.allows(caller, target, method);
      if (r instanceof Promise) return r.then((v) => !v);
      return !r;
    },
  };
}

/**
 * Custom — wrap an arbitrary predicate. Predicates may consult the
 * current `ExecutionContext` directly via the imported singleton.
 */
function Custom(
  pred: (
    caller: unknown | null,
    target: unknown | null,
    method: string,
  ) => boolean | Promise<boolean>,
  name = 'Custom'
): SecurityPolicy {
  return {
    name,
    allows: pred,
  };
}

/**
 * Static-class style namespace (matches the codebase's preference for
 * static utility classes — see StuffApi, MixinApi, etc.).
 *
 * Some entries are bare singletons (Public, SystemRoot, SelfOnly,
 * ApiOnly), others are constructor functions (Custom, AllOf, AnyOf,
 * Not, FromTemplate, FromModule). The `allows()` shape is uniform so
 * they're interchangeable from the policy resolver's perspective.
 */
export const SecurityPolicies = {
  Public: PublicPolicy,
  SystemRoot: SystemRootPolicy,
  SelfOnly: SelfOnlyPolicy,
  ApiOnly: ApiOnlyPolicy,
  Custom,
  AllOf,
  AnyOf,
  Not,
  FromTemplate,
  FromModule,
  FromController,
} as const;

export { FromController };

// Re-export ExecutionContext so consumers that pull SecurityPolicies in
// can also reach `ExecutionContextApi.getCallStack()` from the same import.
export { ExecutionContextApi };

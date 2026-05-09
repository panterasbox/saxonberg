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
 */
export interface SecurityPolicy {
  readonly name: string;
  allows(caller: unknown | null, target: unknown | null, method: string): boolean;
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
  // Read defensively: the proxy may strip the field, so try both
  // direct and via `getTemplatePath()` if it exists.
  if (typeof caller === 'object') {
    const obj = caller as { templatePath?: unknown; constructor?: object };
    if (typeof obj.templatePath === 'string' && obj.templatePath.length > 0) {
      return obj.templatePath;
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
 * Module IDs have the form `<source-relative-path>#<exportName>` (or
 * bare `<path>` for default exports). Examples:
 *   - `mud/api/stuff#StuffApi`
 *   - `mud/lib/spatial/Door#Door`
 *
 * Glob examples:
 *   - `'mud/api/**'` matches every Api export under `mud/api/`.
 *   - `'mud/lib/spatial/Door#Door'` matches exactly Door.
 *   - `'mud/domain/narnia/**'` matches every export under that
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
 * `ApiOnly` — sugar for `FromModule('mud/api/**', { includeSubclasses: true })`.
 *
 * Stage 1 shipped a forgeable constructor-name stub; Stage 2 replaces
 * it with the real loader-stamped module-id matcher. Same name, same
 * call sites — the upgrade is invisible to existing decorators on
 * `Stuff.destroy()` and friends.
 */
const ApiOnlyPolicy: SecurityPolicy = (() => {
  const fm = FromModule('mud/api/**', { includeSubclasses: true });
  return {
    name: 'ApiOnly',
    allows: fm.allows.bind(fm),
  };
})();

/**
 * `AdminOnly` — gate for force-bypass entry points (`StuffApi.forceDestruct`,
 * `StuffApi.forceClone`, `HotReloadApi.forceReload`,
 * `ContainmentApi.forceMove`).
 *
 * v1 implementation is **always-deny**. The seam is in place so
 * `forceX` API methods compile, decorate, and invoke with the
 * intended security shape; the actual "is this caller an admin?"
 * answer comes from the permission framework once it lands. Until
 * then every call into a `forceX` method throws
 * `SecurityError: admin privilege required` from the decorator gate
 * before the body runs.
 *
 * Replacing this stub with the real policy is a single edit here —
 * no decorated method needs to change.
 */
const AdminOnlyPolicy: SecurityPolicy = {
  name: 'AdminOnly',
  allows: () => false,
};

/**
 * Combinators — compose policies into richer rules.
 */

function AllOf(...policies: SecurityPolicy[]): SecurityPolicy {
  const policyNames = policies.map((p) => p.name).join(' & ');
  return {
    name: `AllOf(${policyNames})`,
    allows(caller, target, method) {
      return policies.every((p) => p.allows(caller, target, method));
    },
  };
}

function AnyOf(...policies: SecurityPolicy[]): SecurityPolicy {
  const policyNames = policies.map((p) => p.name).join(' | ');
  return {
    name: `AnyOf(${policyNames})`,
    allows(caller, target, method) {
      return policies.some((p) => p.allows(caller, target, method));
    },
  };
}

function Not(policy: SecurityPolicy): SecurityPolicy {
  return {
    name: `Not(${policy.name})`,
    allows(caller, target, method) {
      return !policy.allows(caller, target, method);
    },
  };
}

/**
 * Custom — wrap an arbitrary predicate. Predicates may consult the
 * current `ExecutionContext` directly via the imported singleton.
 */
function Custom(
  pred: (caller: unknown | null, target: unknown | null, method: string) => boolean,
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
  AdminOnly: AdminOnlyPolicy,
  Custom,
  AllOf,
  AnyOf,
  Not,
  FromTemplate,
  FromModule,
} as const;

// Re-export ExecutionContext so consumers that pull SecurityPolicies in
// can also reach `ExecutionContextApi.getCallStack()` from the same import.
export { ExecutionContextApi };

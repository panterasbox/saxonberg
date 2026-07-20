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
    args?: readonly unknown[],
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
 * The two identity-keyed policies each resolve a **different** identity
 * of the caller, and match it against a `/`-absolute glob:
 *
 *   - `FromTemplate` → the caller's clone-instance **template path**
 *     (`resolveTemplatePath`) — trust by clone lineage.
 *   - `FromModule` → the caller's class **module id**
 *     (`resolveModuleId`) — trust by code provenance.
 *
 * Both identities are absolute and slash-shaped now (a module id is
 * `/obj/command/X`, a template path is `/obj/command/X`), so a caller
 * that is a *cloned* Stuff carries BOTH — its clone lineage AND the
 * provenance of its class. Keeping the resolvers separate is what lets
 * the two policies mean different things (a class cloned into a foreign
 * template matches `FromModule` by its code but not `FromTemplate` by
 * its lineage) while sharing one path shape.
 */

/**
 * The caller's clone-instance template path, or `null` for a caller that
 * isn't a cloned Stuff. Read via `getTemplatePath()` since the slot is
 * hard-private (`Stuff.#templatePath`); the method unwraps RAW_TARGET
 * internally. The try/catch handles the rare reflection-test case where
 * `caller` carries Stuff's prototype but wasn't constructed via the Stuff
 * constructor (`Object.create(Sub.prototype)`) — the private slot doesn't
 * exist and a direct read throws.
 */
function resolveTemplatePath(caller: unknown | null): string | null {
  if (caller === null || typeof caller !== 'object') return null;
  const obj = caller as { getTemplatePath?: () => string | null };
  if (typeof obj.getTemplatePath === 'function') {
    try {
      const path = obj.getTemplatePath();
      if (typeof path === 'string' && path.length > 0) return path;
    } catch {
      // Not a genuinely-constructed Stuff; no template identity.
    }
  }
  return null;
}

/**
 * The caller's class module id (code provenance), or `null` if unstamped.
 * An *instance* resolves via its `constructor`; a class value resolves
 * directly. Independent of whether the caller also has a template path —
 * a cloned Stuff still answers here with the module id of its class,
 * which is what fixes the narrow-entry-controller gates (a cloned
 * controller is admitted by `FromModule` via its class, not just by
 * `FromTemplate` via its clone path).
 */
function resolveModuleId(caller: unknown | null): string | null {
  if (caller === null || caller === undefined) return null;
  if (typeof caller === 'object') {
    const ctor = (caller as { constructor?: object }).constructor;
    if (ctor) {
      const id = ModuleApi.lookup(ctor);
      if (id) return id;
    }
  }
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
      // Clone lineage only — the caller's instance template path. A
      // caller that isn't a cloned Stuff (an Api class, a bare value
      // object) has no template identity and fails closed here.
      const path = resolveTemplatePath(caller);
      return path !== null && PathPatternApi.matches(path, glob);
    },
  };
}

/**
 * `FromModule(glob, opts)` — the caller's class **module id** matches
 * `glob`. This is trust by *code provenance*: it answers "what source
 * module is this caller's class from?", independent of whether the
 * caller is also a cloned Stuff (a cloned controller is admitted here by
 * its class, which is what makes it the right gate for the narrow-entry
 * controllers — no `FromTemplate` arm needed).
 *
 * Module IDs are `/`-absolute, `mud`-rooted, `<path>#<exportName>` (or
 * bare `<path>` for a default export) — the same shape as the template
 * path they parallel. Examples:
 *   - `/api/stuff#StuffApi`
 *   - `/lib/spatial/Door#Door`
 *
 * Glob examples:
 *   - `'/api/**'` matches every Api export under `api/` (src/mud/api/).
 *   - `'/lib/spatial/Door#Door'` matches exactly Door.
 *   - `'/domain/narnia/**'` matches every export under that subtree —
 *     the "developers don't trust each other" story where a subsystem
 *     owner gates onward calls into their module's privileged surface.
 *
 * A glob may also be written **relative** (`'./Sibling'`, `'../peer/**'`)
 * — resolved to the absolute form at load time by the loader transform
 * (`resolveRelativeModuleGates`), relative to the *declaring file's*
 * module directory. Useful for intra-subsystem "only my siblings/subtree
 * may call this" gates that survive a directory move. Only `FromModule`
 * takes relative globs (`FromTemplate` is clone lineage, not
 * file-relative); by the time a glob reaches this policy it is always
 * absolute.
 *
 * `opts.includeSubclasses` (default: `false`) walks the caller's class
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
      // Direct match against the caller's own class module id.
      const id = resolveModuleId(caller);
      if (id !== null && PathPatternApi.matches(id, glob)) return true;
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
        const pid = ModuleApi.lookup(proto as object);
        if (pid && PathPatternApi.matches(pid, glob)) return true;
        proto = Object.getPrototypeOf(proto);
      }
      return false;
    },
  };
}

/**
 * The **participant policies** — `FromClass` / `FromMixin` — express a
 * contract in terms of *which Stuff is on the other end of this call*,
 * not which source module the code came from. They are the preferred
 * gate for object-owned surfaces (a member's party pointer is set by
 * *the Party admitting it*; an employment record is written by *the
 * Business employing you*): the identity half answers "what kind of
 * Stuff is calling", and the optional `where` half answers "is that
 * instance actually in the right relationship to me, for these
 * arguments". A future trust-layer expansion (ownership / authorship /
 * group membership via async lookups) slots in as sibling policies with
 * the same shape — `allows` is already async-capable.
 */

/**
 * Relational predicate for participant policies. Receives the same
 * caller/target/method as `allows`, plus the **call arguments** — so a
 * contract can validate not just who is calling but what they're asking
 * for ("a Party may only set my pointer *to itself*"). `args` is empty
 * for getter reads.
 */
export type ParticipantWhere = (
  caller: unknown,
  target: unknown | null,
  method: string,
  args: readonly unknown[],
) => boolean | Promise<boolean>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParticipantClass = abstract new (...args: any[]) => unknown;

/**
 * `FromClass(() => Party, opts?)` — the caller is an **instance of the
 * given class** (subclasses included, ordinary `instanceof` semantics).
 *
 * The class is supplied as a thunk so a mixin/value module can gate
 * against a class it has an import cycle with — the thunk resolves at
 * call time, fail-closed if it throws (TDZ during module evaluation).
 *
 * HMR note: after a hot reload the *new* class object is a different
 * identity, so `instanceof` against the captured binding would deny
 * fresh instances. The policy therefore falls back to comparing
 * **module ids** along the caller's class chain against the thunked
 * class's module id — the same stable identity `FromModule` trusts.
 *
 * `opts.where` adds the relational half of the contract (see
 * {@link ParticipantWhere}).
 */
function FromClass(
  clsThunk: () => ParticipantClass,
  opts: { where?: ParticipantWhere } = {}
): SecurityPolicy {
  return {
    get name() {
      try {
        return `FromClass(${clsThunk().name || '<class>'})`;
      } catch {
        return 'FromClass(<unresolved>)';
      }
    },
    allows(caller, target, method, args) {
      if (caller === null || typeof caller !== 'object') return false;
      let cls: ParticipantClass;
      try {
        cls = clsThunk();
      } catch {
        return false; // thunk unresolvable (import cycle mid-eval) — fail closed
      }
      let match = caller instanceof cls;
      if (!match) {
        // Cross-reload fallback: match by the stable module-id identity.
        const clsId = ModuleApi.lookup(cls);
        if (clsId !== null) {
          let walker: unknown = (caller as { constructor?: unknown })
            .constructor;
          while (
            typeof walker === 'function' &&
            walker !== Function.prototype
          ) {
            if (ModuleApi.lookup(walker as object) === clsId) {
              match = true;
              break;
            }
            walker = Object.getPrototypeOf(walker);
          }
        }
      }
      if (!match) return false;
      if (!opts.where) return true;
      return opts.where(caller, target, method, args ?? []);
    },
  };
}

/**
 * `FromMixin(Mixins.Business, opts?)` — the caller **composes the named
 * mixin**. Checked by walking the caller's class chain for the
 * `_mixinName` static marker, so it is a pure string identity —
 * inherently HMR-stable and import-cycle-free (no class value needed).
 *
 * The check is class composition only — mixins granted through an
 * attached Shadow do not confer *caller* privilege (a runtime buff
 * should not widen what its host may call).
 *
 * `opts.where` adds the relational half of the contract (see
 * {@link ParticipantWhere}).
 */
function FromMixin(
  mixinName: string,
  opts: { where?: ParticipantWhere } = {}
): SecurityPolicy {
  return {
    name: `FromMixin(${mixinName})`,
    allows(caller, target, method, args) {
      if (caller === null || typeof caller !== 'object') return false;
      let walker: unknown = (caller as { constructor?: unknown }).constructor;
      let match = false;
      while (typeof walker === 'function' && walker !== Function.prototype) {
        if (
          Object.hasOwn(walker, '_mixinName') &&
          (walker as { _mixinName?: string })._mixinName === mixinName
        ) {
          match = true;
          break;
        }
        walker = Object.getPrototypeOf(walker);
      }
      if (!match) return false;
      if (!opts.where) return true;
      return opts.where(caller, target, method, args ?? []);
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
  const fm = FromModule('/api/**', { includeSubclasses: true });
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
    allows(caller, target, method, args) {
      const results = policies.map((p) =>
        p.allows(caller, target, method, args)
      );
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
    allows(caller, target, method, args) {
      const results = policies.map((p) =>
        p.allows(caller, target, method, args)
      );
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
    allows(caller, target, method, args) {
      const r = policy.allows(caller, target, method, args);
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
    args?: readonly unknown[],
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
  FromClass,
  FromMixin,
  FromController,
} as const;

export { FromController };

// Re-export ExecutionContext so consumers that pull SecurityPolicies in
// can also reach `ExecutionContextApi.getCallStack()` from the same import.
export { ExecutionContextApi };

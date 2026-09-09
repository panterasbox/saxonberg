/**
 * MqlApi — MUD Query Language for object resolution.
 *
 * The thin public facade in front of the `mql/` pipeline. Two entry
 * points reflect caller intent:
 *
 *   - {@link resolveOne} — one-of-N intent. Returns the highest-scored
 *     match (or null) wrapped in {@link MqlOne}, with optional
 *     sub-feature attribution. The future auto-disambiguation hook
 *     (UI prompt when several candidates score equally) will layer
 *     onto this code path additively.
 *   - {@link resolveMany} — multi intent. Returns the full match list
 *     in {@link MqlMany}; never disambiguated.
 *
 * Both delegate to the same internal pipeline (`mql/resolver.ts`); the
 * difference is only in how the match list is wrapped.
 *
 * Internal `mql/` modules are pipeline stages, not Apis — they're not
 * security-decorated. The class below is the security-decorated entry
 * point; controllers and the dispatcher reach this surface only.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MqlLogic } from '../platform/idea/api/MqlLogic';
import { fileURLToPath } from 'url';

import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { ExecutionContextApi } from './execution-context';
import type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlManyResult,
  MqlOne,
  MqlMany,
  MqlQuantity,
  RegistryScan,
  RegistryReadStat,
} from './mql/types';

export type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlManyResult,
  MqlOne,
  MqlMany,
  MqlQuantity,
  RegistryScan,
  RegistryReadStat,
};

// Symbols the non-api layer consumes flow through this facade so the
// `MqlApi` boundary stays the seam: `PronounMemory` (a `FocusedMixin`
// holds an instance per giver), the `GenderedSlot` type (referenced by
// the command layer), and `MqlPermissionError` (thrown across the
// subscription substrate). Internal `mql/` modules import their own
// siblings directly; nothing else reaches into `mql/`.
export { PronounMemory } from './mql/pronoun-memory';
export type { GenderedSlot } from './mql/pronoun-memory';
export { MqlPermissionError } from './mql/types';

/**
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link MqlLogic} singleton at `/platform/idea/api/mql`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /platform/idea/api/mql`
 * reloads it.
 */
const LOGIC_PATH = '/platform/idea/api/mql';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/MqlLogic', import.meta.url)
);

/** Resolve the HMR-able MqlLogic singleton (sync). */
function logic(): MqlLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MqlLogic'
      ) as typeof MqlLogic | null) ?? MqlLogic)()
  );
}

/**
 * ⭐⭐ **Who may read the whole registry, and from which function.**
 *
 * Declared here, beside the method it guards, so that widening the set
 * is a diff in one file rather than a decorator edit somewhere in the
 * subsystem that wanted the reach. Every entry is a
 * `(template, method)` pair: the object is trusted for ONE function,
 * because a logic singleton has dozens and only one of them needs this.
 *
 * ⚠ Every pair is resolved at build time by `lint:gates` — both halves,
 * including that the class really declares a public method of that name.
 * A mistyped method name would otherwise deny forever while looking
 * correct in this list, and a denied engine read reads as *"the world
 * has no banks"*.
 *
 * ⭐ The last entry is CONVENTION-shaped rather than a named pack: any
 * system pack's catalogue may take its one indexed read from a method
 * called `worldScan`, so a new system pack needs no kernel edit. It is
 * bounded by the index-answerable rule like everybody else.
 */
const RegistryWideReaders = SecurityPolicies.AnyOf(
  // The world's persistable singletons, once, cold, at shutdown.
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/persistable',
    'captureAtShutdown',
  ),
  // Storefront attention: the lease sweep and the disconnect drop.
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/attendant',
    'allPoints',
  ),
  // Where an institution actually has a branch (custodian validation).
  SecurityPolicies.FromTemplateMethod('/platform/idea/api/banking', 'branchOf'),
  // The labour market's three: the business roster, who works at one,
  // and finding an organization by what somebody typed.
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/employment',
    'allBusinesses',
  ),
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/employment',
    'employeesOf',
  ),
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/employment',
    'findOrganization',
  ),
  // Whether a principal holds any publishing position anywhere.
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/press',
    'holdsAnyPublishingPosition',
  ),
  // Items in circulation — the residency census, and the spawn sweep.
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/residency',
    'takeCensus',
  ),
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/residency',
    'spawnNow',
  ),
  // A plausible false name, borrowed from the identifiable population.
  SecurityPolicies.FromTemplateMethod(
    '/platform/idea/api/magic',
    'decoyNameFor',
  ),
  // ⚠ A GLOB: `resolveScreen` is a base-class method on
  // `CommandController`, so it lives on every controller template.
  SecurityPolicies.FromTemplateMethod(
    '/**/idea/cmd/**',
    'resolveScreen',
  ),
  // The convention rung: a system pack's catalogue, from `worldScan`.
  SecurityPolicies.FromTemplateMethod('/system/*/idea/*Catalogue', 'worldScan'),
);

/**
 * The seat arm's admitted caller: exactly the command binder's
 * `resolveModel`, which is where a player's raw MQL enters the engine.
 */
const SeatQueryCaller = SecurityPolicies.FromTemplateMethod(
  '/platform/idea/api/command',
  'resolveModel',
);

/**
 * The admitted caller's identity, for the cost table. Inside a static
 * Api body the top frame is this Api's own, so the caller's frame — the
 * one the policy just matched — is the one below it.
 */
function callingReader(): string {
  const stack = ExecutionContextApi.getCallStack();
  const frame = stack[stack.length - 2];
  if (!frame) return 'unknown';
  const target = frame.target as { getTemplatePath?: () => string | null };
  let path: string | null = null;
  try {
    path = typeof target?.getTemplatePath === 'function'
      ? target.getTemplatePath()
      : null;
  } catch {
    path = null;
  }
  return `${path ?? 'unknown'}#${frame.method}`;
}

export class MqlApi {
  /**
   * Resolve a query under one-of-N intent. Returns the highest-scored
   * match (or null when nothing matched), wrapped with any sub-feature
   * attribution describing how the resolver got there (an Exit, a detail
   * path, etc.).
   *
   * The dispatcher routes `type: object` YAML fields through this
   * surface. Direct callers wanting "first match wins" semantics also
   * use this.
   */
  static resolveOne(query: string, ctx: MqlContext): MqlOne {
    return logic().resolveOne(query, ctx);
  }

  /**
   * Resolve a query under multi intent. Returns the full match list
   * sorted by score (highest first), plus a query-level `via` when every
   * match arrived through the same sub-feature path; mixed paths produce
   * `via: undefined`.
   *
   * The dispatcher routes `type: objects` YAML fields through this
   * surface.
   */
  static resolveMany(query: string, ctx: MqlContext): MqlMany {
    return logic().resolveMany(query, ctx);
  }

  /**
   * ⭐⭐ **The engine's own registry-wide read.**
   *
   * `world` is refused everywhere else — for every player, on every
   * surface, including this one's own `resolveOne`/`resolveMany`. This
   * is the narrow door the realm's own bookkeeping comes through, and
   * the policy on it is the list of who may: a `(template, method)`
   * pair each, so a singleton is trusted for the one method that needs
   * the reach and not for the other thirty.
   *
   * ⚠ **Index-answerable shapes only**: `world` at the head followed
   * immediately by `[mixin.X]`. Anything else throws
   * `MqlPermissionError`, which is deliberate — an unindexed read that
   * grows with the realm is exactly what this build exists to stop, and
   * a caller wanting one is a caller who should be asking an owner a
   * keyed question instead.
   *
   * ⭐ Adding a pair here is a visible diff in one place, which is the
   * whole point of declaring the policy beside the method.
   */
  @CallSecurity(RegistryWideReaders)
  static resolveWorldIndexed(query: string, ctx: MqlContext): MqlMany {
    return logic().resolveWorldIndexed(query, ctx, callingReader());
  }

  /**
   * ⭐⭐ **The office holder's typed query**, and the only path by which
   * a person's input reads the whole realm.
   *
   * Admitted from exactly one function: the command binder, which is
   * where a player's raw MQL enters the engine and the one place the
   * seat can be checked against the person who typed it. Any `world`
   * shape resolves; the result carries `scan`, so the holder is told
   * what it cost.
   *
   * ⚠ "Permitted with a warning" is therefore a **method identity bound
   * to a policy**, never a flag on a context somebody could hand
   * themselves.
   */
  @CallSecurity(SeatQueryCaller)
  static resolveWorldForSeat(
    query: string,
    ctx: MqlContext,
  ): MqlMany & { scan?: RegistryScan } {
    return logic().resolveWorldForSeat(query, ctx);
  }

  /**
   * What each admitted registry reader has read this process — the
   * growth signal behind `/stats`.
   *
   * ⚠ Process-local and reset by a restart or an HMR reload; and
   * `maxReturned` is the column that matters, not `calls`.
   */
  static registryReadStats(): readonly RegistryReadStat[] {
    return logic().registryReadStats();
  }

  /**
   * Unwrap a YAML-bound field value into a flat `Stuff[]`. Accepts
   * `MqlOneResult` (single, possibly null), `MqlManyResult` (plural,
   * possibly empty), or a bare `Stuff` (legacy / structured-input path).
   * Returns `null` for anything else — a wrong-shape binding — so
   * validators can surface the right "must be an object" error.
   *
   * Empty MQL results (`stuff: null` / `stuff: []`) return `[]` rather
   * than `null` — empty is a normal outcome the controller decides
   * about, not a wrong-shape error.
   */
  static extractStuffs(value: unknown): Stuff[] | null {
    return logic().extractStuffs(value);
  }


  /**
   * Pick the effective target Stuff from a single-cardinality binding,
   * considering both the direct match and any door attached to a
   * `via.exit`. Returns the first Stuff (in that order) that satisfies
   * `predicate`, or `null` when neither does.
   *
   * The "direct first, door second" rule is what makes door-acting verbs
   * (`open`, `close`, future `knock` / `lock`) work uniformly across the
   * two ways MQL can land on a door: by keyword on the door itself
   * (`open oak`) or by direction through the location (`open north`).
   *
   * `predicate` is the standard `MixinApi.isX` shape — a type guard
   * returning `obj is Stuff & T`. The narrowing flows through the return
   * type, so callers don't need a follow-up cast.
   */
  static effectiveTarget<T extends object>(
    value: MqlOneResult,
    predicate: (s: Stuff) => s is Stuff & T
  ): (Stuff & T) | null {
    return logic().effectiveTarget(value, predicate);
  }
}

SecurityApi.decorateApiClass(MqlApi);

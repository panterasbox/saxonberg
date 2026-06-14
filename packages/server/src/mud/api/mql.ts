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
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { MqlLogic } from '../obj/api/MqlLogic';
import { fileURLToPath } from 'url';

import type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlManyResult,
  MqlOne,
  MqlMany,
  MqlQuantity,
} from './mql/types';

export type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlManyResult,
  MqlOne,
  MqlMany,
  MqlQuantity,
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
 * hot-reloadable {@link MqlLogic} singleton at `/obj/api/mql`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/mql`
 * reloads it.
 */
const LOGIC_PATH = '/obj/api/mql';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MqlLogic', import.meta.url)
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

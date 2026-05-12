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
import { resolveWithQuantity } from './mql/resolver';
import { SecurityApi } from './security';

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

// `PronounMemory` is the one mql/ class the non-api layer consumes
// — `FocusedMixin` holds an instance per giver. Internal mql/
// modules import their own siblings directly; everything else flows
// through this facade so the `MqlApi` boundary stays the seam.
export { PronounMemory } from './mql/pronoun-memory';

/**
 * MqlApi — static utility class for object resolution.
 *
 * Two public methods, both calling the same resolver pass:
 *
 *   - {@link resolveOne}: returns the top match wrapped (or null).
 *   - {@link resolveMany}: returns the full sorted list, plus a
 *     query-level `via` when every match arrived through the same
 *     sub-feature path.
 */
export class MqlApi {
  /**
   * Resolve a query under one-of-N intent. Returns the highest-scored
   * match (or null when nothing matched), wrapped with any
   * sub-feature attribution describing how the resolver got there
   * (an Exit, a detail path, etc.).
   *
   * The dispatcher routes `type: object` YAML fields through this
   * surface. Direct callers wanting "first match wins" semantics —
   * the controller-side equivalent of `cmd foo, cmd foo working
   * down the stack" — also use this.
   */
  static resolveOne(query: string, ctx: MqlContext): MqlOne {
    const { matches, quantity } = resolveWithQuantity(query, ctx);
    if (matches.length === 0) {
      const empty: MqlOne = { stuff: null };
      if (quantity) empty.quantity = quantity;
      return empty;
    }
    const top = matches[0]!;
    const out: MqlOne = { stuff: top.stuff };
    if (top.via) out.via = top.via;
    if (quantity) out.quantity = quantity;
    return out;
  }

  /**
   * Resolve a query under multi intent. Returns the full match list
   * sorted by score (highest first), plus a query-level `via` when
   * every match arrived through the same sub-feature path; mixed
   * paths produce `via: undefined`.
   *
   * The dispatcher routes `type: objects` YAML fields through this
   * surface.
   */
  static resolveMany(query: string, ctx: MqlContext): MqlMany {
    const { matches, quantity } = resolveWithQuantity(query, ctx);
    const stuff: Stuff[] = matches.map((m) => m.stuff);
    const via = consensusVia(matches);
    const out: MqlMany = { stuff };
    if (via) out.via = via;
    if (quantity) out.quantity = quantity;
    return out;
  }

  /**
   * Unwrap a YAML-bound field value into a flat `Stuff[]`. Accepts
   * `MqlOneResult` (single, possibly null), `MqlManyResult` (plural,
   * possibly empty), or a bare `Stuff` (legacy / structured-input
   * path). Returns `null` for anything else — a wrong-shape binding
   * (string, number, boolean, undefined, …) — so validators can
   * surface the right "must be an object" error.
   *
   * Empty MQL results (`stuff: null` / `stuff: []`) return `[]`
   * rather than `null` — empty is a normal outcome the controller
   * decides about, not a wrong-shape error. Validators that want
   * to skip empty bindings should check `length === 0`.
   *
   * The MqlApi is the natural home: the wrappers come out of this
   * pipeline, and validators ride on top of those wrappers.
   */
  static extractStuffs(value: unknown): Stuff[] | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'object') return null;
    if ('stuffId' in value && typeof (value as Stuff).stuffId === 'string') {
      return [value as Stuff];
    }
    if ('stuff' in value) {
      const v = (value as { stuff: Stuff | Stuff[] | null }).stuff;
      if (v === null) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'object' && v !== null && 'stuffId' in v) {
        return [v];
      }
      return null;
    }
    return null;
  }

  /**
   * Pick the effective target Stuff from a single-cardinality
   * binding, considering both the direct match and any door
   * attached to a `via.exit`. Returns the first Stuff (in that
   * order) that satisfies `predicate`, or `null` when neither
   * does.
   *
   * The "direct first, door second" rule is what makes door-acting
   * verbs (`open`, `close`, future `knock` / `lock`) work
   * uniformly across the two ways MQL can land on a door: by
   * keyword on the door itself (`open oak`) or by direction
   * through the location (`open north`). Controllers that don't
   * care about doors just call `effectiveTarget(value, predicate)`
   * and the via.exit branch is a no-op when no door is attached
   * (or when the door doesn't satisfy the predicate).
   *
   * `predicate` is the standard `MixinApi.isX` shape — a type
   * guard returning `obj is Stuff & T`. The narrowing flows
   * through the return type, so callers don't need a follow-up
   * cast.
   */
  static effectiveTarget<T extends object>(
    value: MqlOneResult,
    predicate: (s: Stuff) => s is Stuff & T,
  ): (Stuff & T) | null {
    if (value.stuff && predicate(value.stuff)) return value.stuff;
    const exit = value.via?.exit;
    if (exit) {
      const door = exit.getDoor();
      if (door && predicate(door)) return door;
    }
    return null;
  }
}

/**
 * Decide whether the match list shares a single `via` shape — when
 * every match's via is undefined, return undefined; when every match's
 * via is the same identity (shallow-equal), return that one; otherwise
 * `undefined` (mixed paths).
 *
 * "Same identity" here means same exit reference or same detailPath
 * sequence; we keep the comparison cheap by JSON-stringifying.
 */
function consensusVia(
  matches: ReadonlyArray<{ via?: MqlMatchVia }>
): MqlMatchVia | undefined {
  if (matches.length === 0) return undefined;
  const first = matches[0]!.via;
  if (!first) {
    // Every match must also have no via for consensus.
    for (const m of matches) if (m.via) return undefined;
    return undefined;
  }
  const firstKey = JSON.stringify(first);
  for (const m of matches) {
    if (!m.via) return undefined;
    if (JSON.stringify(m.via) !== firstKey) return undefined;
  }
  return first;
}

SecurityApi.decorateApiClass(MqlApi);

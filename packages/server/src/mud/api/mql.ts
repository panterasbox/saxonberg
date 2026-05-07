/**
 * MqlApi — MUD Query Language for object resolution.
 *
 * The thin public facade in front of the `mql/` pipeline. Two entry
 * points reflect caller intent:
 *
 *   - {@link resolveOne} — one-of-N intent. Returns the highest-scored
 *     match (or null) wrapped in {@link MqlOneResult}, with optional
 *     sub-feature attribution. The future auto-disambiguation hook
 *     (UI prompt when several candidates score equally) will layer
 *     onto this code path additively.
 *   - {@link resolveMany} — multi intent. Returns the full match list
 *     in {@link MqlManyResult}; never disambiguated.
 *
 * Both delegate to the same internal pipeline (`mql/resolver.ts`); the
 * difference is only in how the match list is wrapped.
 *
 * Internal `mql/` modules are pipeline stages, not Apis — they're not
 * security-decorated. The class below is the security-decorated entry
 * point; controllers and the dispatcher reach this surface only.
 */

import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Stuff } from '../lib/stuff/Stuff';
import { resolve as resolvePipeline } from './mql/resolver';
import { SecurityApi } from './security';

import type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlManyResult,
  PermissionTier,
} from './mql/types';

export type { MqlContext, MqlMatchVia, MqlOneResult, MqlManyResult, PermissionTier };

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
  static resolveOne(query: string, ctx: MqlContext): MqlOneResult {
    const matches = resolvePipeline(query, ctx);
    if (matches.length === 0) return { stuff: null };
    const top = matches[0]!;
    const out: MqlOneResult = { stuff: top.stuff };
    if (top.via) out.via = top.via;
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
  static resolveMany(query: string, ctx: MqlContext): MqlManyResult {
    const matches = resolvePipeline(query, ctx);
    const stuff: Stuff[] = matches.map((m) => m.stuff);
    const via = consensusVia(matches);
    const out: MqlManyResult = { stuff };
    if (via) out.via = via;
    return out;
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

// Keep `CommandGiver` referenced for external `MqlContext` consumers
// that re-export through this module's type surface.
export type _MqlCommandGiverRef = Stuff & CommandGiver;

SecurityApi.decorateApiClass(MqlApi);

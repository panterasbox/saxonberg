// MqlLogic — the hot-reloadable logic singleton behind MqlApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { resolveWithQuantity } from '../../api/mql/resolver';
import type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlOne,
  MqlMany,
} from '../../api/mql/types';

const MqlApiCallers = SecurityPolicies.FromModule('mud/api/mql#MqlApi');

/**
 * Decide whether the match list shares a single `via` shape — when every
 * match's via is undefined, return undefined; when every match's via is
 * the same identity (shallow-equal), return that one; otherwise
 * `undefined` (mixed paths). "Same identity" = same exit reference or
 * same detailPath sequence; kept cheap by JSON-stringifying.
 */
function consensusVia(
  matches: ReadonlyArray<{ via?: MqlMatchVia }>
): MqlMatchVia | undefined {
  if (matches.length === 0) return undefined;
  const first = matches[0]!.via;
  if (!first) {
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

/**
 * MqlLogic — the hot-reloadable logic singleton behind {@link MqlApi}.
 *
 * Lives at `/obj/api/mql` (a stateless `Stuff` singleton, no backing
 * `Template`); `MqlApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Both resolve entry points delegate to the
 * same internal `mql/` pipeline (`resolveWithQuantity`); the difference
 * is only how the match list is wrapped. The sealed `mql/` subdir stays
 * the private pipeline — this logic singleton is the Api's own
 * implementation, so it (like the facade) may import from it.
 *
 * Each public method carries the `FromModule` gate per method (a
 * class-level default would also deny inherited framework methods).
 *
 * @internal
 */
@Unshadowable
export class MqlLogic extends Idea {
  /** See {@link MqlApi.resolveOne}. */
  @CallSecurity(MqlApiCallers)
  public resolveOne(query: string, ctx: MqlContext): MqlOne {
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

  /** See {@link MqlApi.resolveMany}. */
  @CallSecurity(MqlApiCallers)
  public resolveMany(query: string, ctx: MqlContext): MqlMany {
    const { matches, quantity } = resolveWithQuantity(query, ctx);
    const stuff: Stuff[] = matches.map((m) => m.stuff);
    const via = consensusVia(matches);
    const out: MqlMany = { stuff };
    if (via) out.via = via;
    if (quantity) out.quantity = quantity;
    return out;
  }

  /** See {@link MqlApi.extractStuffs}. */
  @CallSecurity(MqlApiCallers)
  public extractStuffs(value: unknown): Stuff[] | null {
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

  /** See {@link MqlApi.effectiveTarget}. */
  @CallSecurity(MqlApiCallers)
  public effectiveTarget<T extends object>(
    value: MqlOneResult,
    predicate: (s: Stuff) => s is Stuff & T
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

// MqlLogic — the hot-reloadable logic singleton behind MqlApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { resolveWithQuantity } from '../../../api/mql/resolver';
import { scoreTier } from '../../../api/mql/scope-walk';
import { PerceptionApi } from '../../../api/perception';

import type { Container } from '../../../lib/spatial/Container';
import type {
  MqlContext,
  MqlMatchVia,
  MqlOneResult,
  MqlOne,
  MqlMany,
} from '../../../api/mql/types';

const MqlApiCallers = SecurityPolicies.FromModule('/api/mql#MqlApi');

/**
 * Decide whether the match list shares a single `via` shape — when every
 * match's via is undefined, return undefined; when every match's via is
 * the same (shallow-equal), return that one; otherwise `undefined`
 * (mixed paths).
 *
 * ⛔ Compared by IDENTITY (and `detailPath` by value), never by
 * `JSON.stringify`: a via once held a live `Exit` whose boundary points
 * back at it, and stringifying threw on a well-formed `unlock north`
 * (the lock build's drive). Exits bind as themselves now
 * and every via is plain data, but a shallow compare is still both
 * what the doc says and cheaper than serializing.
 */
function sameVia(a: MqlMatchVia, b: MqlMatchVia): boolean {
  const ka = Object.keys(a) as Array<keyof MqlMatchVia>;
  const kb = Object.keys(b) as Array<keyof MqlMatchVia>;
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    const va = (a as Record<string, unknown>)[k as string];
    const vb = (b as Record<string, unknown>)[k as string];
    if (va === vb) continue;
    // `detailPath: string[]` is the one augmentation whose equality is
    // by VALUE rather than by reference.
    if (
      Array.isArray(va) &&
      Array.isArray(vb) &&
      va.length === vb.length &&
      va.every((x, i) => x === vb[i])
    ) {
      continue;
    }
    return false;
  }
  return true;
}

function consensusVia(
  matches: ReadonlyArray<{ via?: MqlMatchVia }>
): MqlMatchVia | undefined {
  if (matches.length === 0) return undefined;
  const first = matches[0]!.via;
  if (!first) {
    for (const m of matches) if (m.via) return undefined;
    return undefined;
  }
  for (const m of matches) {
    if (!m.via) return undefined;
    if (!sameVia(m.via, first)) return undefined;
  }
  return first;
}

/**
 * ⭐ A resolution is a READ: every candidate is described for the viewer
 * (a vision gate each) and nothing changes a light, so the light at each
 * place is walked once for the whole resolution, whatever the scope — the
 * reachable pool, `peers`, `here`. See `PerceptionApi.holdLightSteady`
 * (silk's browser walk: `buy`'s counter resolution pinned the server).
 */
function steadyResolve(
  query: string,
  ctx: MqlContext,
): ReturnType<typeof resolveWithQuantity> {
  const release = PerceptionApi.holdLightSteady();
  try {
    return resolveWithQuantity(query, ctx);
  } finally {
    release();
  }
}

/**
 * MqlLogic — the hot-reloadable logic singleton behind {@link MqlApi}.
 *
 * Lives at `/platform/idea/api/mql` (a stateless `Stuff` singleton, no backing
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
export class MqlLogic extends ApiLogic {
  /** See {@link MqlApi.resolveOne}. */
  @CallSecurity(MqlApiCallers)
  public resolveOne(query: string, ctx: MqlContext): MqlOne {
    const { matches, quantity, scan, isSet } = steadyResolve(query, ctx);
    if (matches.length === 0) {
      const empty: MqlOne = { stuff: null };
      if (isSet) empty.isSet = true;
      if (quantity) empty.quantity = quantity;
      if (scan) empty.scan = scan;
      return empty;
    }
    const top = matches[0]!;
    const out: MqlOne = { stuff: top.stuff };
    if (isSet) out.isSet = true;
    if (top.via) out.via = top.via;
    if (quantity) out.quantity = quantity;
    if (scan) out.scan = scan;
    return out;
  }

  /** See {@link MqlApi.resolveMany}. */
  @CallSecurity(MqlApiCallers)
  public resolveMany(query: string, ctx: MqlContext): MqlMany {
    const { matches, quantity, scan, isSet } = steadyResolve(query, ctx);
    const stuff: Stuff[] = matches.map((m) => m.stuff);
    const via = consensusVia(matches);
    const out: MqlMany = { stuff };
    if (isSet) out.isSet = true;
    if (via) out.via = via;
    if (matches.some((m) => m.via)) out.vias = matches.map((m) => m.via);
    if (matches.length > 0) out.tiers = matches.map((m) => scoreTier(m.score));
    if (quantity) out.quantity = quantity;
    if (scan) out.scan = scan;
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
    const bound = value.stuff;
    if (!bound) return null;
    if (predicate(bound)) return bound;
    // ⭐ The one carve-out, and it is MQL's: a WAY that does not itself
    // satisfy the verb is answered by the boundary standing in it. `open
    // north` binds the exit (a candidate in its own right) and `open` needs
    // a sealable thing, which is the boundary standing in the way — one
    // object for both sides (boundary build, 2026-11). A sleeping ship's berth way
    // carries a remembered lock on the exit itself, so `lock` stops at the
    // first rung there.
    if (bound.isExit()) {
      const boundary = bound.getBoundary();
      if (boundary && predicate(boundary)) return boundary;
    }
    return null;
  }

}

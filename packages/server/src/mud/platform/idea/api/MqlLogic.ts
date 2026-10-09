// MqlLogic — the hot-reloadable logic singleton behind MqlApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { resolveWithQuantity } from '../../../api/mql/resolver';
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
 * the same identity (shallow-equal), return that one; otherwise
 * `undefined` (mixed paths). "Same identity" = same exit reference or
 * same detailPath sequence.
 *
 * ⛔⛔ **Compared by IDENTITY, never by `JSON.stringify`** — and this
 * function's own comment used to say *"same exit reference … kept cheap
 * by JSON-stringifying"*, which is the contradiction that shipped. An
 * `exit` via holds a LIVE `Exit`, which reaches its `Boundary`, whose
 * `anchorA`/`anchorB` point back at it; stringifying one throws
 * `Converting circular structure to JSON` and the caller reports
 * `mql-error` on a query that was perfectly well-formed.
 *
 * ⚠⚠ Unreachable until the lock build conferred `lock`/`unlock`: a
 * direction is the only candidate carrying an exit, and these are the
 * first views to resolve one through a `requires:` mixin gate. It
 * presented as `unlock north` → `mql-error[target]` while `unlock gate`
 * worked — at the realm's one locked door. ⭐ Found by the drive, and
 * findable nowhere else: no test had ever targeted a boundary verb by
 * direction (`OpenController`'s own test names the door by keyword), so
 * `open north` and `close north` were broken the same way for as long
 * as they have existed, each promised by its own help text.
 *
 * ⭐ A shallow reference compare is also what the doc always SAID, and
 * it is cheaper than serializing an object graph.
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
    const { matches, quantity, scan } = resolveWithQuantity(query, ctx);
    if (matches.length === 0) {
      const empty: MqlOne = { stuff: null };
      if (quantity) empty.quantity = quantity;
      if (scan) empty.scan = scan;
      return empty;
    }
    const top = matches[0]!;
    const out: MqlOne = { stuff: top.stuff };
    if (top.via) out.via = top.via;
    if (quantity) out.quantity = quantity;
    if (scan) out.scan = scan;
    return out;
  }

  /** See {@link MqlApi.resolveMany}. */
  @CallSecurity(MqlApiCallers)
  public resolveMany(query: string, ctx: MqlContext): MqlMany {
    const { matches, quantity, scan } = resolveWithQuantity(query, ctx);
    const stuff: Stuff[] = matches.map((m) => m.stuff);
    const via = consensusVia(matches);
    const out: MqlMany = { stuff };
    if (via) out.via = via;
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
    if (value.stuff && predicate(value.stuff)) return value.stuff;
    const exit = value.via?.exit;
    if (exit) {
      const door = exit.getDoor();
      if (door && predicate(door)) return door;
      // ⭐⭐ The THIRD rung, and `lock north` needed it. The question
      // this method answers is *what, reachable that way, satisfies the
      // predicate* — and for the keyed-door family the answer is the
      // EXIT: `KeyedDoorExit` / `FrontDoorExit` / `DormDoor` carry the
      // lock themselves and have no `Door` Thing at all, so a
      // door-only walk found nothing and the verb refused with
      // `not-lockable` at the one door in the realm you actually hold
      // a key to.
      if (predicate(exit as unknown as Stuff)) {
        return exit as unknown as Stuff & T;
      }
    }
    return null;
  }

}

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
  RegistryScan,
  RegistryReadStat,
} from '../../../api/mql/types';

const MqlApiCallers = SecurityPolicies.FromModule('/api/mql#MqlApi');

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


  /**
   * ⭐⭐ **The D21 cost table** — `"<template>#<method>"` → what that
   * reader has read, plus `"seat"` for office-holder queries.
   *
   * The gate has already resolved the caller's identity in order to
   * decide admission, so recording it costs nothing extra; and being
   * *inside* the two gated entries means **every admitted read is
   * counted by construction** — there is no second place to forget.
   *
   * ⚠ Instance state on the singleton: it resets on restart and on an
   * HMR reload of this class. A freshly-booted server reads as all
   * zeros, which looks identical to "nothing scans" — read it from a
   * server that has been up a while, or the numbers mean nothing.
   */
  private registryReads = new Map<string, RegistryReadStat>();

  private record(reader: string, scan: RegistryScan | undefined): void {
    const returned = scan?.scanned ?? 0;
    const prior = this.registryReads.get(reader);
    if (prior) {
      prior.calls += 1;
      prior.returned += returned;
      prior.maxReturned = Math.max(prior.maxReturned, returned);
      prior.lastAt = Date.now();
      return;
    }
    this.registryReads.set(reader, {
      reader,
      calls: 1,
      returned,
      maxReturned: returned,
      lastAt: Date.now(),
    });
  }

  /**
   * ⭐⭐ **The engine's own registry-wide read**, admitted only from the
   * `(template, method)` pairs named on {@link MqlApi}'s policy — and
   * only in the one shape the composition index answers.
   *
   * The caller identity the gate resolved is the table's key, so a
   * reader that starts costing something is nameable rather than
   * discovered in a profiler after a complaint.
   */
  @CallSecurity(MqlApiCallers)
  public resolveWorldIndexed(
    query: string,
    ctx: MqlContext,
    reader: string,
  ): MqlMany {
    const { matches, quantity, scan } = resolveWithQuantity(
      query,
      ctx,
      'indexed',
    );
    this.record(reader, scan);
    const out: MqlMany = { stuff: matches.map((m) => m.stuff) };
    const via = consensusVia(matches);
    if (via) out.via = via;
    if (quantity) out.quantity = quantity;
    return out;
  }

  /**
   * ⭐⭐ **The office holder's typed query.** Any `world` shape resolves,
   * and the return carries what it cost so the holder can be told.
   */
  @CallSecurity(MqlApiCallers)
  public resolveWorldForSeat(
    query: string,
    ctx: MqlContext,
  ): MqlMany & { scan?: RegistryScan } {
    const { matches, quantity, scan } = resolveWithQuantity(query, ctx, 'seat');
    this.record('seat', scan);
    const out: MqlMany & { scan?: RegistryScan } = {
      stuff: matches.map((m) => m.stuff),
    };
    const via = consensusVia(matches);
    if (via) out.via = via;
    if (quantity) out.quantity = quantity;
    if (scan) out.scan = scan;
    return out;
  }

  /** See {@link MqlApi.registryReadStats}. */
  @CallSecurity(MqlApiCallers)
  public registryReadStats(): readonly RegistryReadStat[] {
    return [...this.registryReads.values()].sort(
      (a, b) => b.maxReturned - a.maxReturned,
    );
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

/**
 * PoolableMixin — ⭐ **a good that a store may hold as an amount by grade,
 * and that says itself how it pools** (storage-and-ice D2), mirroring
 * `Stackable`'s `canMergeWith` / `onMerged`: the good's declaration, as
 * instance methods the store calls on a line's face.
 *
 * A pool key names the GOOD by what it is, not by its row: a lump of pan ice
 * and a squared block of pan ice are the same matter at the same grade and
 * share one line (`ice|cloudy`). Composers in the kernel today: `IceBlock`
 * (and carpentry's `Sawdust`, as packing).
 *
 * The base answers are inert — a good that pools by its row, keeps no
 * state, and does nothing in a store — so a composer overrides only what is
 * true of it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { PoolRole } from './StoreLine';

/** What the store hands a good's reconcile: the conditions it sat in. */
export interface StoreConditions {
  /** The line's kilograms before this step. */
  massKg: number;
  /** The line's state before this step. */
  state: Record<string, number>;
  /** The air of the room around the stack, K. */
  ambientK: number;
  /** Seconds of the step. */
  dtS: number;
  /** The stack's exposed surface, m². */
  surfaceM2: number;
  /** The packing the stack is buried in, or `null` (bare). */
  packing: { depthM: number; kWmK: number } | null;
}

/** What time did to a pooled good in a store. */
export interface StoreResponse {
  massKg: number;
  state: Record<string, number>;
  /** Mean heat INTO the line over the step, W (positive warms the stock). */
  heatW: number;
  /** Kilograms of water the line gave up (a melt), to soak the packing. */
  meltwaterKg: number;
}

export interface Poolable {
  /** The good + the band it pools with. Default: its row. */
  poolKey(): string;
  /** What the pooled matter keeps (a temperature, a saturation). */
  poolState(): Record<string, number>;
  /** Merge two states of the same key, mass-weighted by default. */
  mergePoolState(
    a: Record<string, number>,
    massA: number,
    b: Record<string, number>,
    massB: number,
  ): Record<string, number>;
  /** Stamp a line's state onto a freshly materialized unit. */
  applyPoolState(state: Record<string, number>): void;
  /**
   * Stamp the GRADE a line's key names onto a freshly materialized unit
   * (an ice block reads its quality off `ice|black`). Base: nothing — a
   * good whose key is its row has no grade to stamp.
   */
  applyPoolKey(poolKey: string): void;
  /** Kept, or what keeping is done in. */
  poolRole(): PoolRole;
  /** What a step of time in a store does to a line of this good. */
  reconcileInStore(ctx: StoreConditions): StoreResponse;
  /** The line's thermal anchor while it exchanges heat with its room, K, or `null`. */
  storeAnchorK(state: Record<string, number>): number | null;
}

export function PoolableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PoolableMixin extends Base implements Poolable {
    static _mixinName: string = 'PoolableMixin';

    public poolKey(): string {
      return (this as unknown as Stuff).getTemplatePath() ?? '';
    }

    public poolState(): Record<string, number> {
      return {};
    }

    public mergePoolState(
      a: Record<string, number>,
      massA: number,
      b: Record<string, number>,
      massB: number,
    ): Record<string, number> {
      const total = massA + massB;
      const out: Record<string, number> = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const va = a[k];
        const vb = b[k];
        if (va === undefined) out[k] = vb as number;
        else if (vb === undefined || !(total > 0)) out[k] = va;
        else out[k] = (va * massA + vb * massB) / total;
      }
      return out;
    }

    public applyPoolState(_state: Record<string, number>): void {
      // Inert: a good that keeps no state has nothing to stamp.
    }

    public applyPoolKey(_poolKey: string): void {
      // Inert: the base key is the row, which carries no grade.
    }

    public poolRole(): PoolRole {
      return 'stock';
    }

    public reconcileInStore(ctx: StoreConditions): StoreResponse {
      return { massKg: ctx.massKg, state: { ...ctx.state }, heatW: 0, meltwaterKg: 0 };
    }

    public storeAnchorK(_state: Record<string, number>): number | null {
      return null;
    }
  };
}

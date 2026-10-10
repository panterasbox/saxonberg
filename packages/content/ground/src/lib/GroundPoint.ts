/**
 * GroundPointMixin — *what is under the thing I am standing at?*
 *
 * ⭐⭐ **The third copy of one trio, promoted.** `StrataMixin` answers
 * the position reads for a room that IS a place in the ground; this
 * answers them for a **thing standing in** one. The difference is a
 * single hop — the container's zone and the container's coordinates
 * instead of its own — and the trio had already been written twice
 * privately before this existed:
 * `trade-mining`'s `SurveyReading` (`depositAt` / `metresAt` / `seedAt` /
 * `groundAt`) and `trade-farming`'s `SoilReading` (`sampleAt`). A
 * wellhead is the third, and three copies is where a pattern gets a
 * home.
 *
 * ⚠⚠ **A bore is a POINT, not a PLACE.** This is the mixin that makes
 * that affordable. A hole in the ground mints no room, adds no node to
 * the location graph and has no inside; what comes out comes up a pipe,
 * and the thing you stand at is a fixture in an ordinary surface
 * Location. If a hole needed a `Location` to know where it was, every
 * hole would be a room, and *a borehole is a point* would have been
 * false in the model the first time anybody dug one.
 *
 * ## Where it does NOT go
 *
 * ⛔ Not on `Thing` or `Good`. Every object in the game would then claim
 * a column, and a teacup in a drawing-room would answer *what is the
 * country rock under me* — which is a true-but-absurd read, and the tell
 * that the host set is too wide. A host composes this because it is
 * **anchored**: a derrick, a wellhead, a standpipe, a monument. The
 * narrowing test holds — nothing composing this needs a guard to
 * re-narrow it.
 *
 * ## Where it lives
 *
 * A pack's own substrate lives in its `src/lib/`, inherited and never
 * instanced (`lint:instanceable` invariant 8). This module is a mixin
 * factory and the types its surface speaks, and nothing else.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import Deposit from '../idea/Deposit';
import type {
  Point,
  GroundSample,
  FluidSample,
  StructureReading,
} from '../idea/Deposit';
import type { MixinCtor } from './Strata';
import { GroundQueryMixin, type GroundQuery } from './GroundQuery';

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const GROUND_POINT_MIXIN = 'GroundPointMixin';

/**
 * Public shape added by GroundPointMixin.
 *
 * ⭐ It **extends** {@link GroundQuery}: asking the column about a place
 * is that mixin's job and is written once, and this adds only the one
 * thing that is genuinely different — *which place am I standing in?*
 */
export interface GroundPoint extends GroundQuery {
  /**
   * The surface Location this thing stands in, or `null` when it is in
   * somebody's pocket or nowhere. ⚠ Every other read answers `null`
   * through this one, so a wellhead carried off in a cart says *it is
   * not standing on anything* rather than reading a stale column.
   */
  groundPlace(): Stuff | null;
  /**
   * The point in the rock `depthM` metres below the room this thing
   * stands in, in metres, z negative down. `null` with no place.
   *
   * ⚠ **Cells are not metres**, the same warning `StrataMixin` carries:
   * the horizontal pair is the room's cell times the zone's own
   * `cellSize`, because rock does not know what grid anybody cut on. The
   * depth is already metres — a hole is measured in metres by everybody
   * who has ever dug one.
   */
  metresHere(depthM: number): Point | null;
  /** The deposit governing the ground under this thing, through the ZONE's citation. */
  getDeposit(): Promise<Deposit | null>;
  /** The deposit's seed, derived from the covering Locality's claimed address. */
  getGroundSeed(): Promise<number>;
  /** The covering Locality's claimed address — the body register's key. */
  getGroundAddress(): Promise<string>;
  /** Everything the ground says at `depthM` below this thing. */
  sampleAtDepth(depthM: number): Promise<GroundSample | null>;
  /** What is in the pore space at `depthM` below this thing. */
  fluidAtDepth(depthM: number): Promise<FluidSample | null>;
  /** Every structure under this thing, read to `errorM` resolution. */
  structuresHere(errorM: number): Promise<StructureReading[]>;
}

/**
 * The members this mixin adds **on top of** {@link GroundQuery} — what
 * the class body is checked against.
 *
 * ⚠ Not decoration: TypeScript does not surface a mixin's members on
 * `this` inside a class whose base is `SomeMixin(TypeParameter)`, so
 * `implements GroundPoint` on the class body would demand it re-declare
 * everything it inherits at runtime perfectly well. `WorkingMixin` over
 * `StrataMixin` hit this first and solved it with a typed accessor; this
 * is the same hole from the other side.
 */
type GroundPointOwn = Omit<GroundPoint, keyof GroundQuery>;

/**
 * ⚠ The explicit return annotation is required for `StrataMixin`'s
 * reason, measured there: TypeScript does not surface a mixin's own
 * members on `this` inside a class extending it when the base is a type
 * parameter, and every consumer typed as the interface would silently
 * lose the whole trio.
 */
export function GroundPointMixin<
  TBase extends MixinConstructor<Stuff & Containable>,
>(Base: TBase): TBase & MixinCtor<GroundPoint> {
  class GroundPointMixin
    extends GroundQueryMixin(Base)
    implements GroundPointOwn
  {
    static _mixinName: string = GROUND_POINT_MIXIN;

    /** ⚠ Widened to `string` deliberately — a pinned literal collapses the chain. */
    static _mixinRefusal: string = '{} does not stand on any ground.';

    /**
     * The inherited {@link GroundQuery} reads, typed. ⚠ One accessor
     * rather than seven casts, for `WorkingMixin`'s measured reason.
     */
    private get query(): GroundQuery {
      return this as unknown as GroundQuery;
    }

    public groundPlace(): Stuff | null {
      const container = (
        this as unknown as { getContainer(): Stuff | null }
      ).getContainer();
      if (!container) return null;
      // A Location is what has coordinates and a zone; anything else
      // (a cart, a pocket, a crate) is not ground.
      const c = container as unknown as {
        getCoordinates?(): [number, number, number];
        getZone?(): unknown;
      };
      if (typeof c.getCoordinates !== 'function') return null;
      if (typeof c.getZone !== 'function') return null;
      return container;
    }

    public metresHere(depthM: number): Point | null {
      const place = this.groundPlace();
      if (place === null) return null;
      return this.query.metresBelow(place, depthM);
    }

    public async getDeposit(): Promise<Deposit | null> {
      const place = this.groundPlace();
      return place === null ? null : this.query.depositAt(place);
    }

    public async getGroundAddress(): Promise<string> {
      const place = this.groundPlace();
      return place === null ? '' : this.query.addressAt(place);
    }

    public async getGroundSeed(): Promise<number> {
      const place = this.groundPlace();
      // ⚠ With nothing to stand on the seed is the empty address's,
      // which is stable and barren — never a throw, because a wellhead
      // in a cart must still answer `look`.
      return place === null ? Deposit.seedFor('') : this.query.seedAt(place);
    }

    public async sampleAtDepth(depthM: number): Promise<GroundSample | null> {
      const place = this.groundPlace();
      if (place === null) return null;
      return this.query.groundSampleBelow(place, depthM);
    }

    public async fluidAtDepth(depthM: number): Promise<FluidSample | null> {
      const place = this.groundPlace();
      if (place === null) return null;
      return this.query.fluidBelow(place, depthM);
    }

    public async structuresHere(errorM: number): Promise<StructureReading[]> {
      const place = this.groundPlace();
      if (place === null) return [];
      return this.query.structuresAt(place, errorM);
    }
  }
  return GroundPointMixin as unknown as TBase & MixinCtor<GroundPoint>;
}

/**
 * LiftSource — ⭐⭐ the shape every fluid-at-depth host answers: *a fluid
 * stands some way below my draw point, and can be raised into it.* `bail`
 * is the bucket over any lift source; a displacement pump asks the
 * pressure first. See `./Pumpable` for the two families.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Mml } from '../../api/mml';
import type { MixinConstructor } from '../mixin';

/**
 * ⭐⭐ **A fluid stands some way below my draw point, and can be raised
 * into it.** Answered by a well (its authored depth) and by a wellhead
 * (the hole's own depth and its sump).
 *
 * ⚠ It adds no field anywhere: every number it answers already lived on
 * its host. A tap is NOT one (there is nothing below a tap), and nor is a
 * conduit (it has a *duty* — a head and a capacity — and no draw slot).
 *
 * ⭐ Bucket and displacement machines both raise through
 * {@link LiftSource.liftInto}; only the displacement machine asks the
 * pressure first. That asymmetry IS the lesson, and it is why the ceiling
 * is computed by the pump and never by the source.
 */
export interface LiftSource {
  /** Metres from the draw point down to the standing fluid. */
  standingDepthM(): number;
  /** Template path of the Material standing below, or `null` (nothing). */
  standingMaterial(): Promise<string | null>;
  /** Litres standing below that a lift could take (`Infinity` = a body). */
  standingAvailableL(): Promise<number>;
  /** Litres the draw point could still receive before it is full. */
  receivableL(): number;
  /**
   * Raise up to `litres` into the draw point. Returns litres moved.
   * `by` is whoever worked the handle, when a hand did (a ship's bilge
   * well credits the pumping to them); a source that does
   * not care ignores it.
   */
  liftInto(litres: number, by?: Stuff): Promise<number>;
  /** The place whose atmosphere presses on the draw point. */
  liftScope(): (Stuff & Container) | null;
  /**
   * Where what came up GOES, in words, when it is not the source's own
   * draw point (a bilge pump throws the water over the
   * side). `what` is the fluid's name, capitalized. Absent: the pump says
   * it runs into the source.
   */
  liftedWords?(what: string): Mml;
  /**
   * ⭐ Family A's hooks: `bail` is the BUCKET over any
   * lift source — a boat's bilge, a ship's well, a village well, a bore —
   * and the verb reads the source and the tool, nothing else. These two
   * let the source say what is its own.
   *
   * Why a bucket cannot be got down to the fluid here, or `null` — a bore
   * wants a derrick over it; a boat upside down has nothing to bail.
   * `tool` is the bucket brought (`null`: bare hands). Absent: nothing
   * stops a bucket.
   */
  bucketRefusal?(by: Stuff, tool: Stuff | null): Promise<{ reason: string; line: Mml } | null>;
  /**
   * A bucketful has landed (already lifted through {@link liftInto}, and
   * tipped into the vessel brought when the draw point holds it): the
   * source's own words for it, and anything it credits — the bore's
   * answer. `null` (or absent): the verb's words.
   */
  bucketLanded?(by: Stuff, landing: BucketLanding): Promise<Mml | null>;
}

/** What one bucketful did, for a source's {@link LiftSource.bucketLanded}. */
export interface BucketLanding {
  /** Litres the bucket brought up (`0`: it came up empty). */
  litres: number;
  /** The vessel it was tipped into, or `null`. */
  vessel: Stuff | null;
  /** Litres that went into the vessel. */
  tipped: number;
  /** The vessel could not hold it (a gas in an open cask). */
  escaped: boolean;
}

/**
 * ⭐ **`LiftSourceMixin` — the lift protocol, as a mixin** (controllers-are-io
 * D8a; five hosts in three places).
 *
 * IS: a draw point with fluid standing below it — a well, a ship's bilge
 * well, a bore's wellhead, a boat's bilge, a pump's own sump. IS NOT: a
 * tap (nothing stands below a tap) nor a conduit (a duty, not a draw slot).
 *
 * ⚠ The defaults REFUSE in numbers: nothing stands below, nothing can be
 * received, nothing is lifted. A host overrides what it has.
 */
export function LiftSourceMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class LiftSourceMixin extends Base implements LiftSource {
    static _mixinName: string = 'LiftSourceMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook */
    public standingDepthM(): number {
      return 0;
    }
    /** @hook */
    public async standingMaterial(): Promise<string | null> {
      return null;
    }
    /** @hook */
    public async standingAvailableL(): Promise<number> {
      return 0;
    }
    /** @hook */
    public receivableL(): number {
      return 0;
    }
    /** @hook */
    public async liftInto(_litres: number, _by?: Stuff): Promise<number> {
      return 0;
    }
    /** @hook */
    public liftScope(): (Stuff & Container) | null {
      return null;
    }
  };
}

/**
 * Dimensions — ⭐ **the size of a thing**: a box, `width · depth · height`
 * in metres (size and carrying D1).
 *
 * A thing's size derives from its FORM (a `Form` row's aspect — rod,
 * sheet, block, round, flexible) and its VOLUME (mass over density), and
 * is authored only where it is the point (a bole's length, a sheath shaped
 * to its blade). Everything a tape measure would answer is a method here:
 * the sorted sides, the cross-section a thing passes an opening by, the
 * three rotations it may be turned through to fit a box, and the width it
 * takes hanging from a belt.
 *
 * A value object: no world reads, no statics. Construct with `new`; a
 * non-positive side throws (P3 — a zero-size box is an authoring error,
 * never a default).
 *
 * See `docs/subsystems/size.md`.
 */

import type { BoundaryOpening } from '../boundary/Conduit';

/**
 * The dials of size — numbers, not an Api. Read where the rule is applied;
 * the folding build replaces `FOLDED_PACKING` with its crease model.
 */
export const SIZE_DEFAULTS = {
  /** Cloth packs with air: a flexible thing takes twice its own volume. */
  FLEXIBLE_PACKING: 2.0,
  /** A folded flexible thing packs to this fraction of its unfolded pack. */
  FOLDED_PACKING: 0.6,
  /** A coiled rope packs with this much air between its turns. */
  COIL_PACKING: 1.3,
  /** A rigid container's interior, per side, of its outside (the walls). */
  INTERIOR_FRACTION: 0.9,
  /** A hanging host bears its breaking load over this factor. */
  HANG_SAFETY: 4,
  /** A worn belt's length, of the trunk's circumference — the waist is a little narrower (D27). */
  WAIST_FRACTION: 0.9,
  /** Standard gravity, m/s² — what a weight is read against before a place says otherwise. */
  STANDARD_GRAVITY: 9.81,
  /** The words for room left along a hanging length (m), smallest first. */
  HANG_ROOM_WORDS: [
    { atLeastM: 0.3, words: 'plenty' },
    { atLeastM: 0.1, words: 'one more pouch' },
    { atLeastM: 0.04, words: 'a small thing' },
  ] as const,
} as const;

/** Which sides of a box a container closes (a lid adds `height`). */
export interface ClosedSides {
  width: boolean;
  depth: boolean;
  height: boolean;
}

/** Raw sides, metres, for authoring (`dimensions: {width, depth, height}`). */
export interface DimensionsSpec {
  width: number;
  depth: number;
  height: number;
}

/** A box: `width · depth · height`, metres. */
export class Dimensions {
  public readonly width: number;
  public readonly depth: number;
  public readonly height: number;

  public constructor(width: number, depth: number, height: number) {
    for (const [name, v] of [['width', width], ['depth', depth], ['height', height]] as const) {
      if (!(typeof v === 'number' && Number.isFinite(v) && v > 0)) {
        throw new RangeError(`Dimensions: ${name} must be a positive number of metres (got ${String(v)})`);
      }
    }
    this.width = width;
    this.depth = depth;
    this.height = height;
  }

  /** As authored data. */
  public toSpec(): DimensionsSpec {
    return { width: this.width, depth: this.depth, height: this.height };
  }

  /** The three sides, largest first. */
  public sorted(): [number, number, number] {
    const s = [this.width, this.depth, this.height].sort((a, b) => b - a);
    return [s[0] ?? 0, s[1] ?? 0, s[2] ?? 0];
  }

  /** The longest side — what matters where a way bends. */
  public longest(): number {
    return this.sorted()[0];
  }

  /** The middle side — the width a thing takes hanging from a length. */
  public hangingWidthM(): number {
    return this.sorted()[1];
  }

  /** The shortest side. */
  public shortest(): number {
    return this.sorted()[2];
  }

  /** The box's volume, m³. */
  public boxVolume(): number {
    return this.width * this.depth * this.height;
  }

  /**
   * ⭐ The face a thing passes an opening by — its two smaller sides (a pole
   * goes in endwise). `width` is the larger of the two.
   */
  public crossSection(): BoundaryOpening {
    const [, mid, small] = this.sorted();
    return { width: mid, height: small };
  }

  /** Does the cross-section pass `opening`, turned either way in it? */
  public fitsThrough(opening: BoundaryOpening): boolean {
    const { width: a, height: b } = this.crossSection();
    const w = opening.width;
    const h = opening.height;
    return (a <= w && b <= h) || (a <= h && b <= w);
  }

  /**
   * The six ways this box can stand in another — every assignment of its
   * sides to `width · depth · height`.
   */
  public rotations(): Dimensions[] {
    const { width: x, depth: y, height: z } = this;
    const perms: [number, number, number][] = [
      [x, y, z], [x, z, y], [y, x, z], [y, z, x], [z, x, y], [z, y, x],
    ];
    return perms.map(([a, b, c]) => new Dimensions(a, b, c));
  }

  /**
   * ⭐ The way this box stands in `box` so it fits along every side the box
   * CLOSES — open sides do not count, a thing bigger than them spills over
   * (a broom stands in a bucket). Of the ways that fit, the one that fills
   * least (an overhang is not room taken). `null` when no way fits.
   */
  public orientationWithin(box: Dimensions, closed: ClosedSides): Dimensions | null {
    let best: Dimensions | null = null;
    let bestFill = Infinity;
    for (const r of this.rotations()) {
      if (closed.width && r.width > box.width + 1e-9) continue;
      if (closed.depth && r.depth > box.depth + 1e-9) continue;
      if (closed.height && r.height > box.height + 1e-9) continue;
      const fill = r.clippedTo(box);
      if (fill < bestFill) {
        best = r;
        bestFill = fill;
      }
    }
    return best;
  }

  /** Does it fit `box` along the sides `box` closes, turned some way? */
  public fitsWithin(box: Dimensions, closed: ClosedSides): boolean {
    return this.orientationWithin(box, closed) !== null;
  }

  /**
   * The room this box (as it stands) takes inside `box`: its volume with
   * every side clipped to the box's — what stands out of an open top fills
   * only to the brim.
   */
  public clippedTo(box: Dimensions): number {
    return (
      Math.min(this.width, box.width) *
      Math.min(this.depth, box.depth) *
      Math.min(this.height, box.height)
    );
  }
}

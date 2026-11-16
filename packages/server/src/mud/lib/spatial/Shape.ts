/**
 * Shape — ⭐ **a shape a thing can have**, as a `shape` document (size and
 * carrying D1; a document since W10j — the `Form` Idea retired).
 *
 * A shape sets a thing's PROPORTIONS; its volume sets the scale. The
 * platform ships five — `rod` (a sword, a pole, a scroll), `sheet` (paper,
 * a board, a pane, a hide), `block` (a brick, a box, a chest), `round` (an
 * apple, a pot, a cheese) and `flexible` (cloth, rope, a bag, a pelt) —
 * and a sixth is one file and no code (a cone, a ring):
 *
 * ```yaml
 * # content/shapes/rod.yaml  →  /platform/shapes/rod
 * aspect: { width: 1, depth: 1, height: 20 }
 * rigid: true
 * ```
 *
 * A thing names its shape by its `shape:` field (`ShapedMixin`): a bare
 * word is the platform's (`rod` → `/platform/shapes/rod`), a path any
 * pack's (`/trade/glass/shapes/cone`). The class default is `block`;
 * `flexible` for garments, lines, sacks and packs; `sheet` for paper.
 *
 * ⭐⭐ Resident by construction, as placements are (documents D7): the
 * kernel's shapes load with the containment Api's needs
 * (`ShapeCatalogue.ensureKernel`); a row's own through its `shape` setter,
 * which the applier awaits on hydrate and on restore. A sync read of one
 * nothing loaded is an engine defect, thrown by path — never "unknown".
 *
 * ⚠ Not the potter's `form` (`lib/craft/FormSpec.ts` — the words an
 * instrument makes: `mug`, `bottle`, `brick`). That kind owns the word
 * `form` and the `content/forms/` directory; this is the size of a thing.
 *
 * The shapes are SERVED by `ShapeCatalogue`, reached as
 * `ContainmentApi.shapes()`.
 */

import { Dimensions, type DimensionsSpec } from './Dimensions';

/** Where the platform's shapes live — a bare `shape:` word is a leaf here. */
export const KERNEL_SHAPE_PREFIX = '/platform/shapes/';

/** The kernel's five shapes, by path — the class defaults name three. */
export const Shapes = {
  /** The default: a brick, a box, a chest, a tool, a body. */
  BLOCK: '/platform/shapes/block',
  /** Long and thin: a sword, a pole, a scroll. */
  ROD: '/platform/shapes/rod',
  /** Broad and thin: paper, a board, a pane, a hide. */
  SHEET: '/platform/shapes/sheet',
  /** As wide as it is tall: an apple, a pot, a cheese. */
  ROUND: '/platform/shapes/round',
  /** Cloth, rope, a bag, a pelt — it gives. */
  FLEXIBLE: '/platform/shapes/flexible',
} as const;

/** One shape — see the module header. */
export class Shape {
  private readonly aspect: DimensionsSpec;

  /**
   * A shape as its document says (read through `ShapeCatalogue.parse`).
   * Throws on a non-positive side (P3) — a shape with no proportion is not one.
   */
  public constructor(
    private readonly path: string,
    aspect: DimensionsSpec,
    private readonly rigid: boolean,
  ) {
    // The Dimensions constructor is the validation.
    this.aspect = new Dimensions(aspect?.width, aspect?.depth, aspect?.height).toSpec();
  }

  /** This shape's path — its only name. */
  public getPath(): string {
    return this.path;
  }

  /** Its word: the path's leaf (`rod`). */
  public getName(): string {
    return this.path.slice(this.path.lastIndexOf('/') + 1);
  }

  /** Relative sides — only their ratios matter. */
  public getAspect(): DimensionsSpec {
    return { ...this.aspect };
  }

  /** Does it keep its shape (a board), or give (cloth)? */
  public isRigid(): boolean {
    return this.rigid;
  }

  /**
   * ⭐ A box of this shape holding `volumeM3`: the aspect scaled so its box
   * volume is the thing's volume. Throws on a non-positive volume.
   */
  public dimensionsFor(volumeM3: number): Dimensions {
    if (!(Number.isFinite(volumeM3) && volumeM3 > 0)) {
      throw new RangeError(`shape '${this.path}': a size needs a positive volume (got ${volumeM3})`);
    }
    const { width, depth, height } = this.aspect;
    const scale = Math.cbrt(volumeM3 / (width * depth * height));
    return new Dimensions(width * scale, depth * scale, height * scale);
  }
}

/**
 * Form — ⭐ **a shape a thing can have**: one singleton Idea per row at
 * `/platform/idea/Form/<name>` (size and carrying D1).
 *
 * A form sets a thing's PROPORTIONS; its volume sets the scale. The
 * platform ships five — `rod` (a sword, a pole, a scroll), `sheet` (paper,
 * a board, a pane, a hide), `block` (a brick, a box, a chest), `round` (an
 * apple, a pot, a cheese) and `flexible` (cloth, rope, a bag, a pelt) —
 * and a sixth is a row and no code (a cone, a ring). A word with numbers
 * behind it is a row, never an enum (`lint:closed-vocabularies`).
 *
 * ```yaml
 * # content/platform/idea/Form/rod.yaml
 * class: /platform/idea/Form
 * data:
 *   name: rod
 *   aspect: { width: 1, depth: 1, height: 20 }
 *   rigid: true
 * ```
 *
 * A thing names its form by its `shape:` field (`TangibleMixin`); the
 * class default is `block`, `flexible` for garments, lines, sacks and
 * packs, `sheet` for paper. Resident with every place (`Place.onCreate`
 * loads the rows once for the process) — a thing whose form is not loaded
 * has no known size, and nothing asks it to fit.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { FieldMeta } from '../../lib/mixin';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { Dimensions, type DimensionsSpec } from '../../lib/spatial/Dimensions';

/** Where the forms live — one prefix read loads them all. */
export const FORM_ROOT = '/platform/idea/Form/';

export default class Form extends SingletonMixin(Idea) {
  /** A vocabulary everyone reads (the commons). */
  static boundaryRole: BoundaryRole = 'commons';

  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    aspect: { persistent: true, authorable: true },
    rigid: { persistent: true, authorable: true },
  };

  /** The form's word (`rod`). Its path is `/platform/idea/Form/<name>`. */
  protected name = '';

  /** Relative sides — only their ratios matter. */
  protected aspect: DimensionsSpec = { width: 1, depth: 1, height: 1 };

  /** Does it keep its shape (a board), or give (cloth)? */
  protected rigid = true;

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getAspect(): DimensionsSpec {
    return { ...this.aspect };
  }
  /** Throws on a non-positive side (P3) — a form with no proportion is not one. */
  public setAspect(value: DimensionsSpec): void {
    // The constructor is the validation.
    const d = new Dimensions(value?.width, value?.depth, value?.height);
    this.aspect = d.toSpec();
  }

  public isRigid(): boolean {
    return this.rigid;
  }
  public setRigid(value: boolean): void {
    if (typeof value !== 'boolean') {
      throw new TypeError(`Form.rigid must be a boolean (got ${String(value)})`);
    }
    this.rigid = value;
  }

  /**
   * ⭐ A box of this form holding `volumeM3`: the aspect scaled so its box
   * volume is the thing's volume. Throws on a non-positive volume.
   */
  public dimensionsFor(volumeM3: number): Dimensions {
    if (!(Number.isFinite(volumeM3) && volumeM3 > 0)) {
      throw new RangeError(`Form '${this.name}': a size needs a positive volume (got ${volumeM3})`);
    }
    const { width, depth, height } = this.aspect;
    const scale = Math.cbrt(volumeM3 / (width * depth * height));
    return new Dimensions(width * scale, depth * scale, height * scale);
  }
}

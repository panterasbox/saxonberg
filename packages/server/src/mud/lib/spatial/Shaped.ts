/**
 * Shaped — ⭐ **a thing has a size** (size and carrying D1–D3; W10g): a
 * form (a `Form` row — `rod`, `sheet`, `block`, `round`, `flexible`), a
 * box it is fitted by, the room it takes and the room it takes packed.
 *
 * Size exists so a thing can be fitted into, through or onto something —
 * a box, a pocket's mouth, a doorway, a belt — so it is composed BESIDE
 * `Containable`, on every host that composes it (`Thing`, `Creature`).
 * It is its own concept, not containment's: what holds a thing and how big
 * it is never read each other (owner, 2026-11-15, W10-s). Only the
 * matter's own volume stays with what it is made of
 * (`Tangible.getMatterVolumeM3`); {@link Shaped.getVolumeM3} starts there.
 *
 * **IS for:** the derived size every reader of fit asks — `Container`'s
 * tape measure, `Placing`'s pocket and hanging length, `Exit`'s gap, a
 * body's worn bulk, the awkward pole.
 * **IS NOT for:** a place's size (its extent — `getLinearExtent()`,
 * `Container.bounds()`), or a vessel's capacity (`Bulkable`).
 *
 * See `docs/subsystems/size.md`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import {
  Dimensions,
  SIZE_DEFAULTS,
  type DimensionsSpec,
} from './Dimensions';
import type Form from '../../platform/idea/Form';
import { ExecutionContextApi, OMNI_SCOPE } from '../../api/execution-context';

/** Where the forms live (`platform/idea/Form`'s `FORM_ROOT`, restated to keep this substrate free of a value import). */
const FORM_ROOT = '/platform/idea/Form/';

/** The form rows being loaded on use right now — one load per row at a time. */
const FORM_LOADS = new Set<string>();

/** Public shape provided by ShapedMixin. */
export interface Shaped {
  /**
   * ⭐ The form this thing has — a `Form` row (`rod`, `sheet`, `block`,
   * `round`, `flexible`): the row's `shape:` when it says, else its
   * class's default. `null` while the row is not loaded (a thing whose
   * form is not resident has no known size, and nothing asks it to fit).
   */
  getShape(): Form | null;
  /** The form's word (`block`) — authored or the class default. */
  getShapeName(): string;
  /**
   * Load its form row (on use — P7) and answer it; `null` when the world
   * has no such row. The async seams that ask a size (an install, a verb)
   * await this first, so the sync reads below know the answer.
   */
  ensureShape(): Promise<Form | null>;
  /**
   * Name its form by word or path. Loads the row; throws on an unknown one
   * (P3). `null` returns it to its class's default.
   */
  setShape(word: string | null): Promise<void>;
  /**
   * ⭐ Its size: the authored box when there is one (the bole's length, a
   * sheath shaped to its blade), else derived — the form's proportions
   * scaled to {@link getVolumeM3}. A flexible thing answers its FLAT box.
   * `null` when its volume is unknown (no mass, no material, no form).
   */
  getDimensions(): Dimensions | null;
  /** Author a box (`{width, depth, height}` m); `null` derives it again. Throws on a non-positive side. */
  setDimensions(spec: DimensionsSpec | null): void;
  /**
   * Was its box authored? A hollow thing's DERIVED size measures only its
   * walls (mass over density), so a container's room is known only from an
   * authored box (or a vessel's capacity).
   */
  hasAuthoredSize(): boolean;
  /**
   * ⭐ How much room it takes, m³: its matter's volume when it is made of
   * something (`Tangible.getMatterVolumeM3`), or what a host knows better
   * (a vessel adds its inside, a stack its count, an assembly its parts, a
   * body its own density). `null` = unknown.
   */
  getVolumeM3(): number | null;
  /**
   * The room it takes packed: a rigid thing its volume (its box, when
   * authored); a flexible one packs with air and folds smaller
   * (`× FLEXIBLE_PACKING × foldPackingFactor()`).
   */
  getPackedVolumeM3(): number | null;
  /**
   * ⭐ The box it is FITTED by — through a mouth, into a box, along a belt
   * (D3–D4): a rigid thing its own {@link getDimensions}; a flexible one
   * gives, so its packed volume as a cube (a coat squeezes through what a
   * board of the same volume cannot). `null` when its size is unknown.
   */
  getFitBox(): Dimensions | null;
  /**
   * @hook ⭐ The folding seam (D3): what folding does to how a flexible thing
   * packs. `1` unfolded; a `Foldable` answers smaller when folded. The
   * folding build replaces the number with its crease model.
   */
  foldPackingFactor(): number;
}

export function ShapedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ShapedMixin extends Base {
    static _mixinName = 'ShapedMixin';

    /**
     * ⭐ Size (D1): the form by word, and an authored box only where it is
     * the point. Both unset on nearly every row — the size derives.
     */
    static fieldMeta: FieldMeta = {
      shape: { persistent: true, authorable: true },
      dimensions: { persistent: true, authorable: true },
    };

    /**
     * ⭐ The form a thing of this class has when its row says nothing (D1):
     * `block`. A class whose things are cloth, cord or paper says so
     * (`static defaultShape = 'flexible'`).
     */
    static defaultShape = 'block';

    /** The form's word, `null` = the class default. */
    private _shape: string | null = null;
    /** The authored box, `null` = derived. */
    private _dimensions: DimensionsSpec | null = null;

    protected get shape(): string | null {
      return this._shape;
    }
    protected set shape(value: string | null) {
      this._shape = value === null || value === undefined || value === '' ? null : String(value);
    }
    protected get dimensions(): DimensionsSpec | null {
      return this._dimensions ? { ...this._dimensions } : null;
    }
    protected set dimensions(value: DimensionsSpec | null) {
      this.setDimensions(value);
    }

    public getShapeName(): string {
      if (this._shape !== null) {
        const leaf = this._shape.slice(this._shape.lastIndexOf('/') + 1);
        return leaf;
      }
      const ctor = this.constructor as { defaultShape?: string };
      return ctor.defaultShape ?? 'block';
    }

    public getShape(): Form | null {
      const path = FORM_ROOT + this.getShapeName();
      const row = StuffApi.findByTemplatePath<Form>(path);
      if (row) return row;
      // ⭐ Load on use (P7): a sync read that misses starts the row loading
      // and answers "unknown" this once — never a boot entry. Only from the
      // omni scope: a commons row must never be minted inside a circle.
      if (!FORM_LOADS.has(path) && ExecutionContextApi.getCircleScope() === OMNI_SCOPE) {
        FORM_LOADS.add(path);
        void this.ensureShape().finally(() => FORM_LOADS.delete(path));
      }
      return null;
    }

    public async ensureShape(): Promise<Form | null> {
      try {
        return await StuffApi.singleton<Form>(FORM_ROOT + this.getShapeName());
      } catch {
        // No such row in this world: the size stays unknown.
        return null;
      }
    }

    public async setShape(word: string | null): Promise<void> {
      if (word === null || word === undefined || word === '') {
        this._shape = null;
        return;
      }
      const leaf = String(word).slice(String(word).lastIndexOf('/') + 1);
      // Throws on a form with no row (P3): a shape nobody wrote is not one.
      await StuffApi.singleton<Form>(FORM_ROOT + leaf);
      this._shape = leaf;
    }

    public setDimensions(spec: DimensionsSpec | null): void {
      if (spec === null || spec === undefined) {
        this._dimensions = null;
        return;
      }
      // The constructor validates every side (P3).
      this._dimensions = new Dimensions(spec.width, spec.depth, spec.height).toSpec();
    }

    public hasAuthoredSize(): boolean {
      return this._dimensions !== null;
    }

    public getDimensions(): Dimensions | null {
      const a = this._dimensions;
      if (a !== null) return new Dimensions(a.width, a.depth, a.height);
      const form = this.getShape();
      if (form === null) return null;
      const v = this.getVolumeM3();
      if (v === null || !(v > 0)) return null;
      return form.dimensionsFor(v);
    }

    public getVolumeM3(): number | null {
      // ⭐ The matter is what it is made of (Tangible's); the room it takes
      // starts there. A containable made of nothing has no known size.
      const self = this as unknown as Stuff;
      return MixinApi.isTangible(self) ? self.getMatterVolumeM3() : null;
    }

    public foldPackingFactor(): number {
      return 1;
    }

    public getFitBox(): Dimensions | null {
      if (this.getShape()?.isRigid() === false) {
        const packed = this.getPackedVolumeM3();
        if (packed === null || !(packed > 0)) return null;
        const side = Math.cbrt(packed);
        return new Dimensions(side, side, side);
      }
      return this.getDimensions();
    }

    public getPackedVolumeM3(): number | null {
      const rigid = this.getShape()?.isRigid() ?? true;
      if (rigid) {
        const a = this._dimensions;
        if (a !== null) return a.width * a.depth * a.height;
        return this.getVolumeM3();
      }
      const v = this.getVolumeM3();
      if (v === null) return null;
      return v * SIZE_DEFAULTS.FLEXIBLE_PACKING * this.foldPackingFactor();
    }
  }
  return ShapedMixin;
}

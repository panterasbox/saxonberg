/**
 * ConstructedMixin — the *form* axis of a made thing.
 *
 * The sibling of {@link TangibleMixin}'s material axis: a `Tangible` says
 * "made of steel"; a `Constructed` says "worked into plate". Composing this
 * mixin declares that a Stuff carries a {@link Construction} — a material
 * worked into a form with a per-channel response profile. Armor composes it
 * (its resist profile) and so do weapons (their delivery profile); later,
 * structures will (their crush profile).
 *
 * **Carrier shape (mirrors Tangible).** The durable field is the form
 * *word* (`constructionForm: string`, stable + human-readable in seeds),
 * validated against the `Construction` vocabulary on set. The inter-Stuff
 * contract is the value-object surface `getConstruction(): Construction |
 * null` / `setConstruction(Construction)` — other Stuff read the form as a
 * `Construction`, never the raw string. Immutable value reconstructed on
 * each read (HMR-safe, no cached instance).
 */

import type { MixinConstructor } from '../mixin';
import { Construction } from './Construction';

export interface Constructed {
  /** The persisted form word (e.g. `'plate'`). Host/persist surface. */
  getConstructionForm(): string;
  setConstructionForm(value: string): void;
  /** The construction as a value-object, or `null` when unset. The
   * inter-Stuff contract. */
  getConstruction(): Construction | null;
  setConstruction(value: Construction): void;
}

export function ConstructedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ConstructedMixin extends Base implements Constructed {
    static _mixinName = 'ConstructedMixin';
    static persistentFields = ['constructionForm'];

    /** The construction form word; empty = unset (no construction). */
    public constructionForm: string = '';

    getConstructionForm(): string {
      return this.constructionForm;
    }

    setConstructionForm(value: string): void {
      if (value !== '' && !Construction.isForm(value)) {
        throw new RangeError(
          `ConstructedMixin.setConstructionForm: unknown form '${value}'`,
        );
      }
      this.constructionForm = value;
    }

    getConstruction(): Construction | null {
      return this.constructionForm
        ? Construction.of(this.constructionForm)
        : null;
    }

    setConstruction(value: Construction): void {
      this.constructionForm = value.getForm();
    }
  };
}

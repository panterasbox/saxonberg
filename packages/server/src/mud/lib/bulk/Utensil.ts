/**
 * The **utensil kinds** — the small closed vocabulary of things you eat
 * *with*, as against the vessels you eat *out of*.
 *
 * ⭐ The kind lives on {@link CutleryMixin} below. It used to be the
 * `category` axis — the VESSEL kind, shared with vats and kegs — which is
 * what forced a horn spoon to be a `CraftVessel` with an interior slot it
 * never fills. A spoon is not a vessel; it is serviceware, which is a
 * different thing and now a different mixin.
 * Serviceware without contents.
 *
 * ⭐ **Why the kernel has to know the list.** `eat` claims a clean utensil
 * if one is in reach, and it cannot ask "is this a spoon?" without a
 * vocabulary. The alternative — a `utensil: true` flag on the row — puts
 * the answer somewhere the engine has to trust content for, and makes
 * adding a kind invisible. Enumerated here, adding one is a diff a
 * reviewer sees, which is the `lint:locations` roster precedent.
 *
 * ⚠ **A utensil is never a gate and never a grade.** `eat` with a spoon
 * and `eat` bare-handed both succeed; only the scene line differs. Food
 * you can only eat with the right implement is a lock disguised as
 * flavour, and this vocabulary must never become one.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** A thing you eat *with*. */
export type UtensilKind = 'spoon' | 'fork' | 'table-knife';

/**
 * The closed set, in the order `eat` prefers them — a spoon handles
 * anything a bowl holds, a fork most of what a plate does, and a table
 * knife is what is left when neither is to hand.
 */
export const UTENSIL_KINDS: readonly UtensilKind[] = [
  'spoon',
  'fork',
  'table-knife',
];

/** The player-facing phrase for eating with each kind. */
export const UTENSIL_PHRASE: Record<UtensilKind, string> = {
  spoon: 'with a spoon',
  fork: 'with a fork',
  'table-knife': 'with a table knife',
};

/** The method surface cutlery offers other Stuff. */
export interface Cutlery {
  getUtensilKind(): UtensilKind | '';
  setUtensilKind(value: UtensilKind | ''): void;
}

/**
 * CutleryMixin — ⭐ **what kind of utensil this is, on a host that is not
 * a vessel.**
 *
 * ⚠⚠ The kind used to be `category`, which lived on `BulkableMixin` — so
 * *"this is a spoon"* required *"this is a bulk vessel"*, and `eat` found
 * one by asking `MixinApi.isBulkable`. That is how the cutlery came to
 * carry an interior slot it never fills and an ice charge, and why
 * `CraftVessel.wash()` had to guard against part of its own host set.
 *
 * ⭐ `category` was right where it was — it is the VESSEL kind, shared
 * with vats, kegs, cans and sacks, and a vat has one without being
 * serviceware. The cutlery was borrowing a vocabulary that was never
 * about it. This field is the one that is.
 */
export function CutleryMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class CutleryMixin extends Base implements Cutlery {
    static _mixinName = 'CutleryMixin';

    static fieldMeta: FieldMeta = {
      utensilKind: { persistent: true, authorable: true },
    };

    /** `spoon` / `fork` / `table-knife`; `''` before it is authored. */
    public utensilKind: UtensilKind | '' = '';

    getUtensilKind(): UtensilKind | '' {
      return this.utensilKind;
    }
    setUtensilKind(value: UtensilKind | ''): void {
      this.utensilKind = value;
    }
  };
}

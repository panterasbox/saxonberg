/**
 * The **utensil kinds** — the small closed vocabulary of things you eat
 * *with*, as against the vessels you eat *out of*.
 *
 * Both are the same `category` axis on {@link BulkableMixin} (the vessel
 * kind: `coupe`, `bowl`, `pot`, `spoon`), which is what lets a utensil be
 * an ordinary `CraftVessel` — claimed, soiled by use, washed at the basin,
 * counted on the house par — with its interior slot simply never filled.
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

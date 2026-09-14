/**
 * RecipeKnowledge — the **vocabulary** of the per-character recipe-
 * learning ladder: the chronicle keys it files under and the prose each
 * entry carries. Derived on read from the chronicle ledger (the renown
 * precedent: a dumb store, a smart consumer — no stored set, no mixin).
 *
 * ⭐ **The verbs are on the character, not here.** This was four
 * `public static`s taking `actor` as their first parameter — a verb whose
 * subject is a world object. They are now `persona.hasClaimed(key)` /
 * `hasDone(key)` / `recordChronicleOnce(key, entry)` on `PersonaMixin`,
 * which is key-agnostic so the kernel learns no content word. What is
 * left here is what genuinely belongs to crafting: which key, and what
 * the ledger line says.
 *
 *   unknown → known-of → can-make
 *
 *  - **known-of** — a chronicle `claim`, minted (once) when you read a
 *    recipe source (the menu). You know the steps to *attempt* it.
 *  - **can-make** — a chronicle `deed`, minted (once) on the first
 *    faithful manual build — the same act that transcribes + banks the
 *    personal recipe-script. The book isn't enough; the hands have to
 *    learn it.
 *
 * `make <recipe>` is gated on **can-make** (for catalogue recipes; a
 * player's own `def` needs no claim/deed). The gate is the recipe-
 * learning loop only — `RecipeCatalogue` stays openly resolvable; this is
 * the new per-character layer over it.
 *
 * Claim and deed use **distinct keys** (`recipe-known:` / `recipe-made:`)
 * — `recordOnce` dedups on `{owner, key}` regardless of kind, so a shared
 * key would make the deed no-op on the claim's row.
 */

import type { ChronicleEntryFields } from '../chronicle/ChronicleEntry';

export class RecipeKnowledge {
  /** The key a *known-of* claim is filed under. */
  static knownKey(recipeId: string): string {
    return `recipe-known:${recipeId}`;
  }

  /** The key a *can-make* deed is filed under. */
  static madeKey(recipeId: string): string {
    return `recipe-made:${recipeId}`;
  }

  /** The ledger line for reading of a recipe. */
  static knownEntry(name: string): ChronicleEntryFields {
    return { kind: 'claim', text: `Learned of ${name}.`, tags: ['recipe'] };
  }

  /** The ledger line for the first faithful build. */
  static madeEntry(name: string): ChronicleEntryFields {
    return { kind: 'deed', text: `Learned to make ${name}.`, tags: ['recipe'] };
  }
}

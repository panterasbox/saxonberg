/**
 * RecipeKnowledge — the per-character recipe-learning ladder, derived on
 * read from the chronicle ledger (the renown precedent: a dumb store, a
 * smart consumer — no stored set, no mixin).
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

import { MixinApi } from '../../api/mixin';
import type { Stuff } from "../stuff/Stuff";

function knownKey(recipeId: string): string {
  return `recipe-known:${recipeId}`;
}
function madeKey(recipeId: string): string {
  return `recipe-made:${recipeId}`;
}

export class RecipeKnowledge {
  /** True iff the actor has read of `recipeId` (a claim). */
  static async knowsOf(actor: Stuff, recipeId: string): Promise<boolean> {
    const key = knownKey(recipeId);
    if (!MixinApi.isPersona(actor)) return false;
    const entries = await actor.chronicleEntries();
    return entries.some((e) => e.kind === "claim" && e.key === key);
  }

  /** True iff the actor has learned to make `recipeId` (a deed). */
  static async canMake(actor: Stuff, recipeId: string): Promise<boolean> {
    const key = madeKey(recipeId);
    if (!MixinApi.isPersona(actor)) return false;
    const entries = await actor.chronicleEntries();
    return entries.some((e) => e.kind === "deed" && e.key === key);
  }

  /** Mint the *known-of* claim (idempotent) — on reading a recipe source. */
  static async noteKnown(
    actor: Stuff,
    recipeId: string,
    name: string,
  ): Promise<void> {
    if (!MixinApi.isPersona(actor)) return;
    await actor.recordChronicleOnce(knownKey(recipeId), {
      kind: "claim",
      text: `Learned of ${name}.`,
      tags: ["recipe"],
    });
  }

  /** Mint the *can-make* deed (idempotent) — the first faithful build. */
  static async noteMade(
    actor: Stuff,
    recipeId: string,
    name: string,
  ): Promise<void> {
    if (!MixinApi.isPersona(actor)) return;
    await actor.recordChronicleOnce(madeKey(recipeId), {
      kind: "deed",
      text: `Learned to make ${name}.`,
      tags: ["recipe"],
    });
  }
}

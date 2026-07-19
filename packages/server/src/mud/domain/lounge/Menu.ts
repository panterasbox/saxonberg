/**
 * Menu — the **offer**: a curated list of orderable recipes, modeled as its
 * own `Tangible` object you `read`/`order` from.
 *
 * Deliberately a standalone object, **not** a place capability and **not**
 * tied to the maker or the kitchen. The offer is a distinct concept from
 * craftability (a place can offer what it doesn't make) and from where the
 * crafting happens (order at the table, made in the back) — so the menu is a
 * `Thing` that merely references recipe ids. Its presence in a room is what
 * lights up the crafting verb surface (`commandContributions`), keeping
 * "Dave's Bar is emergent" honest: the verbs appear because the menu is
 * there, not because the room is flagged.
 *
 * Composes `Thing` (Tangible + Perceptible + Containable + Visible) +
 * `Detailed`, so it sits in the room, resolves by `read menu`, and renders
 * its offer.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { PricedOfferMixin } from '../../lib/commerce/PricedOffer';
import { MqlApi } from '../../api/mql';
import type { CommandContext, CommandContributions } from '../../api/command';
import { CraftingApi } from '../../api/crafting';

// Thing already composes Visible + Perceptible + Tangible + Containable;
// PricedOfferMixin supplies the shared `prices` list + `priceFor`.
const MenuBase = PricedOfferMixin(DetailedMixin(Thing));

export default class Menu extends MenuBase {
  // `prices` rides in via PricedOfferMixin; only the offer list is local.
  static persistentFields = ['offeredRecipes'];

  /**
   * Resolve the menu an `order` / `menu` command works off: the affording
   * menu (an affordance click sets it as `commandSource`), else the menu
   * among the room's occupants. Object enumeration goes through MQL (the
   * `peers` seed), not a hand-rolled containment scan; the `instanceof`
   * check is the interim type filter. Callers with an explicit `named`
   * target resolve that first (already MQL-bound) before falling back here.
   */
  static resolveIn(context: CommandContext): Menu | null {
    const source = context.commandSource;
    if (source instanceof Menu) return source;
    const peers = MqlApi.resolveMany('peers', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    });
    return peers.stuff.find((s): s is Menu => s instanceof Menu) ?? null;
  }

  /**
   * The crafting verb surface lights up wherever a Menu is present (in the
   * room, or carried). `serve`/`mix` are the atomic maker verbs (maker =
   * the giver); `order` routes to a present fulfilling maker. The
   * manual-build verbs (`pour`/`add`/`stir`/`shake`/`strain`/`garnish`)
   * are the step-by-step path — engaged activities over a build vessel.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/serve.yaml',
      'crafting/mix.yaml',
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/strain.yaml',
      'crafting/garnish.yaml',
      'crafting/make.yaml',
    ],
    inventory: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/serve.yaml',
      'crafting/mix.yaml',
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/strain.yaml',
      'crafting/garnish.yaml',
      'crafting/make.yaml',
    ],
    peers: [],
  };

  /** Recipe ids this menu offers (references the `recipes` collection). */
  public offeredRecipes: string[] = [];

  // `prices` + `priceFor(recipeId)` are inherited from PricedOfferMixin
  // (the shared authored price-list; an unpriced recipe is served free).

  getOfferedRecipeIds(): readonly string[] {
    return this.offeredRecipes;
  }

  setOfferedRecipes(value: string[]): void {
    this.offeredRecipes = [...value];
  }

  hasOfferedRecipe(recipeId: string): boolean {
    return this.offeredRecipes.includes(recipeId);
  }

  addOfferedRecipe(recipeId: string): void {
    if (!this.offeredRecipes.includes(recipeId)) {
      this.offeredRecipes.push(recipeId);
    }
  }

  /**
   * Map an order keyword to an **offered** recipe id, or null. Gates on the
   * offer (what's on the menu), not on craftability — the maker + reachable
   * matter decide whether it can actually be made.
   */
  async resolveOrder(keyword: string): Promise<string | null> {
    const view = await CraftingApi.lookupRecipe(keyword);
    if (!view) return null;
    return this.offeredRecipes.includes(view.recipeId) ? view.recipeId : null;
  }

  /** Append the offered cocktails to the description (sync; the `menu` verb renders the full view). */
  override getLong(): string {
    const base = super.getLong();
    if (this.offeredRecipes.length === 0) return base;
    return `${base} It lists: ${this.offeredRecipes.join(', ')}.`;
  }
}

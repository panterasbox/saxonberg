/**
 * CommerceMenu — the venue-neutral **offer**: a curated list of orderable
 * recipes, modeled as its own `Tangible` object you `read`/`order` from.
 *
 * Deliberately a standalone object, **not** a place capability and **not**
 * tied to the maker or the kitchen. The offer is a distinct concept from
 * craftability (a place can offer what it doesn't make) and from where the
 * crafting happens (order at the table, made in the back) — so the menu is
 * a `Thing` that merely references recipe ids. A menu affords **commerce
 * only** — `menu` (read the offer) and `order` (buy off it). The working
 * verbs (`pour`/`hammer`/`cook`/…) are conferred by the *instruments*
 * that do the work (the capability table over `ToolMixin` — see
 * `lib/craft/ToolCapability.ts`): the menu is for ordering, not making.
 *
 * Composes `Thing` (Tangible + Perceptible + Containable + Visible) +
 * `Detailed` + `PricedOffer`, so it sits in the room, resolves by
 * `read menu`, renders its offer, and prices it.
 */

import Good from '../stuff/Good';
import { PricedOfferMixin, type Offering, type OrderAnswer, type OrderDone, type OrderRefusal, type OrderRequest } from './PricedOffer';
import { RecipeKnowledge } from '../craft/RecipeKnowledge';
import { ContainmentApi } from '../../api/containment';
import { EmploymentApi } from '../../api/employment';
import { MixinApi } from '../../api/mixin';
import type { Attendant } from '../attendant/Attendant';
import type { Stuff } from '../stuff/Stuff';
import type { ActDone } from '../craft/ActPlan';
import type { Container } from '../spatial/Container';
import { MqlApi } from '../../api/mql';
import type { CommandContext, CommandContributions } from '../../api/command';
import { CraftingApi } from '../../api/crafting';
import type { FieldMeta } from '../mixin';

// Thing already composes Visible + Perceptible + Tangible + Containable;
// PricedOfferMixin supplies the shared `prices` list + `priceFor`.
const CommerceMenuBase = PricedOfferMixin(Good);

export default class CommerceMenu extends CommerceMenuBase {
  // `prices` rides in via PricedOfferMixin; only the offer list is local.
  static fieldMeta: FieldMeta = {
    offeredRecipes: { persistent: true },
  };

  /**
   * The commerce surface — every menu, any venue: read the offer, order
   * off it. Working verbs are instrument-conferred, never menu-conferred.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/retail/menu.yaml', 'platform/cmd/retail/order.yaml'],
    environment: ['platform/cmd/retail/menu.yaml', 'platform/cmd/retail/order.yaml'],
  };


  /**
   * The recipes this menu offers, by **document path**
   * (`/trade/hospitality/recipes/martini`) — an authored citation names the
   * path (the census lint checks each one ships). An order is matched by the
   * recipe's word, which is the path's leaf.
   */
  public offeredRecipes: string[] = [];

  // `prices` + `priceFor(recipeId)` are inherited from PricedOfferMixin
  // (the shared authored price-list; an unpriced recipe is served free).

  getOfferedRecipeIds(): readonly string[] {
    return this.offeredRecipes;
  }

  setOfferedRecipes(value: string[]): void {
    this.offeredRecipes = [...value];
  }

  /** Whether the menu offers the recipe whose word (path leaf) is `recipeId`. */
  hasOfferedRecipe(recipeId: string): boolean {
    return this.offeredRecipes.some((p) => leafOf(p) === recipeId);
  }

  /** Offer the recipe at `path`. */
  addOfferedRecipe(path: string): void {
    if (!this.offeredRecipes.includes(path)) {
      this.offeredRecipes.push(path);
    }
  }

  /**
   * ⭐ The recipes on the menu. Reading a recipe source marks each one
   * *known-of* for the reader — a chronicle claim (idempotent: re-reading
   * doesn't duplicate). Known-of lets you attempt the manual build; making
   * it is the deed (the ladder).
   */
  override async offerings(reader: Stuff): Promise<readonly Offering[]> {
    const offered = await CraftingApi.offeredRecipes(this);
    if (MixinApi.isPersona(reader)) {
      for (const recipe of offered) {
        await reader.recordChronicleOnce(
          RecipeKnowledge.knownKey(recipe.recipeId),
          RecipeKnowledge.knownEntry(recipe.name),
        );
      }
    }
    return offered.map((r) => ({ kind: 'recipe' as const, recipeId: r.recipeId, name: r.name }));
  }

  /**
   * Map an order keyword to an **offered** recipe id, or null. Gates on the
   * offer (what's on the menu), not on craftability — the maker + reachable
   * matter decide whether it can actually be made.
   */
  async resolveOrder(keyword: string): Promise<string | null> {
    const view = await CraftingApi.lookupRecipe(keyword);
    if (!view) return null;
    return this.hasOfferedRecipe(view.recipeId) ? view.recipeId : null;
  }

  /**
   * ⭐ `order` off a menu: resolve the phrase off the offer, then have the
   * fulfilling bartender (a present on-shift `fulfills` holder, resolved
   * inside `CraftingLogic`) make it — the maker is **never** off the wire
   * (the customer is the patron). The drink is handed to them.
   */
  override async orderPlanFor(req: OrderRequest): Promise<OrderAnswer> {
    const { by, location } = req;
    // Attendant: the bar runs the storefront-attention substrate. Being served
    // is gated on being attended — for the bar's scrum / zero-wait config this
    // is instant (the bartender gets to you), so behaviorally a no-op, but it
    // earns the lease (no idle hogging) and makes the bar run the same
    // subsystem the bank and ticket office do. A `closed` point (unstaffed +
    // close policy) refuses; the bar is self-service, so it won't.
    const point =
      location && MixinApi.isContainer(location)
        ? ((location as Stuff & Container)
            .getContents()
            .find((s) => MixinApi.isAttendant(s)) as (Stuff & Attendant) | undefined)
        : undefined;
    const person = by.getIdentityPath();
    if (point && person && point.requestAttention(person).status === 'closed') {
      return { ok: false, reason: 'unattended', facts: {} };
    }
    const recipeId = await this.resolveOrder(req.phrase);
    if (!recipeId) return { ok: false, reason: 'not-on-menu', facts: { phrase: req.phrase } };
    // Stand the venue's operator up BEFORE resolving the maker: the Business
    // is derived + stood up lazily (no standup hook), and its on-shift
    // conferral is what makes the present crafter an active holder of its
    // `fulfills` seat — a cold venue's first customer must find the roster
    // already on shift, not a no-maker decline.
    const venuePath = location?.getTemplatePath() ?? null;
    if (venuePath) await EmploymentApi.ensureOperatorAt(venuePath);
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: { kind: 'now' },
      onComplete: async (): Promise<ActDone<OrderDone, OrderRefusal>> => {
        const outcome = await CraftingApi.craft({
          recipeRef: recipeId,
          makerMode: 'fulfilling-bartender',
          brand: req.brand,
        });
        if (!outcome.ok) {
          return { ok: false, reason: outcome.reason, facts: { craft: outcome, stage: 'make' } };
        }
        const drink = outcome.output;
        if (MixinApi.isContainable(drink) && MixinApi.isContainer(by)) {
          ContainmentApi.move(drink, by);
        }
        // The drink purchase: if the menu prices this recipe, the venue takes
        // payment through the one settle-a-sale path (credential → cash; the
        // bar remits the demo tax). Unpriced recipes are served free. A failed
        // settlement still serves the drink (the bar eats it / runs a tab).
        const price = this.priceFor(recipeId);
        const paid =
          price != null
            ? await EmploymentApi.settleSale(venuePath, price, price, 'a drink')
            : null;
        return { ok: true, facts: { kind: 'drink', drink, tail: paid ? ` ${paid.tail}` : '' } };
      },
    };
  }

  /** Append the offer to the description (sync; the `menu` verb renders the full view). */
  override getLong(): string {
    const base = super.getLong();
    if (this.offeredRecipes.length === 0) return base;
    return `${base} It lists: ${this.offeredRecipes.map(leafOf).join(', ')}.`;
  }
}

/** A recipe's word: its path's last segment. */
function leafOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

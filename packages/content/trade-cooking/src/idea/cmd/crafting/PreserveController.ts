/**
 * PreserveController — the shared body of the preserving acts
 * (`cure` / `dry` / `smoke`).
 *
 * ⭐ **One act, three treatments, and the difference is entirely a recipe
 * row.** Each subclass names a recipe id and nothing else; what the
 * treatment *does* to the food is the recipe's `cure: { moisture?,
 * solute? }` block, which the craft applies to the output's water state.
 * A fourth treatment — brining, sugaring, a pack's own smoke chamber — is
 * a recipe and a six-line subclass, and a fourth *strength* of an existing
 * one is a recipe alone.
 *
 * ⚠ **Deliberately NOT deed-gated**, unlike `cook`. The can-make deed is
 * earned by working a recipe faithfully by hand once, and the cooking
 * branch's by-hand path banks contributions into a pot — which is the
 * wrong shape for a transform that turns one discrete cut into another.
 * A gate whose key does not exist is a lock, so these follow `order`
 * rather than `cook`. When a by-hand preserving path lands, the gate is
 * one `requireDeed` call away.
 *
 * The target is **named and honoured**: `dry the cut I just salted` has to
 * reach that cut, or the hurdles could never be stacked deliberately. It
 * rides `CraftRequest.target`, which prefers it for any input slot it
 * satisfies.
 *
 * ## ⭐⭐ And the recipe is chosen by what you named
 *
 * A subclass used to resolve ONE fixed recipe id, which was fine while
 * every preserving recipe took meat. It stops being fine the moment a
 * second kind of matter is salted: a tanner salts a green hide to make it
 * travel, with the same act, the same salt and the same arithmetic — and
 * `cure <hide>` resolving `salt-cure` would have declined because a hide
 * does not satisfy a `meat` slot.
 *
 * So {@link PreserveController.recipeFor} picks, among the recipes that
 * share **this act's cure axis**, the one whose item slot the named target
 * actually satisfies; the subclass's own id is the default and the
 * fallback. ⭐ The axis is the filter because the axis IS the act: salting
 * raises `solute` whatever it is salting, and drying lowers `moisture`.
 * Nothing here learns the word *hide* — a pack that ships a row with a
 * `solute` cure and its own item category is reachable by `cure` with no
 * edit to this file, which is the test the placement had to pass.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import RecipeCatalogue from '@saxonberg/server/mud/platform/idea/RecipeCatalogue';

const TOPIC = 'act.deed';
const RECIPE_CATALOGUE = '/platform/idea/RecipeCatalogue';

export interface PreserveModel extends CommandModel {
  target?: MqlOneResult;
}

export abstract class PreserveController<
  M extends PreserveModel = PreserveModel,
> extends CraftController<M> {
  /** The recipe this act resolves by default. */
  protected abstract recipeId(): string;

  /**
   * The water-state axis this act moves — `'solute'` for salting,
   * `'moisture'` for drying. It is what makes two recipes the same ACT
   * over different matter, and it is the filter {@link recipeFor} uses.
   */
  protected abstract cureAxis(): 'moisture' | 'solute';

  /** `You <verb> …` — the first person half of the scene. */
  protected abstract selfLine(output: Stuff): ReturnType<typeof Mml.compose>;

  /** `<Actor> <verbs> …` — what the room sees. */
  protected abstract peerLine(
    actor: Stuff,
    output: Stuff,
  ): ReturnType<typeof Mml.compose>;

  async execute(model: M, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target?.stuff ?? null;

    if (model.target && !named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    const outcome = await CraftingApi.craft({
      recipeRef: await this.recipeFor(named),
      makerMode: 'self',
      ...(named ? { target: named } : {}),
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const output = outcome.output;
    if (MixinApi.isContainable(output) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(output, giver);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(this.selfLine(output))
      .toPeers(this.peerLine(giver, output))
      .send();
  }

  /**
   * ⭐ The recipe for what the player actually named.
   *
   * Among the recipes that move this act's axis, prefer one whose ITEM
   * slot the target satisfies — matched the way crafting matches it, on
   * the material's own free-form tags. Falls back to {@link recipeId},
   * which keeps every shipped call site behaving exactly as before: with
   * no target, or a target the default already handles, the default wins.
   *
   * ⚠ The default is checked FIRST and wins ties, so adding a second row
   * can never silently steer an existing act somewhere else.
   */
  protected async recipeFor(target: Stuff | null): Promise<string> {
    const fallback = this.recipeId();
    if (!target || !MixinApi.isTangible(target)) return fallback;
    const material = target.getMaterial();
    if (!material) return fallback;

    const catalogue = await StuffApi.singleton<RecipeCatalogue>(
      RECIPE_CATALOGUE,
    );
    const axis = this.cureAxis();
    const satisfies = (recipeId: string): boolean => {
      const recipe = catalogue.getRecipe(recipeId);
      if (!recipe) return false;
      const cure = recipe.getCure();
      if (!cure || cure[axis] === undefined) return false;
      for (const slot of recipe.getInputSlots()) {
        if ((slot.kind ?? 'bulk') !== 'item') continue;
        if (material.hasTag(slot.category)) return true;
      }
      return false;
    };

    if (satisfies(fallback)) return fallback;
    for (const recipe of catalogue.allRecipes()) {
      if (satisfies(recipe.getRecipeId())) return recipe.getRecipeId();
    }
    return fallback;
  }
}

/**
 * CarveController — `carve <part> [from <stock>] [with <edge>]`.
 *
 * Shapes one piece of wood into one part with an edge: a haft, a handle,
 * a peg, a dowel, a leg, a rail, a mallet. ⭐ **The by-hand rung of the
 * wood column** — no heat, no station, no second piece — and the reason
 * the tool tree has a root: a handle carved with a knife and a smith's
 * blade make a froe, and the froe rives the next blank.
 *
 * ## ⭐ A carving is a ROW, and this file knows none of them
 *
 * What can be carved is every installed recipe that takes **one item of
 * wood** and asks for **an edge** (`cutting`) and no heat — matched off
 * the recipe catalogue, never listed here. A pack that ships a spoon or
 * a bowl recipe in that shape is carvable the day it installs, with no
 * edit to this controller. The word the player says is the recipe's own
 * keyword (`carve haft`, `carve pick-haft`).
 *
 * The named stock is **preferred, not required** (`CraftRequest.target`):
 * `carve peg from the ash blank` takes that blank; `carve peg` takes the
 * cheapest wood in reach that will do.
 *
 * The edge is declared on the view (`reachable:[capability.cutting]`)
 * and checked here so a refusal can name it; the craft itself finds its
 * tools by capability, as every recipe does.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Recipe } from '@saxonberg/server/mud/lib/craft/Recipe';
import RecipeCatalogue from '@saxonberg/server/mud/platform/idea/RecipeCatalogue';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';

const TOPIC = 'act.deed';
const RECIPE_CATALOGUE = '/platform/idea/RecipeCatalogue';

/** The capability a carving asks for — an edge. */
export const CARVING_EDGE = 'cutting';
/** The material tag a carving's one slot takes. */
export const CARVING_STOCK = 'wood';

interface CarveModel extends CommandModel {
  /** The part to carve — a recipe word, read off `raw`. */
  thing?: MqlOneResult;
  /** The wood to carve it from, when named. */
  stock?: MqlOneResult;
  /** The edge the view's default bound, or the one named `with`. */
  knife?: MqlOneResult;
}

export default class CarveController extends CraftController<CarveModel> {
  async execute(model: CarveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const word = (model.thing?.raw ?? '').trim().toLowerCase();

    const catalogue = await StuffApi.singleton<RecipeCatalogue>(RECIPE_CATALOGUE);

    if (!word) {
      this.turnDown(
        context,
        'no-part',
        Mml.compose`Carve what? ${carvableList(catalogue)}`,
      );
      return;
    }

    // ⭐ A KEYED read — the word the player said, resolved by the
    // catalogue's own keyword index — then the one question this verb
    // asks of the row: is it a carving?
    const found = catalogue.getRecipe(word) ?? catalogue.findByKeyword(word);
    const recipe = found !== null && isCarving(found) ? found : null;
    if (recipe === null) {
      this.turnDown(
        context,
        'not-carvable',
        Mml.compose`You cannot carve '${word}' out of a piece of wood. ${carvableList(catalogue)}`,
      );
      return;
    }

    // The edge — bound by the view, never hunted.
    const knife = model.knife?.stuff ?? null;
    if (knife === null) {
      this.turnDown(
        context,
        'no-edge',
        Mml.compose`You have no edge to carve with. Anything that offers a cutting edge as a tool — a billhook, an axe, a pair of shears — will shape a blank.`,
      );
      return;
    }
    if (!MixinApi.isTool(knife) || !knife.hasCapability(CARVING_EDGE)) {
      this.turnDown(
        context,
        'wrong-tool',
        Mml.compose`${Mml.thing(knife)} has no edge you could carve with.`,
      );
      return;
    }

    const stock = model.stock?.stuff ?? null;
    if (model.stock && stock === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.stock.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'stock', query: model.stock.raw });
      return;
    }

    const outcome = await CraftingApi.craft({
      recipeRef: recipe.getRecipeId(),
      makerMode: 'self',
      // To hand — the Api lands, stamps and captures it.
      landing: 'hands',
      ...(stock ? { target: stock } : {}),
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }
    const output = outcome.output;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You work the wood down with ${Mml.thing(knife)}, following the grain, until it is ${Mml.thing(output)}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} whittles away at a piece of wood and holds up ${Mml.thing(output)}.`,
      )
      .send();
  }

  private turnDown(
    context: CommandContext,
    reason: string,
    text: ReturnType<typeof Mml.compose>,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/**
 * The refusal's list — every installed carving, by name.
 *
 * ⚠ The one whole-catalogue walk in this verb, and only on the refusal
 * path. The honest home for it is a keyed read on `RecipeCatalogue` (the
 * recipes needing a capability) — a kernel addition this pack cannot
 * make; the walk is the `PreserveController.recipeFor` shape until it
 * lands, so the refusal can still name what CAN be carved.
 */
function carvableList(catalogue: RecipeCatalogue): string {
  const names: string[] = [];
  for (const recipe of catalogue.allRecipes()) {
    if (isCarving(recipe)) names.push(recipe.getName().toLowerCase());
  }
  if (names.length === 0) return 'Nothing installed here is carved.';
  return `What a piece of wood will make: ${names.sort().join(', ')}.`;
}

/**
 * Is this recipe a carving — one item of wood, an edge, no heat, a
 * tangible thing out? Read off the row, so a pack's own carving qualifies
 * with no edit here.
 */
function isCarving(recipe: Recipe): boolean {
  if (recipe.getOutputApplication() !== 'tangible') return false;
  if (recipe.getRequiresHeatK() > 0) return false;
  const tools = recipe.getToolCapabilities();
  if (tools.length !== 1 || tools[0] !== CARVING_EDGE) return false;
  const slots = recipe.getInputSlots();
  if (slots.length !== 1) return false;
  const slot = slots[0]!;
  return (slot.kind ?? 'bulk') === 'item' && slot.category === CARVING_STOCK;
}

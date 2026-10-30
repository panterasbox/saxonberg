/**
 * CarveController — `carve <part> [on <target>] [from <stock>] [with <edge>]`.
 *
 * ⭐⭐ **Promoted to the platform (ceramics D14), and dumb.** `carve` is one
 * act — cutting away to a form with an edge — and two things can be carved:
 *
 *  1. a thing that plans its own carving (`CarvableMixin.carvePlanFor`),
 *     named ON (the target) or FROM (the stock): a leather-hard pot turns
 *     a foot (`GreenwareMixin`), a board cuts a founder's pattern
 *     (carpentry's `PatternStockMixin`), and each says itself why not;
 *  2. when it has nothing to say (`null`), the generic CARVING-RECIPE path
 *     below — the named thing is then the stock.
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

import { ManualBuildController } from './ManualBuildController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Recipe } from '../../../../lib/craft/Recipe';
import RecipeCatalogue from '../../RecipeCatalogue';
import { CraftingApi } from '../../../../api/crafting';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';

const TOPIC = 'act.deed';
const RECIPE_CATALOGUE = '/platform/idea/RecipeCatalogue';

/** The capability a carving asks for — an edge. */
const CARVING_EDGE = 'cutting';
/** The material tag a carving's one slot takes. */
const CARVING_STOCK = 'wood';

interface CarveModel extends CommandModel {
  /** The thing to carve on, when it plans its own carving (a green pot). */
  target?: MqlOneResult;
  /** The part to carve — a recipe word, read off `raw`. */
  thing?: MqlOneResult;
  /** The wood to carve it from, when named. */
  stock?: MqlOneResult;
  /** The edge the view's default bound, or the one named `with`. */
  knife?: MqlOneResult;
  /** ⭐ What a pattern is carved OF (`carve pattern of sword`). */
  of?: MqlOneResult;
  /** The metal a pattern is cut FOR, a word (`… for bronze`). */
  for?: MqlOneResult;
}

export default class CarveController extends ManualBuildController<CarveModel> {
  async execute(model: CarveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const word = (model.thing?.raw ?? '').trim().toLowerCase();

    // The object args, each told when it names nothing here.
    for (const field of ['target', 'stock', 'of'] as const) {
      const arg = model[field];
      if (arg && (arg.stuff ?? null) === null) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You don't see any '${arg.raw}' here.`)
          .send();
        context.note({ kind: 'empty-result', field, query: arg.raw });
        return;
      }
    }

    // ⭐ ONE request, asked of the thing named — what to carve ON, else
    // what to carve it FROM. It plans, refuses in its own words, or has
    // nothing to say (`null`), and then the recipe path below takes the
    // word: a board plans a pattern, and a peg off it is a recipe
    // (B103 — this verb no longer knows what a pattern is).
    const target = model.target?.stuff ?? null;
    const named = target ?? model.stock?.stuff ?? null;
    if (named !== null && MixinApi.isCarvable(named)) {
      const plan = await named.carvePlanFor({
        actor: giver,
        word,
        knife: model.knife?.stuff ?? null,
        ...(model.of ? { of: model.of.stuff ?? null } : {}),
        forWord: (model.for?.raw ?? '').trim().toLowerCase(),
      });
      if (plan !== null) {
        if (!plan.ok) {
          this.turnDown(context, plan.reason, plan.line);
          return;
        }
        await this.engagePlan(context, plan);
        return;
      }
    }
    // A copy OF something is only ever a thing's own plan.
    if (model.of) {
      this.turnDown(
        context,
        'not-carvable',
        Mml.compose`Nothing here will carve a copy of ${Mml.thing(model.of.stuff!)}. Name the piece to carve it from.`,
      );
      return;
    }

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

    // `carve peg on board` and `carve peg from board` are one carving.
    const stock = model.stock?.stuff ?? target;

    const outcome = await CraftingApi.craft({
      recipeRef: recipe.getRecipeId(),
      makerMode: 'self',
      // To hand — the Api lands, stamps and captures it.
      landing: 'hands',
      // ⭐ Carving cuts the stock down: the part is its own size and the
      // rest is shavings (a dowel off a board is not the board's weight).
      subtractive: true,
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

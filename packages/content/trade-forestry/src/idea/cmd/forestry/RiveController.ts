/**
 * RiveController — `rive <bole|billet> [into <what>] [with <froe>]`.
 *
 * ⭐⭐ **Riving is splitting wood along its grain**, with a froe and a
 * mallet: set the blade on the end grain, strike it in, lever the handle,
 * and the wood opens along its own fibres wherever they go. Every fibre
 * in what comes off runs its whole length, which is why a riven stave
 * holds liquor and a riven haft does not snap. It is the first rung of
 * the wood column after the axe.
 *
 * Two arms, and the TARGET chooses:
 *
 *  - **a bole** — the felled trunk on the ground. One length comes off it
 *    (`Bole.takeLength`, the same length `fell bole` cross-cuts) and is
 *    split into a stack of green **billets**, of the bole's own species.
 *    An engaged act: your hands are on the froe until it is done.
 *  - **a billet** — split again, into whatever the installed trades rive
 *    out of one: a woodworker's blank, a cooper's stave. ⭐ This file
 *    knows none of them. It asks the recipe catalogue for the recipes that
 *    take one piece of this wood under `riving`; `into <word>` chooses
 *    among them, and with one installed there is nothing to choose. A
 *    second trade that rives something out of a billet is a recipe row.
 *
 * The froe is declared on the view (`reachable:[capability.riving]`) —
 * the capability, never a class, since a froe is a `Tool` row.
 *
 * ⚠ `split` is NOT an alias: a ground protocol owns that word.
 *
 * ⚠⚠ The bole arm's completion is a **module-level function**: the
 * controller clone is destructed when `execute` returns, and an engaged
 * act completes long after.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Recipe } from '@saxonberg/server/mud/lib/craft/Recipe';
import RecipeCatalogue from '@saxonberg/server/mud/platform/idea/RecipeCatalogue';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Bole, { TIMBER_MASS_KG } from '../../../thing/Bole';
import Billet from '../../../thing/Billet';
import { FORESTRY_TOPIC } from './FellController';

/** The capability a froe offers, and riving asks for. */
export const RIVING = 'riving';
/** The billet row a bole is riven into. */
export const BILLET_PATH = '/trade/forestry/thing/billet';
/**
 * Kilograms in one billet — what the billet row authors as its `mass` (a
 * stack's mass is per unit); a test holds the two together. One length
 * off a bole is eight of them.
 */
export const BILLET_KG = 3;
/** Game-ms riving one length into billets takes. */
export const RIVE_MS = 20_000;
/** Endurance points it costs — the cross-cut's, a mallet being lighter than a saw. */
export const RIVE_COST = 5;

const RECIPE_CATALOGUE = '/platform/idea/RecipeCatalogue';
const ENDURANCE = 'endurance';

export interface RiveModel extends CommandModel {
  /** The bole or billet to rive. */
  target?: MqlOneResult;
  /** What to rive a billet into — a recipe word. */
  into?: string;
  /** The froe the view's default bound, or the one named `with`. */
  froe?: MqlOneResult;
}

export default class RiveController extends ManualBuildController<RiveModel> {
  async execute(model: RiveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const target = model.target?.stuff ?? null;
    if (target === null) {
      if (model.target) {
        this.turnDown(
          context,
          'unknown-target',
          Mml.compose`You don't see any '${model.target.raw}' here.`,
        );
      } else {
        this.turnDown(context, 'no-target', Mml.compose`Rive what? A felled bole, or a billet off one.`);
      }
      return;
    }

    // The froe — bound by the view, never hunted.
    const froe = model.froe?.stuff ?? null;
    if (froe === null) {
      this.turnDown(
        context,
        'no-froe',
        Mml.compose`You have nothing to rive with. That wants a froe — a smith's blade on a carved handle — and something to strike it with.`,
      );
      return;
    }
    if (!MixinApi.isTool(froe) || !froe.hasCapability(RIVING)) {
      this.turnDown(
        context,
        'wrong-tool',
        Mml.compose`${Mml.thing(froe)} will not split wood along its grain. That wants a froe.`,
      );
      return;
    }

    if (target instanceof Bole) {
      this.riveBole(context, target);
      return;
    }
    if (target instanceof Billet) {
      await this.riveBillet(context, target, (model.into ?? '').trim().toLowerCase());
      return;
    }
    this.turnDown(
      context,
      'not-rivable',
      Mml.compose`${Mml.thing(target)} is not a thing you rive. A froe goes into the end of a felled bole, or of a billet split off one.`,
    );
  }

  /** `rive bole` — one length off the trunk, split into billets. */
  private riveBole(context: CommandContext, bole: Bole): void {
    const giver = context.commandGiver;
    if (bole.getLengthsLeft() <= 0) {
      this.turnDown(
        context,
        'bole-spent',
        Mml.compose`There is nothing left in ${Mml.thing(bole)} but the butt.`,
      );
      return;
    }
    this.spend(giver, RIVE_COST);
    this.engageStep(context, {
      durationMs: RIVE_MS,
      effortW: 550,
      beginSelf: Mml.compose`You set the froe to the end of ${Mml.thing(bole)} and drive it in. The wood starts to open along its grain.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets a froe to ${Mml.thing(bole)} and starts riving.`,
      onComplete: () => {
        void finishRiveBole(giver, bole);
      },
    });
  }

  /**
   * `rive billet [into <what>]` — split again, into whichever installed
   * recipe takes this billet under `riving`. Chosen by the word, or the
   * only one there is; ambiguous or unknown, the refusal names the choices.
   */
  private async riveBillet(
    context: CommandContext,
    billet: Billet,
    word: string,
  ): Promise<void> {
    const giver = context.commandGiver;
    const material = billet.getMaterial();
    const catalogue = await StuffApi.singleton<RecipeCatalogue>(RECIPE_CATALOGUE);

    let recipe: Recipe | null = null;
    if (word) {
      // ⭐ A KEYED read — the player's word through the catalogue's own
      // index — then the one question this verb asks of the row.
      const found = catalogue.getRecipe(word) ?? catalogue.findByKeyword(word);
      recipe = found !== null && rivesFrom(found, material) ? found : null;
      if (recipe === null) {
        const choices = rivableNames(catalogue, material);
        this.turnDown(
          context,
          'not-rivable-into',
          Mml.compose`You cannot rive ${Mml.thing(billet)} into '${word}'. ${choices.length > 0 ? `It will split into ${choices.join(' or ')}.` : 'Nothing installed here is riven out of one.'}`,
        );
        return;
      }
    } else {
      const choices = rivableRecipes(catalogue, material);
      if (choices.length === 0) {
        this.turnDown(
          context,
          'nothing-to-rive',
          Mml.compose`There is nothing anybody here rives out of ${Mml.thing(billet)}.`,
        );
        return;
      }
      if (choices.length > 1) {
        const names = choices.map((r) => r.getName().toLowerCase()).sort();
        this.turnDown(
          context,
          'which-rive',
          Mml.compose`Rive ${Mml.thing(billet)} into what — ${names.join(' or ')}? Say \`rive billet into <what>\`.`,
        );
        return;
      }
      recipe = choices[0]!;
    }

    const outcome = await CraftingApi.craft({
      recipeRef: recipe.getRecipeId(),
      makerMode: 'self',
      // To hand — the Api lands, stamps and captures it.
      landing: 'hands',
      target: billet,
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(
        Mml.compose`You drive the froe into the end of ${Mml.thing(billet)} and lever, following the grain down, and it comes apart as ${Mml.thing(outcome.output)}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} rives a billet with a froe and a mallet.`,
      )
      .send();
  }

  /** Spend endurance. A no-op on a body that carries no reserves. */
  private spend(giver: Stuff, points: number): void {
    if (points <= 0 || !MixinApi.isReserved(giver)) return;
    if (!giver.hasReserve(ENDURANCE)) return;
    giver.adjustReserve(ENDURANCE, Quantity.of(-points, '%'));
  }

  private turnDown(
    context: CommandContext,
    reason: string,
    text: ReturnType<typeof Mml.compose>,
  ): void {
    MessageApi.scene(context.commandGiver).topic(FORESTRY_TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

/**
 * Does this recipe rive something out of one piece of `material`? — it
 * asks for `riving`, takes ONE item, and that item's category is a tag
 * this wood carries. Read off the row, so a pack's own riving recipe
 * qualifies with no edit here.
 */
function rivesFrom(recipe: Recipe, material: Material | null): boolean {
  if (!material) return false;
  if (recipe.getOutputApplication() !== 'tangible') return false;
  if (!recipe.getToolCapabilities().includes(RIVING)) return false;
  const slots = recipe.getInputSlots();
  if (slots.length !== 1) return false;
  const slot = slots[0]!;
  return (slot.kind ?? 'bulk') === 'item' && material.hasTag(slot.category);
}

/**
 * Every installed recipe that rives out of this wood.
 *
 * ⚠ The whole-catalogue walk this verb makes when no word chose for it —
 * the bare `rive billet` must know whether there is exactly one answer.
 * The honest home is a keyed read on `RecipeCatalogue` (the recipes
 * needing a capability), a kernel addition this pack cannot make; the
 * walk is the `PreserveController.recipeFor` shape until it lands.
 */
function rivableRecipes(catalogue: RecipeCatalogue, material: Material | null): Recipe[] {
  const out: Recipe[] = [];
  for (const recipe of catalogue.allRecipes()) {
    if (rivesFrom(recipe, material)) out.push(recipe);
  }
  return out;
}

/** The refusal's list of choices, by name. */
function rivableNames(catalogue: RecipeCatalogue, material: Material | null): string[] {
  return rivableRecipes(catalogue, material)
    .map((r) => r.getName().toLowerCase())
    .sort();
}

/**
 * ⚠⚠ A MODULE function, never a method — see the header.
 *
 * One length off the bole, split into a stack of green billets of the
 * bole's own wood, landed where the bole lies and stamped to the hand
 * that rove them. Consume first: a failure leaves the bole, not double
 * the wood.
 */
async function finishRiveBole(giver: Stuff, bole: Bole): Promise<void> {
  if (giver.isDestroyed() || bole.isDestroyed()) return;
  const room = bole.getContainer();
  if (room === null || !MixinApi.isContainer(room)) return;
  const wood = bole.getMaterial();

  const left = bole.takeLength();

  const count = Math.max(1, Math.floor(TIMBER_MASS_KG / BILLET_KG));
  const billets = await StuffApi.clone<Stuff & Containable>(BILLET_PATH);
  if (wood && MixinApi.isTangible(billets)) billets.setMaterial(wood);
  // ⭐ A bole is green wood, and riving dries nothing.
  if (MixinApi.isSeasoning(billets)) billets.setSeasonedFraction(0);
  if (MixinApi.isStackable(billets)) billets.setQuantity(count);
  const maker = giver.getIdentityPath() ?? '';
  if (maker && MixinApi.isCrafted(billets)) billets.setMaker(maker);
  await ContainmentApi.land(billets, room as Stuff & Container, giver);

  if (left <= 0) {
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(
        Mml.compose`You rive the last length of ${Mml.thing(bole)} into ${GrammarApi.inWords(count)} billets. What is left is the butt and the brash.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} rives the last of ${Mml.thing(bole)} into billets.`)
      .send();
    await StuffApi.destruct(bole);
  } else {
    MessageApi.scene(giver)
      .topic(FORESTRY_TOPIC)
      .toSelf(
        Mml.compose`The length comes away from ${Mml.thing(bole)} and opens under the froe into ${GrammarApi.inWords(count)} billets. ${left === 1 ? 'One length left in it.' : `${GrammarApi.cap(GrammarApi.inWords(left))} lengths in it yet.`}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} rives a length off ${Mml.thing(bole)} into billets.`)
      .send();
    try {
      await PersistableApi.captureHostOf(bole);
    } catch (err) {
      console.warn('RiveController: capture failed:', err);
    }
  }
  if (MixinApi.isAdvancing(giver)) {
    try {
      await giver.creditDeed({ discipline: 'silviculture', difficulty: 'easy', outcome: 'success' });
    } catch (err) {
      console.warn('RiveController: recording the deed failed:', err);
    }
  }
}

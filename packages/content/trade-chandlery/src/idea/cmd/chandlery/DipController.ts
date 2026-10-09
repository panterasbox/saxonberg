/**
 * DipController — `dip [the cake] [in <pot>]`, and ⭐⭐ **one act over two
 * fats.**
 *
 * It resolves exactly one recipe, `candle`, which authors **no**
 * `outputMaterial`. That is the whole pack: the engine's own rule —
 * *empty ⇒ the output's material comes from the matched input* — means a
 * pot of beeswax dips a pale taper smelling of honey and a pot of tallow
 * dips a greasy one smelling of mutton, and nothing anywhere branches on
 * which.
 *
 * ## ⚠ Why there is a verb here at all
 *
 * The plan said *no new verb — platform `make`*. That premise is wrong,
 * and it is worth writing down: `make <recipe>` dispatches a recipe
 * **script** (a session `def`, or a learned home recipe transcribed by a
 * faithful hand build), not an authored catalogue recipe. Every trade in
 * the tree ships its own craft verb for the catalogue — `cook`, `mix`,
 * `forge`, `bake`, `press` — and this one is no exception.
 *
 * ## ⭐⭐⭐ ONE verb, and the melt is the first half of it
 *
 * `melt` shipped as a second verb for one build, on the argument that
 * the pot has to be filled before anything can be dipped out of it and
 * that beeswax arrives as a cake where tallow arrives liquid in a crock.
 * The asymmetry is real; the second verb was not. It was the first STEP
 * of the only act this pack has, and the verb-collision ladder's first
 * rung is *unify behind an interface*.
 *
 * So the fall-through below is the whole of that unification: the candle
 * is attempted first, and only if the pot has nothing to give does the
 * act reach for something solid and melt it down. Three consequences
 * worth stating, because each is the reason for a line of code:
 *
 *  - **Tallow never melts.** A poured crock satisfies the candle slot on
 *    the first attempt, so the second leg never runs — exactly the
 *    asymmetry the two verbs were claiming, now expressed as a code path
 *    that is simply not taken.
 *  - **The melt is NARRATED.** `melt the cake` reads *it softens, slumps
 *    and goes clear* and then *a candle builds up on the wick*. An alias
 *    that silently overshot the word the player typed would be worse
 *    than the second verb it replaced.
 *  - ⚠ **The decline tells the truth about which leg failed.** If the
 *    player NAMED a solid, a failed melt declines as the melt — they
 *    said melt, so tell them why the melt would not go. If they named
 *    nothing, the honest refusal is the candle's: there is no fat in the
 *    pot.
 *
 * ## ⭐ No deed gate, and the reason is the whole of lens 2
 *
 * The recipe authors no `discipline` and no `difficulty`, so `canMake`
 * returns true for anybody and `requireDeed` is not called. A candle is
 * the one made thing in the game a person with no trade at all can
 * produce, which is correct: dipping a wick in fat is not a skill, and a
 * gate whose key does not exist is a lock. What is hard is **buying the
 * right fat at the right price**, which is a market judgement and is why
 * this pack mints no Discipline.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type {
  MqlManyResult,
  MqlOneResult,
} from '@saxonberg/server/mud/api/mql';
import type { CraftOutcome } from '@saxonberg/server/mud/api/crafting';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Candle from '../../../thing/Candle';

const TOPIC = 'act.deed';
const RECIPE = 'candle';
/** The step that fills the pot when what you have is a cake. */
const MELT_RECIPE = 'melt-wax';

interface DipModel extends CommandModel {
  solid?: MqlOneResult;
  pot?: MqlManyResult;
}

export default class DipController extends CraftController<DipModel> {
  async execute(model: DipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.solid?.stuff ?? null;

    if (model.solid && !named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.solid.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'solid',
        query: model.solid.raw,
      });
      return;
    }

    let outcome = await this.dipOnce();

    // ⭐⭐ THE SEAM. `insufficient-input` is the pot having nothing in it
    // that carries `candle-stock` — which is what a cold cake of wax on
    // the bench looks like to the candle recipe. Melt it and try again.
    if (!outcome.ok && outcome.reason === 'insufficient-input') {
      const melted = await CraftingApi.craft({
        recipeRef: MELT_RECIPE,
        makerMode: 'self',
        // ⭐ The named cake is PREFERRED for the slot it satisfies, so
        // `melt the dark cake` reaches that cake rather than whichever
        // one was nearest — the same reason `dry the cut I just salted`
        // has to.
        ...(named ? { target: named } : {}),
      });
      if (melted.ok) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`It softens, slumps and goes clear, and you have a pot of it.`,
          )
          .toPeers(
            Mml.compose`${Mml.actor(giver)} melts something down in a pot.`,
          )
          .send();
        outcome = await this.dipOnce();
      } else if (named) {
        // They said `melt <this>`; the melt is the leg that failed.
        outcome = melted;
      }
    }

    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const candle = outcome.output;
    // ⭐ The smell is stamped from the material here rather than authored
    // on the row, which is what lets one row be both candles.
    if (candle instanceof Candle) {
      candle.adoptMaterialSmell();
      // ⭐ And the fat it was dipped in is what it BURNS — the fire
      // build made a burner's fuel a bed, so the dip charges it the
      // same way it stamps the smell.
      candle.adoptMaterialFuel();
    }
    if (MixinApi.isContainable(candle) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(candle, giver);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You run a wick down into the pot and up again, and again, until ${Mml.thing(candle)} has built up on it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} dips a candle.`)
      .send();
  }

  /**
   * One attempt at the candle. Called twice when the pot had to be
   * filled first — the resolve reads the world fresh each time, so the
   * second call sees the wax the melt just poured in.
   */
  private async dipOnce(): Promise<CraftOutcome> {
    return CraftingApi.craft({ recipeRef: RECIPE, makerMode: 'self' });
  }
}

/**
 * DipController — `dip [in <pot>]`, and ⭐⭐ **one act over two fats.**
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
 * `forge`, `bake`, `press` — and this one is no exception. Two verbs
 * rather than one because the pot has to be filled before anything can
 * be dipped in it, and `melt` is that.
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
import type { MqlManyResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Candle from '../../../thing/Candle';

const TOPIC = 'act.deed';
const RECIPE = 'candle';

interface DipModel extends CommandModel {
  pot?: MqlManyResult;
}

export default class DipController extends CraftController<DipModel> {
  async execute(_model: DipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const outcome = await CraftingApi.craft({
      recipeRef: RECIPE,
      makerMode: 'self',
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const candle = outcome.output;
    // ⭐ The smell is stamped from the material here rather than authored
    // on the row, which is what lets one row be both candles.
    if (candle instanceof Candle) candle.adoptMaterialSmell();
    if (MixinApi.isContainable(candle) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(candle, giver);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You run a wick down into the pot and up again, and again, until ${Mml.thing(candle)} has built up on it.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} dips a candle.`,
      )
      .send();
  }
}

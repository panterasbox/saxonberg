/**
 * PlateController — `plate [<pot>] into <dish>` (the cooking terminal
 * mint — the strain of the cookhouse).
 *
 * At completion it hands the pot's accumulated buffer (+ its latched
 * heat) to `CraftingApi.mintFromBuild`, which reverse-matches it to a
 * recipe and fills the supplied dish with the authored food Material at
 * the portion (the generic pot-luck for an off-spec build), stamped with
 * the maker's mark. The first faithful hand build mints the can-make
 * deed + transcribes the personal recipe-script (the StrainController
 * capture tail, verbatim).
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Builds } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { ScriptApi } from '@saxonberg/server/mud/api/script';

const TOPIC = 'act.deed';
const PLATE_MS = 2500;

interface PlateModel extends CommandModel {
  vessel?: MqlOneResult;
  dish?: MqlOneResult;
}

export default class PlateController extends ManualBuildController<PlateModel> {
  execute(model: PlateModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const vessel: Stuff | null =
      model.vessel?.stuff ?? this.findBuildVessel(giver);
    if (!vessel || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(
        context,
        Mml.compose`Plate what? You need a pot you've been cooking in.`,
        'no-vessel',
      );
      return;
    }
    if (vessel.isBuildEmpty()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(vessel)} is empty — there's nothing to plate.`,
        'empty-build',
      );
      return;
    }
    const dish = model.dish?.stuff ?? null;
    if (!dish) {
      this.declineStep(
        context,
        Mml.compose`Plate it onto what? You need a dish.`,
        'no-dish',
      );
      return;
    }

    const makerPath =
      (ExecutionContextApi.getActingAuthor() as Stuff | null)?.getTemplatePath() ??
      '';
    const built: Stuff & Builds = vessel;
    const into = dish;
    const builder = giver;
    const commandText = context.commandText;

    this.engageStep(context, {
      durationMs: this.paceMs(PLATE_MS, vessel, ['pot']),
      beginSelf: Mml.compose`You begin plating ${Mml.thing(vessel)} onto ${Mml.thing(dish)}.`,
      onComplete: () => {
        void (async (): Promise<void> => {
          built.recordCommand(commandText);
          const sources = built.getCommandSources();
          const outcome = await CraftingApi.mintFromBuild({
            vessel: into,
            contributions: [...built.getContributions()],
            heatedToK: built.getHeatedToK(),
            makerPath,
          });
          if (!outcome.ok) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(Mml.compose`The plating goes wrong, and nothing comes together.`)
              .send();
            return;
          }
          const recipeId = outcome.recipeId;
          built.clearBuild();
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.compose`You plate up ${Mml.thing(outcome.output)}.`)
            .toPeers(Mml.compose`${Mml.actor(giver)} plates up ${Mml.thing(outcome.output)}.`)
            .send();

          // The knowledge ladder + demonstration capture (the same act).
          if (recipeId.length > 0 && sources.length > 0) {
            const view = await CraftingApi.lookupRecipe(recipeId);
            const name = view?.name ?? recipeId;
            const path = await ScriptApi.captureManualBuild(
              builder,
              recipeId,
              name,
              sources,
            );
            if (path !== null) {
              MessageApi.scene(giver)
                .topic(TOPIC)
                .toSelf(
                  Mml.compose`You've worked out how to cook ${name} — the recipe is yours now (try \`cook ${recipeId}\`).`,
                )
                .send();
            }
          }
        })().catch((err: unknown) => {
          console.error('PlateController: mint failed', err);
        });
      },
    });
  }
}

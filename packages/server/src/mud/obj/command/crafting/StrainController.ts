/**
 * StrainController — `strain [<vessel>] into <glass>` (the terminal mint).
 *
 * The terminal manual-build step. At completion it hands the vessel's
 * accumulated buffer to `CraftingApi.mintFromBuild`, which reverse-matches
 * it to a recipe and mints the graded, maker's-marked drink into the
 * player's glass — reusing the one quality model. The maker is captured
 * from `getActingAuthor` at dispatch (a real command frame) and carried,
 * since the mint runs at engaged-completion outside that frame.
 *
 * An off-spec build still yields *a* drink (the generic mint); only the
 * deed/knowledge gate (P9) cares whether it matched a recipe.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Builds } from "../../../lib/craft/ManualBuild";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { CraftingApi } from "../../../api/crafting";
import { ExecutionContextApi } from "../../../api/execution-context";
import { Transcriber } from "../../../lib/script/Transcriber";

const TOPIC = "world.narration.action";
const STRAIN_MS = 2500;

interface StrainModel extends CommandModel {
  vessel?: MqlOneResult;
  glass: MqlOneResult;
}

export default class StrainController extends ManualBuildController<StrainModel> {
  execute(model: StrainModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const vessel: Stuff | null =
      model.vessel?.stuff ?? this.findBuildVessel(giver);
    if (!vessel || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(
        context,
        Mml.compose`Strain what? You need a shaker or mixing glass you've built in.`,
        "no-vessel",
      );
      return;
    }
    if (vessel.isBuildEmpty()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.item(vessel)} is empty — there's nothing to strain.`,
        "empty-build",
      );
      return;
    }
    const glass = model.glass?.stuff ?? null;
    if (!glass) {
      this.declineStep(
        context,
        Mml.compose`Strain it into what? You need a glass.`,
        "no-glass",
      );
      return;
    }

    // Capture the maker from the live command frame; the mint runs later,
    // at engaged-completion, where no command frame exists.
    const makerPath =
      (ExecutionContextApi.getActingAuthor() as Stuff | null)?.getTemplatePath() ??
      "";
    const built: Stuff & Builds = vessel;
    const into = glass;
    // The builder + this strain's command text, captured for demonstration
    // capture (the mint + transcribe run later, outside the command frame).
    const builder = giver;
    const commandText = context.commandText;

    this.engageStep(context, {
      durationMs: STRAIN_MS,
      beginSelf: Mml.compose`You begin straining ${Mml.item(vessel)} into ${Mml.item(glass)}.`,
      onComplete: () => {
        void (async (): Promise<void> => {
          // Close the capture: the strain is the last step of the build.
          built.recordCommand(commandText);
          const sources = built.getCommandSources();
          const outcome = await CraftingApi.mintFromBuild({
            glass: into,
            contributions: [...built.getContributions()],
            method: built.getBuildMethod(),
            makerPath,
          });
          if (!outcome.ok) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(Mml.compose`The strain goes wrong, and nothing comes together.`)
              .send();
            return;
          }
          const recipeId = outcome.recipeId;
          built.clearBuild();
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.compose`You strain out ${Mml.item(outcome.output)}.`)
            .toPeers(Mml.compose`${Mml.name(giver)} strains out ${Mml.item(outcome.output)}.`)
            .send();

          // Demonstration capture: a hand-typed build that matched a recipe
          // transcribes into a named recipe-script banked to the builder's
          // home. A scripted replay records no sources → nothing to capture.
          if (recipeId.length > 0 && sources.length > 0) {
            await ExecutionContextApi.runRoot(
              StrainController,
              "transcribe",
              async () => {
                ExecutionContextApi.tagActingAuthor(builder);
                const path = await Transcriber.transcribe(recipeId, sources);
                if (path !== null) {
                  MessageApi.scene(giver)
                    .topic(TOPIC)
                    .toSelf(
                      Mml.compose`You've worked out how to make ${recipeId} — the recipe is yours now (try \`make ${recipeId}\`).`,
                    )
                    .send();
                }
              },
            );
          }
        })().catch((err: unknown) => {
          console.error("StrainController: mint failed", err);
        });
      },
    });
  }
}

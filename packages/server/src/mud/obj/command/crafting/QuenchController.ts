/**
 * QuenchController — `quench [<workpiece>]` (the smithing terminal mint).
 *
 * The strain of the smithy: at completion it hands the workpiece's
 * accumulated buffer (+ its latched heat) to `CraftingApi.mintFromBuild`,
 * which reverse-matches it to a recipe and mints the formed, stamped good
 * — **consuming the workpiece** (its Material + mass flow onto the
 * output). An off-spec build still yields *a* thing (the generic worked
 * lump). The first faithful hand build mints the can-make deed +
 * transcribes the personal recipe-script (the StrainController capture
 * tail, verbatim).
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Builds } from '../../../lib/craft/ManualBuild';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { CraftingApi } from '../../../api/crafting';
import { ContainmentApi } from '../../../api/containment';
import { ExecutionContextApi } from '../../../api/execution-context';
import { ScriptApi } from '../../../api/script';

const TOPIC = 'world.narration.action';
const QUENCH_MS = 2500;

interface QuenchModel extends CommandModel {
  target?: MqlOneResult;
}

export default class QuenchController extends ManualBuildController<QuenchModel> {
  execute(model: QuenchModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const workpiece: Stuff | null =
      model.target?.stuff ?? this.findBuildVessel(giver);
    if (!workpiece || !MixinApi.isBuildVessel(workpiece)) {
      this.declineStep(
        context,
        Mml.compose`Quench what? You need a workpiece you've been forging.`,
        'no-vessel',
      );
      return;
    }
    if (workpiece.isBuildEmpty()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.item(workpiece)} hasn't been worked — there's nothing to quench.`,
        'empty-build',
      );
      return;
    }

    const makerPath =
      (ExecutionContextApi.getActingAuthor() as Stuff | null)?.getTemplatePath() ??
      '';
    const built: Stuff & Builds = workpiece;
    const builder = giver;
    const commandText = context.commandText;

    // The anvil paces the terminal quench too. Quench is deliberately
    // not GATED on an anvil — pacing must not add a gate; rate 1 absent.
    const anvil = this.findCapability(giver, 'anvil');
    this.engageStep(context, {
      durationMs: this.paceMs(QUENCH_MS, anvil, ['anvil']),
      beginSelf: Mml.compose`You plunge ${Mml.item(workpiece)} into the slack tub with a hiss of steam.`,
      beginPeers: Mml.compose`${Mml.name(giver)} quenches ${Mml.item(workpiece)} in a burst of steam.`,
      onComplete: () => {
        void (async (): Promise<void> => {
          built.recordCommand(commandText);
          const sources = built.getCommandSources();
          const outcome = await CraftingApi.mintFromBuild({
            workpiece: built,
            contributions: [...built.getContributions()],
            heatedToK: built.getHeatedToK(),
            makerPath,
          });
          if (!outcome.ok) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(Mml.compose`The quench goes wrong, and nothing holds its shape.`)
              .send();
            return;
          }
          const recipeId = outcome.recipeId;
          // The workpiece was consumed by the mint; hand its successor over.
          const output = outcome.output;
          if (MixinApi.isContainable(output) && MixinApi.isContainer(giver)) {
            ContainmentApi.move(output, giver);
          }
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.compose`You draw ${Mml.item(output)} from the tub, finished.`)
            .toPeers(Mml.compose`${Mml.name(giver)} draws ${Mml.item(output)} from the tub.`)
            .send();

          // The knowledge ladder + demonstration capture — the first
          // faithful hand build mints the deed + the personal script
          // (StrainController's tail, the same act).
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
                  Mml.compose`You've worked out how to forge ${name} — the craft is yours now (try \`forge ${recipeId}\`).`,
                )
                .send();
            }
          }
        })().catch((err: unknown) => {
          console.error('QuenchController: mint failed', err);
        });
      },
    });
  }
}

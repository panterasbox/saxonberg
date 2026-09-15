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
 *
 * ⭐⭐ **And on an UN-worked hot piece it is a heat treatment**, which is
 * what quenching actually is. Heat a bar and drop it in the tub without
 * shaping it and you have not made anything — you have changed the
 * metal. What happens depends entirely on what is dissolved in it:
 *
 *  - **wrought iron** — nothing. There is no carbon to trap, so the
 *    steel does not harden, and the scene says so. That negative is the
 *    lesson: quenching is not a ritual that improves metal.
 *  - **steel** — it hardens. Carbon frozen in place where it had no time
 *    to leave, which is the entire reason the band matters.
 *  - **cast iron** — it CRACKS, and you have two halves. Brittle metal
 *    and a thermal shock is exactly this, and the pig was never going to
 *    be forged anyway.
 *
 * ⚠ `temper` is recorded and reported (`analyze chemistry`) with no
 * mechanical consumer in this build, and the next `heat` anneals it back
 * — because heating past the critical temperature is what annealing IS,
 * and it is why a smith quenches LAST.
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
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { ScriptApi } from '@saxonberg/server/mud/api/script';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Alloyed } from '@saxonberg/server/mud/lib/material/Alloyed';

const TOPIC = 'act.deed';
const QUENCH_MS = 2500;

const CARBON = '/stuff/idea/material/element/carbon';
/** The bottom of the steel band — below it there is nothing to harden. */
const C_STEEL_FLOOR = 0.002;
/** Austenite's limit — above it the metal is cast, and it shatters. */
const C_CAST_FLOOR = 0.021;

interface QuenchModel extends CommandModel {
  target?: MqlOneResult;
}

export default class QuenchController extends ManualBuildController<QuenchModel> {
  /**
   * The heat treatment: the piece's own carbon decides what a quench
   * does to it. ⚠ No recipe, no mint, no build — nothing is being MADE
   * here, and that is the point.
   */
  private treat(context: CommandContext, piece: Stuff & Alloyed): void {
    const giver = context.commandGiver;
    const carbon = piece.fractionOf(CARBON);
    const brittle = MixinApi.isTangible(piece)
      ? (piece.getMaterial()?.getTags() ?? []).includes('brittle')
      : false;
    const anvil = this.findCapability(giver, 'anvil');
    this.engageStep(context, {
      durationMs: this.paceMs(QUENCH_MS, anvil, ['anvil']),
      beginSelf: Mml.compose`You bring ${Mml.thing(piece)} up to colour and hold it over the slack tub.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} holds ${Mml.thing(piece)} over the slack tub.`,
      onComplete: () => {
        if (brittle || carbon >= C_CAST_FLOOR) {
          void crack(giver, piece);
          return;
        }
        if (carbon < C_STEEL_FLOOR) {
          // ⭐ The honest nothing. Quenching is not a ritual.
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              Mml.compose`Steam, and then nothing. ${Mml.thing(piece)} comes out of the tub exactly as soft as it went in — there is no carbon in it to trap, and quenching iron with nothing in it changes nothing at all.`,
            )
            .send();
          return;
        }
        piece.setTemper('hardened');
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`The tub boils and goes quiet. ${Mml.thing(piece)} comes out grey and dead-looking, and a file skates off it where it bit before — the carbon has been caught where it stood. It is hard now, and it will stay hard until the fire takes it back.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} quenches ${Mml.thing(piece)}; the tub boils.`)
          .send();
      },
    });
  }

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
      // ⭐ An un-worked piece that has been in the fire is not a mistake
      // — it is the other thing quenching does. Only a COLD one has
      // nothing to say.
      if (MixinApi.isAlloyed(workpiece) && workpiece.getHeatedToK() > 0) {
        this.treat(context, workpiece);
        return;
      }
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(workpiece)} hasn't been worked — there's nothing to quench.`,
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
      beginSelf: Mml.compose`You plunge ${Mml.thing(workpiece)} into the slack tub with a hiss of steam.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} quenches ${Mml.thing(workpiece)} in a burst of steam.`,
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
            .toSelf(Mml.compose`You draw ${Mml.thing(output)} from the tub, finished.`)
            .toPeers(Mml.compose`${Mml.actor(giver)} draws ${Mml.thing(output)} from the tub.`)
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

/**
 * ⚠ A thermal shock through brittle metal, and it does what a thermal
 * shock through brittle metal does. The pig is replaced by two halves of
 * it — the mass is conserved, because nothing was lost, only broken.
 */
async function crack(giver: Stuff, piece: Stuff & Alloyed): Promise<void> {
  const row = piece.getTemplatePath() ?? '';
  const wholeKg = MixinApi.isTangible(piece) ? piece.getMass().rawValue() : 0;
  const where = MixinApi.isContainable(piece) ? piece.getContainer() : null;
  if (!row || wholeKg <= 0 || !where || !MixinApi.isContainer(where)) return;

  const carbon = piece.getAlloying();
  StuffApi.destruct(piece);
  for (let i = 0; i < 2; i++) {
    const half = await StuffApi.clone<Stuff>(row);
    if (MixinApi.isTangible(half)) {
      half.setMass(Quantity.of(Number((wholeKg / 2).toFixed(3)), 'kg'));
    }
    if (MixinApi.isAlloyed(half)) half.setAlloying(carbon);
    if (MixinApi.isContainable(half)) ContainmentApi.move(half, where);
  }
  if (giver.isDestroyed()) return;
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      Mml.compose`It goes into the water and comes apart in your tongs with a sound like a dropped plate. Two pieces, a clean grey fracture down the middle, and both of them exactly as useless as the whole one was. Cast iron does not take a quench; it takes offence.`,
    )
    .toPeers(Mml.compose`Something cracks in ${Mml.actor(giver)}'s slack tub, loudly.`)
    .send();
}

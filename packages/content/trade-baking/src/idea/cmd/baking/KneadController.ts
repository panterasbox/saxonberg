/**
 * KneadController — `knead [<trough>]`.
 *
 * ⭐⭐ **`knead` is a mix method AND the build's terminal, and that pair
 * is deliberate.**
 *
 * The requirements say kneading is a method word, not a subsystem — and
 * it is: one controller, an open method string, no schema, nothing
 * anywhere switches on it. But a build buffer holds no bulk. It holds a
 * SNAPSHOT of contributions; the physical matter was already debited to
 * the discard sink at the pour. So a kneaded buffer cannot proof,
 * because there is nothing in the trough to proof.
 *
 * Kneading is therefore where the dough becomes matter: the same act
 * `strain` performs at the end of a cocktail, which is the shipped
 * terminal-mint shape. `CraftingApi.mintFromBuild` reverse-matches the
 * buffer with exact cover, fills the trough's own bulk slot, derives the
 * grade weakest-link, and — ⭐ since W2 — **carries the flour's parts
 * through into the dough's payload**, which is the third of the five
 * links that get an extraction from a millstone to a plate.
 *
 * ⚠ If a separate terminal is ever wanted (`shape`?), this is one
 * controller's worth of change. It was not added speculatively: a verb
 * nothing needs is a verb.
 *
 * ## What happens next is not this verb's business
 *
 * The trough is a `Vat`. The moment it holds `dough`, the maturation
 * substrate sees a batch whose `inputCategory` matches and the proof
 * begins — with no verb at all. Whether it catches wild flora or waits
 * for a pitched culture is decided by the cloth (the `Sealable` face),
 * not by anything here.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Builds } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';

const TOPIC = 'act.deed';
/** Kneading is work. Ten game-minutes of it, and your hands are in it. */
const KNEAD_MS = 10 * 60 * 1000;

interface KneadModel extends CommandModel {
  trough?: MqlOneResult;
}

export default class KneadController extends ManualBuildController<KneadModel> {
  execute(model: KneadModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const vessel: Stuff | null =
      model.trough?.stuff ?? null;
    if (!vessel || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(
        context,
        Mml.compose`Knead what? You need a trough you have been building in.`,
        'no-vessel',
      );
      return;
    }
    if (vessel.isBuildEmpty()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(vessel)} is empty. Put flour and water in it first.`,
        'empty-build',
      );
      return;
    }

    // Captured from the live command frame — the mint runs later, at
    // engaged-completion, where no command frame exists.
    const makerPath =
      (
        ExecutionContextApi.getActingAuthor() as Stuff | null
      )?.getIdentityPath() ?? '';
    const built: Stuff & Builds = vessel;
    const commandText = context.commandText;

    this.engageStep(context, {
      durationMs: KNEAD_MS,
      beginSelf: Mml.compose`You turn ${Mml.thing(vessel)} out and set to, pushing the heel of your hand through it and folding it back.`,
      onComplete: () => {
        void (async (): Promise<void> => {
          // ⭐ The method word. An OPEN string on the build — nothing
          // switches on it, and that is what keeps `knead` a method
          // rather than a subsystem.
          built.setBuildMethod('kneaded');
          built.recordCommand(commandText);
          const outcome = await CraftingApi.mintFromBuild({
            // ⭐⭐ Into the TROUGH ITSELF. A cocktail strains out into a
            // glass; a dough stays where it was made, because what
            // happens next is that it sits there for hours.
            vessel: built as unknown as Stuff,
            contributions: [...built.getContributions()],
            method: built.getBuildMethod(),
            makerPath,
          });
          if (!outcome.ok) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(
                Mml.compose`It will not come together. Whatever is in there is not a dough.`,
              )
              .send();
            return;
          }
          built.clearBuild();
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              Mml.compose`It comes together and turns silky under your hands. You round it up and leave it in the trough.`,
            )
            .toPeers(
              Mml.compose`${Mml.actor(giver)} works a dough in ${Mml.thing(vessel)}.`,
            )
            .send();
        })().catch((err: unknown) => {
          console.error('KneadController: mint failed', err);
        });
      },
    });
  }
}

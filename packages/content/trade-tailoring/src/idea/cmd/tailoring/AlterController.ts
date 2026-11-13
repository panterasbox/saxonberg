/**
 * AlterController — `alter`, and ⭐⭐ **the retention loop, for free.**
 *
 * `Creature.getMass()` moves with metabolism. Girth is
 * `√(mass / stature)`. So **a garment cut for you last season stops
 * fitting when your body changes** — with zero new mechanism, falling
 * straight out of the fit model.
 *
 * That is what turns tailoring from a one-time purchase into a
 * **recurring service**: letting out, taking in, and coming back. It is
 * the retention loop for tailoring the way recolouring is for dyeing,
 * and neither of them is a subscription bolted on — both are what the
 * physics already said.
 *
 * ## ⚠⚠ The ceiling is the seam allowance, because MATTER IS CONSERVED
 *
 * Making a coat bigger needs more cloth, and there is no more cloth —
 * only what `cut` chose to fold into the seams. Making it smaller is
 * just cutting, and is always available.
 *
 * ⭐ **Magic hits the identical wall.** A spell cannot conjure matter
 * (elemental transformation is off by ~10⁶), so a working might alter
 * *faster*; it can never alter *further*. The cleanest magic/craft
 * interaction in the build, and it needed no code: the limit is already
 * `cut`'s waste decision.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { AlterFacts, AlterRefusal } from '@saxonberg/server/mud/lib/slot/Wearable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface AlterModel extends CommandModel {
  kit?: MqlManyResult;
  garment: MqlOneResult;
  for?: MqlOneResult;
}

/**
 * ⭐ The fit, the direction and the seam budget are the garment's
 * (`Wearable.alterPlanFor` — controller-liquidity W11); this controller
 * picks the best kit bound and words the plan.
 */
export default class AlterController extends ManualBuildController<AlterModel> {
  async execute(model: AlterModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const garment = model.garment?.stuff ?? null;
    if (!garment || !MixinApi.isWearable(garment)) {
      this.declineStep(context, Mml.compose`Alter what?`, 'no-garment');
      return;
    }
    const subject = model.for?.stuff ?? giver;
    const plan = garment.alterPlanFor(giver, subject, this.bestInstrument(model.kit, 'mending'));
    if (!plan.ok) {
      this.declineStep(context, AlterController.refusalWords(plan, garment), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f: AlterFacts) =>
        f.lettingOut
          ? Mml.compose`You unpick the seams of ${Mml.thing(garment)} and start letting it out.`
          : Mml.compose`You pin ${Mml.thing(garment)} in and start taking it up.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} works over a garment with pins.`,
      onRefused: () => Mml.compose`The alteration came to nothing.`,
      onDone: (f: AlterFacts) => ({
        self: f.lettingOut
          ? Mml.compose`It sits properly again, and there is less in the seams than there was.`
          : Mml.compose`It sits properly again, and there is a little more folded inside than there was.`,
      }),
    });
  }

  protected static refusalWords(r: AlterRefusal, garment: Stuff): Composed {
    switch (r.reason) {
      case 'no-subject':
        return Mml.compose`There is nobody there to fit it to.`;
      case 'already-fits':
        return Mml.compose`${Mml.thing(garment)} already fits. There is nothing to do to it.`;
      case 'no-allowance':
        return Mml.compose`${Mml.thing(garment)} was cut close. There is nothing folded in the seams to let out — and nothing anywhere makes cloth out of nothing.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}

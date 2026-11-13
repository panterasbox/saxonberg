/**
 * RakeController — `rake [<fire>]`: take the ash out of a fire's grate
 * (cleanliness D24, potash D4).
 *
 * ⭐ Its own act (controller-liquidity W18, owner 2026-11-10): W7c had it
 * as the third arm of `sweep` (`SweepableMixin` over a floor, a grate and
 * a flue, with a union result). A grate is raked; a floor and a chimney are
 * swept. The FIRE plans the rake (`Burner.rakePlan` — how long, how hard)
 * and ends at `Burner.rakeGrate`; the words are this controller's.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { AnyActRefusal } from '../../../../lib/craft/ActPlan';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface RakeModel extends CommandModel {
  fire?: MqlOneResult;
}

export default class RakeController extends ManualBuildController<RakeModel> {
  async execute(model: RakeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const fire: Stuff | null = model.fire?.stuff ?? null;
    if (fire === null || !MixinApi.isBurner(fire)) {
      this.declineStep(
        context,
        fire === null
          ? Mml.compose`There is no fire here to rake out.`
          : Mml.compose`${Mml.thing(fire)} has no grate to rake.`,
        'no-burner',
      );
      return;
    }
    await this.engagePlan(context, fire.rakePlan(giver), RakeController.rakeWords(fire, giver));
  }

  /** ⭐ The words for a rake of `fire` (D4). */
  protected static rakeWords(
    fire: Stuff,
    giver: Stuff,
  ): ActWords<undefined, { ash: readonly Stuff[] }, AnyActRefusal> {
    return {
      beginSelf: () => Mml.compose`You rake out the grate of ${Mml.thing(fire)}.`,
      onRefused: () => Mml.compose`You can't rake ${Mml.thing(fire)} out just now.`,
      onDone: (f) => {
        const first = f.ash[0];
        if (!first) {
          return {
            self: Mml.compose`There is hardly any ash in the grate. It wants a brush up the flue, maybe, but not raking.`,
          };
        }
        return {
          self:
            f.ash.length === 1
              ? Mml.compose`You rake the grate out into ${Mml.thing(first)}.`
              : Mml.compose`You rake the grate out into ${String(f.ash.length)} heaps of ash.`,
          peers: Mml.compose`${Mml.actor(giver)} rakes out the grate.`,
        };
      },
    };
  }
}

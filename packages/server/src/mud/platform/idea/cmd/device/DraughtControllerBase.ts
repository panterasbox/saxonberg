/**
 * DraughtControllerBase — what the `draught` shapes share (controller-
 * liquidity W7b, D13 rung 4 + D1): the fire the line names, and the
 * words a dial is told in.
 *
 *   draught [at <fire>]              — {@link DraughtReadController}: where it stands
 *   draught <setting> [at <fire>]    — {@link DraughtSetController}
 *   draught <fire> <setting>         — {@link DraughtSetController}, the same act
 *
 * `setting` is a `values:` slot — `wide · open · half · low · banked` —
 * so `draught forge medium` is refused by the view, naming the five, and
 * the value each word means is the burner's one vocabulary
 * (`Burner.draughtFor`).
 *
 * ⭐⭐ One number, three consequences. The narration is the point: a
 * player who opens the vents has to be TOLD the fire got hotter, cleaner
 * and dimmer, or the trade-off is a number in a log instead of a thing
 * they learned.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Burner } from '../../../../lib/fire/Burner';

export interface DraughtModel extends CommandModel {
  fire?: MqlOneResult;
  /** One of the view's `values:` — `wide · open · half · low · banked`. */
  setting?: string;
}

export abstract class DraughtControllerBase extends CommandController<DraughtModel> {
  /** The burner the line names, or a refusal said and `null`. */
  protected fireOf(
    model: DraughtModel,
    context: CommandContext,
  ): (Stuff & Burner) | null {
    const fireResult = model.fire;
    const fire = fireResult
      ? MqlApi.effectiveTarget(fireResult, (s): s is Stuff =>
          MixinApi.isBurner(s),
        )
      : null;
    if (!fire) {
      MessageApi.scene(context.commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`There is no fire here.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-burner',
        detail: 'there is no fire here',
      });
      return null;
    }
    return fire as Stuff & Burner;
  }

  /** How a fire at this draught reads, in words. */
  protected static narrate(value: number): string {
    if (value >= 0.9) {
      return 'You open the vents wide. It draws hard, burns pale and clean — and sheds less light than you would think.';
    }
    if (value >= 0.4) {
      return 'You set the vents halfway. It settles into a steady yellow burn.';
    }
    if (value > 0.1) {
      return 'You choke the vents down. It cools, goes sooty, and glares.';
    }
    return 'You bank it down under its own ash. A dull red glow, and it will keep.';
  }

  /** Where a dial stands, in words — never a figure. */
  protected static wordFor(value: number): string {
    if (value >= 0.9) return 'the vents stand wide open';
    if (value >= 0.4) return 'the vents are halfway';
    if (value > 0.1) return 'the vents are nearly shut';
    return 'it is banked';
  }
}

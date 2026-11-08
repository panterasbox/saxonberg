/**
 * ThrowControllerBase — what the three shapes of `throw` share: the thing has
 * to have been found, and refusals are said the same way.
 *
 * ⭐⭐ `throw <thing>`, `throw <thing> to <someone>` and `throw <thing> at
 * <something>` are three views of one word, provably disjoint (D17), and three
 * controllers: three acts (a pitch, a catch, an attack) that used to be told
 * apart by `if`s in one file.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';

export interface ThrowModel extends CommandModel {
  item?: MqlOneResult;
}

export abstract class ThrowControllerBase<M extends ThrowModel> extends CommandController<M> {
  /** The thing being thrown, or a refusal said and null. */
  protected heldItem(model: M, context: CommandContext): Stuff | null {
    if (model.item?.stuff) return model.item.stuff;
    const raw = model.item?.raw;
    this.fail(context, raw ? `You don't have any '${raw}' to throw.` : 'Throw what?', 'empty-result');
    return null;
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: 'controller-rejected', reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}

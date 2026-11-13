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
import { MixinApi } from '../../../../api/mixin';
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

  /**
   * ⭐ Let go of it — a thrown thing leaves your body first (C51: the throw
   * moved the thing and left its slot occupied, the phantom `drop` fixed;
   * and a cursed thing that will not be released could be thrown). The
   * body's `tryReleaseFromSlots` decides; this words its refusal as `drop`
   * does. `false` = it would not go (the refusal is said).
   */
  protected letGo(item: Stuff, context: CommandContext): boolean {
    const giver = context.commandGiver;
    if (!MixinApi.isSlotted(giver) || !MixinApi.isSlottable(item)) return true;
    const release = giver.tryReleaseFromSlots(item);
    if (release.released) return true;
    context.note({
      kind: 'controller-rejected',
      reason: 'cursed-will-not-release',
      detail: `${item.getPresentation()} refuses release`,
    });
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(
        release.dumpedTau > 0
          ? Mml.compose`You cannot let go of ${Mml.thing(item)} — and it is running hot against your skin.`
          : Mml.compose`You cannot let go of ${Mml.thing(item)}. It has no intention of being put down.`,
      )
      .send();
    return false;
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: 'controller-rejected', reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}

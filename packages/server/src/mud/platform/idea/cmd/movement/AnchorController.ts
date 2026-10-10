/**
 * AnchorController — `anchor`: stop the craft where it is (maritime D6).
 *
 * Leaves the voyage without arriving anywhere. ⛔ It mints no place: the
 * deck's gunwale simply reads the water wherever the craft now lies, which
 * is what makes fishing on open water work. `course` takes you back out.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { ExpanseApi } from '../../../../api/expanse';
import type { Positioned } from '../../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../../lib/expanse/Voyaging';

export default class AnchorController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const craft = await this.craftOf(context.commandGiver);
    if (craft === null) {
      return this.decline(context, 'You are not aboard anything that sails.', 'not-aboard');
    }
    if (craft.getCourse() === null) {
      return this.decline(context, 'You are not under way.', 'not-under-way');
    }
    await craft.anchorHere();
    MessageApi.scene(context.commandGiver)
      .topic('act.move')
      .toSelf(Mml.compose`You let go the anchor. She lies where she is, and the water goes on past her.`)
      .send();
  }

  /** The craft the giver is aboard — their root container's craft. */
  private async craftOf(giver: Stuff): Promise<(Stuff & Positioned & Voyaging) | null> {
    const root = MixinApi.isContainable(giver) ? giver.getRootContainer() ?? giver : giver;
    const craft = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    return craft && MixinApi.isVoyaging(craft) ? craft : null;
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}

/**
 * QuitController — the `quit` verb: leave a position you hold.
 *
 * The verb over the shipped `EmploymentApi.quit` (which had none — a
 * player could be appointed and never leave). Leaving a position is a
 * player act, and it is what takes the house account back out of the
 * wallet (`EmploymentApi.quit` unlinks). Bare `quit` leaves your one
 * position; with several, name the organization.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { EmploymentApi } from '../../../../api/employment';

const TOPIC = 'act.deed';

interface QuitModel extends CommandModel {
  /** The organization's templatePath (optional when you hold one job). */
  organization?: string;
}

export default class QuitController extends CommandController<QuitModel> {
  async execute(model: QuitModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isEmployed(giver)) {
      return this.fail(context, "You don't hold a position anywhere.", 'not-employed');
    }
    const held = giver.getActiveEmployments();
    const wanted = (model.organization ?? '').trim();
    const record = wanted
      ? held.find((e) => e.organizationPath === wanted)
      : held.length === 1
        ? held[0]
        : undefined;
    if (!record) {
      if (held.length === 0) {
        return this.fail(context, "You don't hold a position anywhere.", 'not-employed');
      }
      if (!wanted) {
        return this.fail(
          context,
          `Quit which? You hold positions at ${held.map((e) => e.organizationPath).join(', ')}.`,
          'ambiguous-position',
        );
      }
      return this.fail(context, `You hold no position at ${wanted}.`, 'not-employed');
    }
    await EmploymentApi.quit(giver, record.organizationPath);
    const org = StuffApi.findByTemplatePath(record.organizationPath);
    const name = org?.getPresentation() ?? record.organizationPath;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You quit ${name}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} quits ${name}.`)
      .send();
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${line}`)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}

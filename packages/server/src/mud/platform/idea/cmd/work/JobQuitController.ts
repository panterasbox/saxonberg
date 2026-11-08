/**
 * JobQuitController — `job quit [<organization>]`: leave a position you
 * hold (the flat `quit` verb until controllers-are-io W7).
 *
 * The verb over the shipped `EmploymentApi.quit` (which had none — a
 * player could be appointed and never leave). Leaving a position is a
 * player act, and it is what takes the house account back out of the
 * wallet (`EmploymentApi.quit` unlinks). Bare `quit` leaves your one
 * position; with several, name the organization.
 */

import type { CommandContext, CommandModel } from '../../../../api/command';
import { JobControllerBase, TOPIC } from './JobControllerBase';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { EmploymentApi } from '../../../../api/employment';


interface QuitModel extends CommandModel {
  /** The organization's templatePath (optional when you hold one job). */
  organization?: string;
}

export default class JobQuitController extends JobControllerBase<QuitModel> {
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
    await giver.quitJob(record.organizationPath);
    const org =
      // A relation resolved at the act (the scan sweep): not booted.
      await StuffApi.singleton(record.organizationPath).catch(() => null);
    const name = org?.getPresentation() ?? record.organizationPath;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You quit ${name}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} quits ${name}.`)
      .send();
  }

}

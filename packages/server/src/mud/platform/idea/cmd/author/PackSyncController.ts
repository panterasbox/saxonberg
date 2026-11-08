/**
 * PackSyncController — `pack sync [<packId>]`: reconcile a pack live, then offer to staff it when it has no maintainers (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackReconcileResult } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

const DEFAULT_PACK = 'base-library';

export default class PackSyncController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim() || DEFAULT_PACK;
    let result: PackReconcileResult;
    try {
      result = await PackApi.sync(packId);
      this.tell(context, this.formatResult('synced', result));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'sync-failed');
    }
    // A person's install of an unstaffed pack is the moment to staff it
    // (D7): the installer, or who they name.
    if (!result.staffed) await this.offerToStaff(packId, context);
  }

  private async offerToStaff(packId: string, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // The command's own Interactive (D23): a scripted install leaves the
    // pack unstaffed rather than asking a question nobody typed.
    const interactive = context.interactive;
    if (!interactive) return;
    let answer: string;
    try {
      answer = (await interactive.promptText(
        'This pack has no maintainers. You, or who? (a name, or enter for you)',
      )).trim();
    } catch {
      return; // declined / timed out: it stays unstaffed, and status says so
    }
    const memberPath = answer.length > 0 ? answer : (giver.getIdentityPath() ?? giver.getTemplatePath() ?? '');
    if (!memberPath) return;
    try {
      const added = await PackApi.staff(packId, memberPath);
      this.tell(context, added ? `${memberPath} now maintains pack '${packId}'.` : `${memberPath} already maintains pack '${packId}'.`);
    } catch (err) {
      this.tell(context, (err as Error).message);
    }
  }
}

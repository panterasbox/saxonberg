/**
 * PackSyncController — `pack sync [<packId>]`: reconcile a pack live; when
 * it has no maintainers, say how to staff it (over {@link
 * PackControllerBase}).
 *
 * ⚠ It used to PROMPT for a name and pass the raw answer as a member
 * path, so the member never matched anybody. Staffing is its own act now
 * — `pack staff <packId> [<person>]` ({@link PackStaffController}, an
 * object arg keyed on identity; controller-liquidity W7b).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackReconcileResult } from '../../../../api/pack';
import { CommandLineApi } from '../../../../api/command-line';
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
    // (D7) — said, with the command that does it.
    if (!result.staffed) {
      this.tell(
        context,
        `This pack has no maintainers. Staff it with \`pack staff ${CommandLineApi.word(packId)}\` (you) or \`pack staff ${CommandLineApi.word(packId)} <person>\`.`,
      );
    }
  }
}

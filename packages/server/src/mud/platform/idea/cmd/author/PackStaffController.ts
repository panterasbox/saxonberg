/**
 * PackStaffController — `pack staff <packId> [<person>]`: add a maintainer
 * to a pack — the person named, or you (over {@link PackControllerBase}).
 *
 * ⭐ The person is an OBJECT arg and the member is their
 * `getIdentityPath()` (controller-liquidity W7b, D11). It was a prompt
 * inside `pack sync` that passed the raw typed text as the member path,
 * so the member never matched anybody.
 */

import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { PackApi } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

interface PackStaffModel extends PackModel {
  /** Who maintains it; absent → the giver. */
  person?: MqlOneResult;
}

export default class PackStaffController extends PackControllerBase {
  async execute(model: PackStaffModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    if (!packId) return this.failUsage(context, 'pack-required');
    const person = model.person?.stuff ?? context.commandGiver;
    const memberPath = person.getIdentityPath();
    const name = person === context.commandGiver ? 'You' : person.getPresentation();
    try {
      const added = await PackApi.staff(packId, memberPath);
      this.tell(
        context,
        added
          ? `${name} now ${person === context.commandGiver ? 'maintain' : 'maintains'} pack '${packId}'.`
          : `${name} already ${person === context.commandGiver ? 'maintain' : 'maintains'} pack '${packId}'.`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'staff-failed');
    }
  }
}

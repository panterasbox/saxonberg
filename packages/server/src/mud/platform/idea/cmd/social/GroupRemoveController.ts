/**
 * GroupRemoveController — `group remove <name> <playerId>` (owner or admin) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { GroupApi } from '../../../../api/group';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupRemoveController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const name = (model.name ?? '').trim();
    const targetId = String(model.target ?? '').trim();
    if (!name || !targetId) {
      return this.fail(context, 'group name and target required', 'arg-required');
    }
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (!(await this.ownerOrAdmin(avatar, g))) {
      return this.fail(context, 'Only owners and admins may remove.', 'not-permitted');
    }
    const key = await g.memberByName(targetId);
    const removed = key !== null && g.removeMember(key);
    if (!removed) {
      return this.fail(context, `${targetId} isn't in '${name}'.`, 'not-a-member');
    }
    await g.save();
    if (g._id) {
      const reg = await GroupApi.registry();
      reg.managed().fireChange(g._id);
    }
    this.send(context, Mml.compose`\nRemoved ${targetId} from '${name}'.\n`);
  }
}

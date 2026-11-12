/**
 * GroupRoleController — `group role <name> <playerId> <role>` (owner only) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { GroupApi } from '../../../../api/group';
import type { GroupRole } from '../../../../lib/social/Group';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

const ROLES: ReadonlySet<GroupRole> = new Set(['owner', 'admin', 'member']);

export default class GroupRoleController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const name = (model.name ?? '').trim();
    const targetId = String(model.target ?? '').trim();
    const role = (model.role_name ?? '').trim() as GroupRole;
    if (!name || !targetId || !ROLES.has(role)) {
      return this.fail(context, 'group name, target, and valid role required', 'arg-required');
    }
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (!(await GroupApi.ownsGroup(avatar, g))) {
      return this.fail(context, 'Only the owner may set roles.', 'not-owner');
    }
    const key = await g.memberByName(targetId);
    const changed = key !== null && g.setMemberRole(key, role);
    if (!changed) {
      return this.fail(context, `${targetId} is not in '${name}' (or already has that role).`, 'no-change');
    }
    await g.save();
    if (g._id) {
      const reg = await GroupApi.registry();
      reg.managed().fireChange(g._id);
    }
    this.send(context, Mml.compose`\nSet ${targetId} as ${role} in '${name}'.\n`);
  }
}

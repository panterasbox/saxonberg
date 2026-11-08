/**
 * GroupListController — `group list` (and bare `group`): the groups you belong to (channel-backing groups hidden) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import { Group } from '../../../../lib/social/Group';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupListController extends GroupControllerBase {
  async execute(_model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const all = await Group.find({ memberIds: avatar.getIdentityPath() ?? '' });
    // Hide channel-backing Groups — they're an implementation detail
    // of chat, not "your groups." Chat owns this bookkeeping (Group
    // itself knows nothing about chat).
    const backing = await ChatApi.getBackingGroupIds();
    const groups = all.filter((g) => !g._id || !backing.has(g._id));
    if (groups.length === 0) {
      this.send(context, Mml.fromMarkup(`\nYou belong to no groups.\n`));
      return;
    }
    const lines = ['You belong to:'];
    for (const g of groups) {
      const role = g.roleOf(avatar.getIdentityPath() ?? '') ?? 'member';
      lines.push(`  ${g.name}  [${role}]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}

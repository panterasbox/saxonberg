/**
 * GroupMakeController — `group make <name>`: create a group you own (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { Group } from '../../../../lib/social/Group';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupMakeController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const existing = await Group.find({ name });
    if (existing.length > 0) {
      return this.fail(context, `A group named '${name}' already exists.`, 'duplicate-name');
    }
    const g = new Group();
    g.name = name;
    g.owner = Group.playerOwner(avatar.getIdentityPath() ?? '');
    g.memberIds = [avatar.getIdentityPath() ?? ''];
    g.memberRoles = ['owner'];
    await g.save();
    this.send(context, Mml.compose`\nCreated group '${name}'.\n`);
  }
}

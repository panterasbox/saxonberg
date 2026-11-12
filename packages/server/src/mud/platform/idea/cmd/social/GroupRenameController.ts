/**
 * GroupRenameController — `group rename <old> <new>` (owner only) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupRenameController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const oldName = (model.old_name ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!oldName || !newName) {
      return this.fail(context, 'old and new names required', 'name-required');
    }
    const g = await this.findGroupByName(oldName);
    if (!g) return this.fail(context, `No group '${oldName}'.`, 'no-such-group');
    // The owner rule and the unique name are the group's (C71).
    const renamed = await g.rename(newName, avatar);
    if (!renamed.ok) {
      return renamed.reason === 'not-owner'
        ? this.fail(context, 'Only the owner may rename.', 'not-owner')
        : this.fail(context, `A group named '${newName}' already exists.`, 'duplicate-name');
    }
    this.send(context, Mml.compose`\nRenamed '${oldName}' to '${newName}'.\n`);
  }
}

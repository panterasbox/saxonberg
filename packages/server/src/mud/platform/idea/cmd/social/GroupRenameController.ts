/**
 * GroupRenameController — `group rename <old> <new>` (owner only) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { GroupApi } from '../../../../api/group';
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
    if (!(await GroupApi.ownsGroup(avatar, g))) {
      return this.fail(context, 'Only the owner may rename.', 'not-owner');
    }
    g.name = newName;
    await g.save();
    if (g._id) {
      const reg = await GroupApi.registry();
      reg.managed().fireChange(g._id);
    }
    this.send(context, Mml.compose`\nRenamed '${oldName}' to '${newName}'.\n`);
  }
}

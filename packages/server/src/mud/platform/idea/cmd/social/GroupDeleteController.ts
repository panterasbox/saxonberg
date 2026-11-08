/**
 * GroupDeleteController — `group delete <name>`: disband a group (owner only) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { GroupApi } from '../../../../api/group';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupDeleteController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (!(await GroupApi.ownsGroup(avatar, g))) {
      return this.fail(context, 'Only the owner may disband.', 'not-owner');
    }
    const id = g._id;
    await g.delete();
    if (id) {
      const reg = await GroupApi.registry();
      reg.managed().fireChange(id);
    }
    this.send(context, Mml.compose`\nDisbanded '${name}'.\n`);
  }
}

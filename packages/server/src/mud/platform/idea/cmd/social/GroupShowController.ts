/**
 * GroupShowController — `group show <name>`: the roster and who owns it (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { Group } from '../../../../lib/social/Group';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupShowController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    if (!this.avatarOf(context)) return;
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    const lines = [`Group '${name}' (owner: ${await this.describeOwner(g)}):`];
    for (let i = 0; i < g.memberIds.length; i++) {
      lines.push(`  ${g.memberIds[i]}  [${g.memberRoles[i]}]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}

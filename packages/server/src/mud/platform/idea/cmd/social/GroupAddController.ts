/**
 * GroupAddController — `group add <name> <who>`: enrol an online Avatar (owner or admin) (over {@link GroupControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { MqlOneResult } from '../../../../api/mql';
import { GroupApi } from '../../../../api/group';
import { PlayerApi } from '../../../../api/player';
import { GroupControllerBase, type GroupModel } from './GroupControllerBase';

export default class GroupAddController extends GroupControllerBase {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const avatar = this.avatarOf(context);
    if (!avatar) return;
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (!(await this.ownerOrAdmin(avatar, g))) {
      return this.fail(context, 'Only owners and admins may add.', 'not-permitted');
    }
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const target = resolved?.stuff;
    if (!target) {
      return this.fail(context, 'No such target.', 'no-target');
    }
    if (!PlayerApi.isAvatarStuff(target)) {
      return this.fail(context, 'Targets must be Avatars in v1.', 'avatar-required');
    }
    // ⚠ The IDENTITY path — every player Avatar shares one templatePath,
    // so keying on it would enrol every player at once (CLAUDE.md § A
    // PERSON keys on getIdentityPath()). `create` and `roleOf` already do.
    const added = g.addMember(target.getIdentityPath() ?? '');
    if (!added) {
      return this.fail(context, 'Already a member.', 'already-member');
    }
    await g.save();
    if (g._id) {
      const reg = await GroupApi.registry();
      reg.managed().fireChange(g._id);
    }
    this.send(
      context,
      Mml.compose`\nAdded ${target.getPresentation()} to '${name}'.\n`,
    );
  }
}

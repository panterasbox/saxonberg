/**
 * GroupControllerBase — what every `group` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base per
 * noun): the player surface for the managed-provider group substrate —
 * make / delete / rename / add / remove / role / show / list (bare `group`
 * lists).
 *
 * Composition-narrowing + thin orchestration over the `Group` Document;
 * mutations fire `ManagedGroupProvider.fireChange` so subscribed consumers
 * (future audience plumbing) update.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import type { MqlOneResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import { Group } from '../../../../lib/social/Group';
import { GroupApi } from '../../../../api/group';
import type Avatar from '../../../../lib/character/Avatar';
import { PlayerApi } from '../../../../api/player';
import { CompactApi } from '../../../../api/compact';

export interface GroupModel extends CommandModel {
  name?: string;
  /**
   * Three shapes by subcommand:
   *   - `add`: `MqlOneResult` (target Avatar resolved via MQL `scope: online`)
   *   - `remove` / `role`: `string` (raw playerId entered by the caller)
   *   - any other subcommand: absent
   */
  target?: MqlOneResult | string;
  old_name?: string;
  new_name?: string;
  role_name?: string;
}

export abstract class GroupControllerBase extends CommandController<GroupModel> {
  /** The giver as an Avatar, or null after refusing (only Avatars manage groups). */
  protected avatarOf(context: CommandContext): Avatar | null {
    const giver = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(giver)) {
      this.fail(context, 'Only Avatars manage groups in v1.', 'avatar-required');
      return null;
    }
    return giver;
  }

  /** Owner (resolved through `GroupApi.ownsGroup`) OR an `admin` on the roster. */
  protected async ownerOrAdmin(avatar: Avatar, g: Group): Promise<boolean> {
    if (await GroupApi.ownsGroup(avatar, g)) return true;
    return g.roleOf(avatar.getIdentityPath() ?? '') === 'admin';
  }

  /** An office owner renders with who holds the seat right now. */
  protected async describeOwner(g: Group): Promise<string> {
    const owner = Group.ownerFromStored(g.owner);
    switch (owner.kind) {
      case 'system':
        return 'system';
      case 'player':
        return owner.templatePath;
      case 'office': {
        const holder = await CompactApi.officeHolderOf(owner.office);
        const held =
          holder.kind === 'explicit'
            ? holder.holderPlayerId
            : holder.kind === 'founder'
              ? holder.founderLabel
              : 'nobody — unknown office';
        return `the office of ${owner.office} (held by ${held})`;
      }
    }
  }

  protected async findGroupByName(name: string): Promise<Group | null> {
    const matches = await Group.find({ name });
    return matches[0] ?? null;
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}

/**
 * GroupController — player surface for the managed-provider group
 * substrate. Subcommands: make / delete / rename / add / remove / role
 * / show / list.
 *
 * Composition-narrowing + thin orchestration over the `Group`
 * Document; mutations fire `ManagedGroupProvider.fireChange` so
 * subscribed consumers (future audience plumbing) update.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import type { MqlOneResult } from '../../../api/mql';
import { Mml } from '../../../api/mml';
import { Group, type GroupRole } from '../../../lib/social/Group';
import { GroupApi } from '../../../api/group';
import { ChatApi } from '../../../api/chat';
import Avatar from '../../Avatar';
import { PlayerApi } from '../../../api/player';

interface GroupModel extends CommandModel {
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

const ROLES: ReadonlySet<GroupRole> = new Set(['owner', 'admin', 'member']);

export default class GroupController extends CommandController<GroupModel> {
  async execute(model: GroupModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(giver)) {
      return this.fail(context, 'Only Avatars manage groups in v1.', 'avatar-required');
    }
    const sub = model.subcommand ?? 'list';
    switch (sub) {
      case 'make':
        return this.executeMake(giver, model, context);
      case 'delete':
        return this.executeDelete(giver, model, context);
      case 'rename':
        return this.executeRename(giver, model, context);
      case 'add':
        return this.executeAdd(giver, model, context);
      case 'remove':
        return this.executeRemove(giver, model, context);
      case 'role':
        return this.executeRole(giver, model, context);
      case 'show':
        return this.executeShow(model, context);
      case 'list':
        return this.executeList(giver, context);
      default:
        return this.fail(
          context,
          `Unknown group subcommand: ${sub}`,
          'unknown-subcommand',
        );
    }
  }

  private async executeMake(
    avatar: Avatar,
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const existing = await Group.find({ name });
    if (existing.length > 0) {
      return this.fail(context, `A group named '${name}' already exists.`, 'duplicate-name');
    }
    const g = new Group();
    g.name = name;
    g.owner = avatar.getTemplatePath() ?? '';
    g.memberIds = [avatar.getTemplatePath() ?? ''];
    g.memberRoles = ['owner'];
    await g.save();
    this.send(context, Mml.compose`\nCreated group '${name}'.\n`);
  }

  private async executeDelete(
    avatar: Avatar,
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (g.owner !== (avatar.getTemplatePath() ?? '')) {
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

  private async executeRename(
    avatar: Avatar,
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const oldName = (model.old_name ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!oldName || !newName) {
      return this.fail(context, 'old and new names required', 'name-required');
    }
    const g = await this.findGroupByName(oldName);
    if (!g) return this.fail(context, `No group '${oldName}'.`, 'no-such-group');
    if (g.owner !== (avatar.getTemplatePath() ?? '')) {
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

  private async executeAdd(
    avatar: Avatar,
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (g.owner !== (avatar.getTemplatePath() ?? '') && g.roleOf(avatar.getTemplatePath() ?? '') !== 'admin') {
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
    const added = g.addMember(target.getTemplatePath() ?? '');
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

  private async executeRemove(
    avatar: Avatar,
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    const targetId = String(model.target ?? '').trim();
    if (!name || !targetId) {
      return this.fail(context, 'group name and target required', 'arg-required');
    }
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (g.owner !== (avatar.getTemplatePath() ?? '') && g.roleOf(avatar.getTemplatePath() ?? '') !== 'admin') {
      return this.fail(context, 'Only owners and admins may remove.', 'not-permitted');
    }
    const removed = g.removeMember(targetId);
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

  private async executeRole(
    avatar: Avatar,
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    const targetId = String(model.target ?? '').trim();
    const role = (model.role_name ?? '').trim() as GroupRole;
    if (!name || !targetId || !ROLES.has(role)) {
      return this.fail(context, 'group name, target, and valid role required', 'arg-required');
    }
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    if (g.owner !== (avatar.getTemplatePath() ?? '')) {
      return this.fail(context, 'Only the owner may set roles.', 'not-owner');
    }
    const changed = g.setMemberRole(targetId, role);
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

  private async executeShow(
    model: GroupModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'group name required', 'name-required');
    const g = await this.findGroupByName(name);
    if (!g) return this.fail(context, `No group '${name}'.`, 'no-such-group');
    const lines = [`Group '${name}' (owner: ${g.owner}):`];
    for (let i = 0; i < g.memberIds.length; i++) {
      lines.push(`  ${g.memberIds[i]}  [${g.memberRoles[i]}]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeList(
    avatar: Avatar,
    context: CommandContext,
  ): Promise<void> {
    const all = await Group.find({ memberIds: avatar.getTemplatePath() ?? '' });
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
      const role = g.roleOf(avatar.getTemplatePath() ?? '') ?? 'member';
      lines.push(`  ${g.name}  [${role}]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async findGroupByName(name: string): Promise<Group | null> {
    const matches = await Group.find({ name });
    return matches[0] ?? null;
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}


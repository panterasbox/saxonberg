/**
 * ChatController — single dispatch-on-subcommand controller for the
 * chat verb. The verb opts into `fallthrough: true`, so an unknown
 * first token (`chat gossip hi`) falls through to bind against the
 * top-level args — `model.subcommand` is absent in that case, and
 * the controller treats it as a bare post.
 *
 * Subcommands: list / join / leave / mute / unmute / who / make /
 * rename / disband / history / promote. The 12-controller-per-
 * subcommand approach from the plan is folded into one controller
 * here to match the existing `AliasController` precedent — same
 * dispatch shape, fewer files.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ChatApi } from '../../../api/chat';
import { SubjectApi } from '../../../api/subject';
import { PlayerApi } from '../../../api/player';
import type { Channel } from '../../../lib/social/Channel';

interface ChatModel extends CommandModel {
  channel?: string;
  name?: string;
  message?: string;
  old_name?: string;
  new_name?: string;
  handle?: string;
  rules?: boolean;
}

export default class ChatController extends CommandController<ChatModel> {
  async execute(model: ChatModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand;
    if (sub === undefined) {
      // Fallthrough — bare post.
      return this.executePost(model, context);
    }
    switch (sub) {
      case 'list':
        return this.executeList(context);
      case 'join':
        return this.executeTune(model, context, true);
      case 'leave':
        return this.executeTune(model, context, false);
      case 'mute':
        return this.executeMute(model, context, true);
      case 'unmute':
        return this.executeMute(model, context, false);
      case 'who':
        return this.executeWho(model, context);
      case 'make':
        return this.executeMake(model, context);
      case 'on':
        return this.executeOn(model, context);
      case 'rename':
        return this.executeRename(model, context);
      case 'disband':
        return this.executeDisband(model, context);
      case 'history':
        return this.executeHistory(model, context);
      case 'promote':
        return this.executePromote(model, context);
      default:
        return this.fail(
          context,
          `Unknown chat subcommand: ${sub}`,
          'unknown-subcommand',
        );
    }
  }

  private async executePost(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const speaker = context.commandGiver;
    const channelName = (model.channel ?? '').trim();
    const body = (model.message ?? '').trim();
    if (!channelName) {
      return this.fail(context, 'channel required', 'channel-required');
    }
    if (!body) {
      return this.fail(context, 'message required', 'message-required');
    }
    const channel = await ChatApi.resolveByName(channelName);
    if (!channel) {
      // Try ad-hoc handle path.
      const ad = await ChatApi.resolveHandleForActor(speaker, channelName);
      if (ad) {
        // For ad-hoc channels, audience = ad.members; route directly.
        const cat = await ChatApi.catalogue();
        // Lazy-import to avoid circular: post via a synthesized
        // pseudo-channel-shaped helper. For v1 we just iterate.
        for (const m of ad.members) {
          if (m === speaker) continue;
          MessageApi.scene(speaker)
            .topic('world.chat.message')
            .modality('verbal-esp')
            .meta({ channelId: ad.handle })
            .toTarget(m, Mml.compose`[${ad.handle}] ${Mml.name(speaker)}: ${body}`)
            .payload({
              channelId: ad.handle,
              channelName: ad.handle,
              speaker: MessageApi.refOf(speaker),
              text: body,
            })
            .send();
        }
        // Speaker self frame
        MessageApi.scene(speaker)
          .topic('world.chat.message')
          .modality('verbal-esp')
          .meta({ channelId: ad.handle })
          .toSelf(Mml.compose`[${ad.handle}] You: ${body}`)
          .payload({
            channelId: ad.handle,
            channelName: ad.handle,
            speaker: MessageApi.refOf(speaker),
            text: body,
          })
          .send();
        // Append to history
        cat.appendToHistory(ad.handle, {
          id: Math.random().toString(36).slice(2, 12),
          topic: 'world.chat.message',
          tags: ['audience:witness'],
          body: `[${ad.handle}] ${speaker.getPresentation()}: ${body}`,
          meta: { timestamp: Date.now(), modality: 'verbal-esp', channelId: ad.handle },
          payload: {
            channelId: ad.handle,
            channelName: ad.handle,
            speaker: MessageApi.refOf(speaker),
            text: body,
          },
        });
        return;
      }
      return this.fail(context, `No channel '${channelName}'.`, 'no-such-channel');
    }
    await ChatApi.postToChannel(speaker, channel, body);
  }

  private async executeList(context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const { persistent, adHoc } = await ChatApi.visibleChannels(actor);
    if (persistent.length === 0 && adHoc.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo channels.\n`));
      return;
    }
    const lines = ['Channels:'];
    for (const c of persistent) {
      lines.push(`  ${c.name}  [${c.kind}]`);
    }
    for (const ad of adHoc) {
      lines.push(`  ${ad.handle}  [ad-hoc, ${ad.members.size} members]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeTune(
    model: ChatModel,
    context: CommandContext,
    tunedIn: boolean,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars subscribe in v1.', 'avatar-required');
    }
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    await ChatApi.setSubscription(actor, channel, { tunedIn });
    this.send(
      context,
      tunedIn
        ? Mml.compose`\nTuned in to ${channel.name}.\n`
        : Mml.compose`\nLeft ${channel.name}.\n`,
    );
  }

  private async executeMute(
    model: ChatModel,
    context: CommandContext,
    muted: boolean,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars mute in v1.', 'avatar-required');
    }
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    await ChatApi.setSubscription(actor, channel, { muted });
    this.send(
      context,
      muted
        ? Mml.compose`\nMuted ${channel.name}.\n`
        : Mml.compose`\nUnmuted ${channel.name}.\n`,
    );
  }

  private async executeWho(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    const cat = await ChatApi.catalogue();
    const audience = await cat.audienceFor(channel);
    if (audience.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo one in ${name}.\n`));
      return;
    }
    const lines = [`In ${name}:`];
    for (const a of audience) {
      lines.push(`  ${a.getPresentation()}`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeMake(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'channel name required', 'name-required');
    const cat = await ChatApi.catalogue();
    if (cat.reservedNames().has(name.toLowerCase())) {
      return this.fail(
        context,
        `'${name}' is a reserved subcommand; pick another.`,
        'reserved-name',
      );
    }
    try {
      const c = await ChatApi.createPlayerChannel(context.commandGiver, name);
      this.send(context, Mml.compose`\nCreated channel '${c.name}'.\n`);
    } catch (err) {
      return this.fail(
        context,
        (err as Error).message,
        'create-failed',
      );
    }
  }

  private async executeOn(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars attach surfaces in v1.', 'avatar-required');
    }
    const title = (model.name ?? '').trim();
    if (!title) return this.fail(context, 'subject name required', 'name-required');
    if (model.rules) {
      return this.fail(
        context,
        'The rules-of-order chat surface is not available yet.',
        'rules-deferred',
      );
    }
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) {
      return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    }
    if (subject.getOwner() !== actor.getPlayerId()) {
      return this.fail(context, 'Only the subject owner may attach a surface.', 'not-owner');
    }
    try {
      const c = await ChatApi.attachChatToSubject(subject, 'free');
      this.send(context, Mml.compose`\nAttached chat to '${c.name}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'attach-failed');
    }
  }

  private async executeRename(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const oldName = (model.old_name ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!oldName || !newName) {
      return this.fail(context, 'old and new names required', 'name-required');
    }
    const cat = await ChatApi.catalogue();
    if (cat.reservedNames().has(newName.toLowerCase())) {
      return this.fail(
        context,
        `'${newName}' is a reserved subcommand; pick another.`,
        'reserved-name',
      );
    }
    try {
      const c = await ChatApi.renamePlayerChannel(oldName, newName);
      this.send(context, Mml.compose`\nRenamed to '${c.name}'.\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'rename-failed');
    }
  }

  private async executeDisband(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars disband in v1.', 'avatar-required');
    }
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    if (!channel) return this.fail(context, `No channel '${name}'.`, 'no-such-channel');
    if (channel.kind !== 'player-created') {
      return this.fail(
        context,
        `'${name}' is not a player-created channel.`,
        'not-disbandable',
      );
    }
    const subject = channel.subject
      ? await SubjectApi.resolveById(channel.subject)
      : null;
    if (subject && subject.getOwner() !== actor.getPlayerId()) {
      return this.fail(context, 'Only the owner may disband.', 'not-owner');
    }
    await ChatApi.disbandPlayerChannel(name);
    this.send(context, Mml.compose`\nDisbanded '${name}'.\n`);
  }

  private async executeHistory(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    const channel = await ChatApi.resolveByName(name);
    const channelId: string =
      channel?._id ?? (channel ? channel.name : name);
    const ring = await ChatApi.historyFor(channelId);
    if (ring.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo history for ${name}.\n`));
      return;
    }
    const lines: string[] = [`History for ${name}:`];
    for (const f of ring) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executePromote(
    model: ChatModel,
    context: CommandContext,
  ): Promise<void> {
    const handle = (model.handle ?? '').trim();
    const newName = (model.new_name ?? '').trim();
    if (!handle || !newName) {
      return this.fail(context, 'handle and new_name required', 'arg-required');
    }
    const cat = await ChatApi.catalogue();
    if (cat.reservedNames().has(newName.toLowerCase())) {
      return this.fail(
        context,
        `'${newName}' is a reserved subcommand; pick another.`,
        'reserved-name',
      );
    }
    try {
      const c = await ChatApi.promoteAdHocToManaged(handle, newName, context.commandGiver);
      this.send(
        context,
        Mml.compose`\nPromoted ad-hoc ${handle} into '${c.name}'.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'promote-failed');
    }
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
      .topic('system.shell.chat')
      .toSelf(body)
      .send();
  }
}

// Channel type referenced — keep the import alive.
void (null as unknown as Channel);

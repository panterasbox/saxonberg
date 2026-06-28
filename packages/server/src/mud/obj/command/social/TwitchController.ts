/**
 * TwitchController — the single `twitch` verb (the relay surface). One
 * controller, dispatch-on-subcommand with `fallthrough: true`: an unknown
 * first token (`twitch twitchdev hello`) falls through to a bare post.
 *
 * Subcommands: list / tune / untune / history / who. The relay is its own
 * surface (not a Channel), so this controller forwards to `TwitchApi`, not
 * `ChatApi`. Outbound posting reject-and-points unlinked/unscoped players
 * into the auth re-consent flow.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { TwitchApi } from '../../../api/twitch';
import { PlayerApi } from '../../../api/player';

interface TwitchModel extends CommandModel {
  channel?: string;
  message?: string;
}

export default class TwitchController extends CommandController<TwitchModel> {
  async execute(model: TwitchModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand;
    if (sub === undefined) return this.executePost(model, context);
    switch (sub) {
      case 'list':
        return this.executeList(context);
      case 'tune':
        return this.executeTune(model, context, true);
      case 'untune':
        return this.executeTune(model, context, false);
      case 'history':
        return this.executeHistory(model, context);
      case 'who':
        return this.executeWho(model, context);
      default:
        return this.fail(
          context,
          `Unknown twitch subcommand: ${sub}`,
          'unknown-subcommand'
        );
    }
  }

  private async executePost(
    model: TwitchModel,
    context: CommandContext
  ): Promise<void> {
    const speaker = context.commandGiver;
    const key = (model.channel ?? '').trim();
    const body = (model.message ?? '').trim();
    if (!key) return this.fail(context, 'channel required', 'channel-required');
    if (!body) return this.fail(context, 'message required', 'message-required');

    const result = await TwitchApi.post(speaker, key, body);
    if (result.ok) return; // the mirror is delivered to tuned-in players

    switch (result.reason) {
      case 'no-channel':
        return this.fail(
          context,
          `No relayed Twitch channel '${key}'.`,
          'no-channel'
        );
      case 'empty':
        return this.fail(context, 'message required', 'message-required');
      case 'unlinked':
        return this.fail(
          context,
          'Link your Twitch account to post here: /auth/twitch/link',
          'unlinked'
        );
      case 'unscoped':
        return this.fail(
          context,
          'Authorize chat posting first: /auth/twitch/reauth?scope=user:write:chat',
          'unscoped'
        );
      case 'throttled':
        return this.fail(
          context,
          "You're posting too fast — give it a moment.",
          'throttled'
        );
      case 'send-failed':
        return this.fail(
          context,
          `Twitch send failed${result.detail ? `: ${result.detail}` : ''}.`,
          'send-failed'
        );
    }
  }

  private async executeList(context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const channels = await TwitchApi.allChannels();
    if (channels.length === 0) {
      this.send(context, Mml.fromMarkup('\nNo relayed Twitch channels.\n'));
      return;
    }
    const isAvatar = PlayerApi.isAvatarStuff(actor);
    const lines = ['Twitch channels:'];
    for (const c of channels) {
      const tuned =
        isAvatar && actor.isTuned(c.broadcasterId) ? '  (tuned in)' : '';
      const label = c.label ? `  [${c.label}]` : '';
      lines.push(`  ${c.broadcasterLogin}${label}${tuned}`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeTune(
    model: TwitchModel,
    context: CommandContext,
    tunedIn: boolean
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const key = (model.channel ?? '').trim();
    const res = tunedIn
      ? await TwitchApi.tune(actor, key)
      : await TwitchApi.untune(actor, key);
    if (!res.ok || !res.channel) {
      return this.fail(
        context,
        `No relayed Twitch channel '${key}'.`,
        'no-channel'
      );
    }
    this.send(
      context,
      tunedIn
        ? Mml.compose`\nTuned in to Twitch #${res.channel.broadcasterLogin}.\n`
        : Mml.compose`\nLeft Twitch #${res.channel.broadcasterLogin}.\n`
    );
  }

  private async executeHistory(
    model: TwitchModel,
    context: CommandContext
  ): Promise<void> {
    const key = (model.channel ?? '').trim();
    const channel = await TwitchApi.resolveChannel(key);
    if (!channel) {
      return this.fail(
        context,
        `No relayed Twitch channel '${key}'.`,
        'no-channel'
      );
    }
    const ring = await TwitchApi.historyFor(channel.broadcasterId);
    if (ring.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo history for ${key}.\n`));
      return;
    }
    const lines = [`Twitch #${channel.broadcasterLogin}:`];
    for (const f of ring) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeWho(
    model: TwitchModel,
    context: CommandContext
  ): Promise<void> {
    const key = (model.channel ?? '').trim();
    const channel = await TwitchApi.resolveChannel(key);
    if (!channel) {
      return this.fail(
        context,
        `No relayed Twitch channel '${key}'.`,
        'no-channel'
      );
    }
    const tuned = await TwitchApi.whoTuned(channel.broadcasterId);
    if (tuned.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo one tuned in to ${key}.\n`));
      return;
    }
    const lines = [`Tuned in to Twitch #${channel.broadcasterLogin}:`];
    for (const a of tuned) lines.push(`  ${a.getPresentation()}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string
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

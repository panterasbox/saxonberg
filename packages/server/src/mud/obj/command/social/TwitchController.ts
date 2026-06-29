/**
 * TwitchController — the single `twitch` verb (the relay surface). One
 * controller, dispatch-on-subcommand with `fallthrough: true`: an unknown
 * first token (`twitch twitchdev hello`) falls through to a bare post.
 *
 * Channels are player-initiated and addressed by **Twitch login** (handle).
 * Subcommands: list / tune / untune / history / who. The relay is its own
 * surface (not a Channel), so this forwards to `TwitchApi`. Outbound
 * posting reject-and-points unlinked/unscoped players into the auth
 * re-consent flow.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { TwitchApi } from '../../../api/twitch';
import { PlayerApi } from '../../../api/player';

interface TwitchModel extends CommandModel {
  channel?: string; // a Twitch login (handle)
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
    const login = (model.channel ?? '').trim();
    const body = (model.message ?? '').trim();
    if (!login) return this.fail(context, 'channel required', 'channel-required');
    if (!body) return this.fail(context, 'message required', 'message-required');

    const result = await TwitchApi.post(speaker, login, body);
    if (result.ok) return; // the mirror is delivered to tuned-in players

    switch (result.reason) {
      case 'no-channel':
        return this.fail(
          context,
          `Tune in to Twitch #${login} first: twitch tune ${login}`,
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
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const logins = await TwitchApi.tunedLoginsFor(actor);
    if (logins.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(
          "\nYou aren't tuned in to any Twitch channels. " +
            'Tune in with `twitch tune <handle>`.\n'
        )
      );
      return;
    }
    const lines = ['Tuned in to Twitch:'];
    for (const login of logins) lines.push(`  #${login}`);
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
    const login = (model.channel ?? '').trim();
    if (!login) return this.fail(context, 'channel required', 'channel-required');

    if (tunedIn) {
      const res = await TwitchApi.tune(actor, login);
      if (!res.ok) {
        if (res.reason === 'no-relay') {
          return this.fail(
            context,
            "Twitch relay isn't configured.",
            'no-relay'
          );
        }
        return this.fail(
          context,
          `No Twitch channel '${login}' (check the handle).`,
          'unknown-login'
        );
      }
      this.send(
        context,
        Mml.compose`\nTuned in to Twitch #${res.login ?? login}.\n`
      );
      return;
    }

    const res = await TwitchApi.untune(actor, login);
    if (!res.ok) {
      return this.fail(
        context,
        `You aren't tuned in to '${login}'.`,
        'unknown-login'
      );
    }
    this.send(context, Mml.compose`\nLeft Twitch #${res.login ?? login}.\n`);
  }

  private async executeHistory(
    model: TwitchModel,
    context: CommandContext
  ): Promise<void> {
    const login = (model.channel ?? '').trim();
    if (!login) return this.fail(context, 'channel required', 'channel-required');
    const ring = await TwitchApi.historyFor(login);
    if (ring.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(`\nNo history for Twitch #${login} (tune in first?).\n`)
      );
      return;
    }
    const lines = [`Twitch #${login}:`];
    for (const f of ring) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeWho(
    model: TwitchModel,
    context: CommandContext
  ): Promise<void> {
    const login = (model.channel ?? '').trim();
    if (!login) return this.fail(context, 'channel required', 'channel-required');
    const tuned = await TwitchApi.whoTuned(login);
    if (tuned.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(`\nNo one tuned in to Twitch #${login}.\n`)
      );
      return;
    }
    const lines = [`Tuned in to Twitch #${login}:`];
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

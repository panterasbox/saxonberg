/**
 * WatchController — the `watch` verb (focal video embed, cardinality 1).
 *
 * `watch <target>` resolves the *embed* shape and writes it to the
 * server-authoritative per-viewer `cockpit.watch` clientState (transient,
 * the `cockpit.inputModes` / ModeController precedent: `setClientState` →
 * `pushClientStateUpdate`, no `save()`), then the client mirrors it and
 * renders the platform's public-player iframe. `watch off` clears it. Most
 * forms resolve with no external call (Twitch handle, YouTube URL / videoId
 * / `UC…` channelId), so watching works even when the chat relay is
 * unconfigured; a bare YouTube `@handle` needs the P3 reader (deferred).
 *
 * Watching also *implies* following the chat — a best-effort delegation to
 * `StreamApi.tune` (Twitch this cycle; YouTube chat-tune lands in P3).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { PlayerApi } from '../../../api/player';
import { StreamApi } from '../../../api/stream';
import { StreamerTarget } from '../../../lib/streaming/StreamerTarget';
import type { ParsedTarget } from '../../../lib/streaming/StreamerTarget';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { HasInteractive } from '../../../lib/connection/HasInteractive';
import type { WatchTarget } from '@saxonberg/types';

const WATCH_KEY = 'cockpit.watch';

type WatchHost = Stuff & HasInteractive;

interface WatchModel extends CommandModel {
  target?: string;
  twitch?: boolean;
  youtube?: boolean;
}

export default class WatchController extends CommandController<WatchModel> {
  async execute(model: WatchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isHasInteractive(giver)) {
      return this.fail(
        context,
        'Only players can watch a stream.',
        'no-interactive',
      );
    }
    const host: WatchHost = giver;

    if (model.subcommand === 'off') return this.clear(host, context);
    const target = (model.target ?? '').trim();
    if (!target) {
      return this.send(
        context,
        Mml.fromMarkup(
          '\nWatch a stream: `watch <handle> --twitch` / `--youtube`, a ' +
            'URL, or a character. `watch off` clears it.\n',
        ),
      );
    }
    return this.watch(model, context, host);
  }

  private clear(host: WatchHost, context: CommandContext): void {
    host.setClientState(WATCH_KEY, null);
    host.pushClientStateUpdate(WATCH_KEY, null);
    this.send(context, Mml.fromMarkup('\nCleared the focal embed.\n'));
  }

  private async watch(
    model: WatchModel,
    context: CommandContext,
    host: WatchHost,
  ): Promise<void> {
    const parsed = StreamerTarget.parse((model.target ?? '').trim(), {
      twitch: model.twitch,
      youtube: model.youtube,
    });
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);

    // Character form: resolve to the linked Twitch channel, embed + tune.
    if (parsed.form === 'character') {
      const resolved = await StreamApi.resolveTarget(parsed);
      if (!resolved.ok) {
        return this.fail(
          context,
          'Could not resolve that character to a stream.',
          resolved.reason,
        );
      }
      this.setWatch(host, context, {
        platform: 'twitch',
        channel: resolved.target.handle,
      });
      const actor = context.commandGiver;
      if (PlayerApi.isAvatarStuff(actor)) {
        await StreamApi.tune(actor, resolved.target);
      }
      return;
    }

    // URL / handle form — resolve the embed shape (no external call), except
    // a bare YouTube @handle which resolves to a durable channelId via the
    // reader credential (D4=(c)).
    let embed = this.embedFor(parsed);
    if (embed === 'youtube-handle') {
      const r = await StreamApi.resolveYoutubeChannelId(parsed.identifier);
      if (!r.ok) {
        return this.fail(
          context,
          r.reason === 'no-relay'
            ? "Give a YouTube URL or video id — the YouTube reader isn't configured."
            : 'No YouTube channel by that handle.',
          r.reason,
        );
      }
      embed = { platform: 'youtube', channelId: r.channelId };
    }
    this.setWatch(host, context, embed);

    // Watching implies following the chat — best-effort (Twitch this cycle;
    // YouTube chat-tune resolves to no-relay until P3, so no-op).
    const actor = context.commandGiver;
    if (PlayerApi.isAvatarStuff(actor)) {
      const resolved = await StreamApi.resolveTarget(parsed);
      if (resolved.ok) await StreamApi.tune(actor, resolved.target);
    }
  }

  /**
   * The embed-shaped {@link WatchTarget} for a URL/handle target, or
   * `'youtube-handle'` when it's a bare YouTube handle (P3-resolved).
   */
  private embedFor(
    parsed: Extract<ParsedTarget, { form: 'url' | 'handle' }>,
  ): WatchTarget | 'youtube-handle' {
    if (parsed.platform === 'twitch') {
      return { platform: 'twitch', channel: parsed.identifier };
    }
    const kind = StreamerTarget.classifyYoutubeRef(parsed.identifier);
    if (kind === 'videoId') {
      return { platform: 'youtube', videoId: parsed.identifier };
    }
    if (kind === 'channelId') {
      return { platform: 'youtube', channelId: parsed.identifier };
    }
    return 'youtube-handle';
  }

  private setWatch(
    host: WatchHost,
    context: CommandContext,
    target: WatchTarget,
  ): void {
    host.setClientState(WATCH_KEY, target);
    host.pushClientStateUpdate(WATCH_KEY, target);
    const label =
      target.platform === 'twitch'
        ? `Twitch #${target.channel}`
        : 'videoId' in target
          ? `YouTube ${target.videoId}`
          : `YouTube ${target.channelId}`;
    this.send(context, Mml.fromMarkup(`\nWatching ${label}.\n`));
  }

  private rejectParse(
    context: CommandContext,
    parsed: Extract<ParsedTarget, { form: 'reject' }>,
  ): void {
    switch (parsed.reason) {
      case 'empty':
        return this.fail(
          context,
          'Name a stream: a handle + --twitch/--youtube, a URL, or a character.',
          'empty',
        );
      case 'ambiguous-handle':
        return this.fail(
          context,
          'which platform? add --twitch or --youtube (or give a full URL).',
          'ambiguous-handle',
        );
      case 'url-opt-conflict':
        return this.fail(
          context,
          'that URL already names its platform — drop the --twitch/--youtube.',
          'url-opt-conflict',
        );
      case 'character-youtube':
        return this.fail(
          context,
          'YouTube-by-character isn’t supported yet — give a YouTube handle or URL.',
          'character-youtube',
        );
    }
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
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

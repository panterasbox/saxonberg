/**
 * WatchController — the `watch` verb (focal video embed, cardinality 1).
 *
 * `watch <target>` resolves the *embed* shape and writes it to the
 * server-authoritative per-viewer `cockpit.watch` clientState (transient,
 * the `cockpit.inputModes` / CliController precedent: `setClientState` →
 * `pushClientStateUpdate`, no `save()`), then the client mirrors it and
 * renders the platform's public-player iframe. `watch off` clears it. Most
 * forms resolve with no external call (Twitch handle, YouTube URL / videoId
 * / `UC…` channelId), so watching works even when the chat relay is
 * unconfigured; a bare YouTube `@handle` resolves to a channelId via the
 * YouTube reader (`channels.list`), so that form needs the reader set.
 *
 * Watching also *implies* following the chat — a best-effort delegation to
 * `StreamApi.tune` (Twitch two-way; YouTube read-only).
 *
 * `watch <target> on <screen>` drives a SHARED display instead (the
 * booth TV): the screen's own `mayDrive` decides (the remote, the seat, reach),
 * and its `show` writes every viewer's embed who sees the screen.
 * `watch off on <screen>` darkens it. See docs/subsystems/display.md.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PlayerApi } from '../../../../api/player';
import { StreamApi } from '../../../../api/stream';
import type { Display } from '../../../../lib/display/Display';
import type { MqlOneResult } from '../../../../api/mql';
import { StreamerTarget } from '../../../../lib/streaming/StreamerTarget';
import type { ParsedTarget } from '../../../../lib/streaming/StreamerTarget';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { HasInteractive } from '../../../../lib/connection/HasInteractive';
import type { WatchTarget } from '@saxonberg/types';

const WATCH_KEY = 'cockpit.watch';

type WatchHost = Stuff & HasInteractive;

interface WatchModel extends CommandModel {
  target?: string;
  twitch?: boolean;
  youtube?: boolean;
  kick?: boolean;
  /** `watch <target> on <display>` — a shared screen, not the personal embed. */
  on?: MqlOneResult;
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

    const screen = model.on?.stuff ?? null;
    if (screen) {
      if (!MixinApi.isDisplay(screen)) {
        return this.fail(context, "that isn't a screen.", 'not-display');
      }
      if (!(await screen.mayDrive(giver))) {
        return this.fail(
          context,
          `you can't drive ${screen.getPresentation()} — whoever holds the remote can.`,
          'not-driver',
        );
      }
      if (model.subcommand === 'off') {
        screen.clear();
        return this.send(
          context,
          Mml.fromMarkup(`\nYou switch ${screen.getPresentation()} off.\n`),
        );
      }
    }
    if (model.subcommand === 'off') return this.clear(host, context);
    const target = (model.target ?? '').trim();
    if (!target) {
      return this.send(
        context,
        Mml.fromMarkup(
          '\nWatch a stream: `watch <handle> --twitch` / `--youtube` / ' +
            '`--kick`, a URL, or a character. `watch off` clears it.\n',
        ),
      );
    }
    return this.watch(model, context, host, screen);
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
    screen: (Stuff & Display) | null,
  ): Promise<void> {
    const parsed = StreamerTarget.parse((model.target ?? '').trim(), {
      twitch: model.twitch,
      youtube: model.youtube,
      kick: model.kick,
    });
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);

    // Character form: resolve to the linked Twitch channel, embed + tune.
    if (parsed.form === 'character') {
      const resolved = await StreamApi.resolveTarget(parsed);
      if (!resolved.ok) {
        // A bare word is ambiguous between a character name and a stream
        // handle: if it names no online character, point at the platform
        // flags rather than a character-specific dead end.
        const detail =
          resolved.reason === 'unlinked'
            ? "that character hasn't linked a Twitch or Kick account."
            : resolved.reason === 'no-relay'
              ? "The stream relay isn't configured."
              : 'No online character by that name — for a stream handle ' +
                'add --twitch, --youtube, or --kick (or give a URL).';
        return this.fail(context, detail, resolved.reason);
      }
      // A character resolves to twitch or kick (never youtube) — both
      // embed by channel handle/slug.
      this.setWatch(
        host,
        context,
        {
          platform: resolved.target.platform === 'kick' ? 'kick' : 'twitch',
          channel: resolved.target.handle,
        },
        screen,
      );
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
    this.setWatch(host, context, embed, screen);

    // Watching implies following the chat — best-effort delegation to
    // `StreamApi.tune` (Twitch two-way; YouTube read-only, and a no-op when
    // its reader is unconfigured).
    const actor = context.commandGiver;
    if (PlayerApi.isAvatarStuff(actor)) {
      const resolved = await StreamApi.resolveTarget(parsed);
      if (resolved.ok) await StreamApi.tune(actor, resolved.target);
    }
  }

  /**
   * The embed-shaped {@link WatchTarget} for a URL/handle target, or
   * `'youtube-handle'` when it's a bare YouTube handle (resolved to a
   * channelId via the YouTube reader).
   */
  private embedFor(
    parsed: Extract<ParsedTarget, { form: 'url' | 'handle' }>,
  ): WatchTarget | 'youtube-handle' {
    if (parsed.platform === 'twitch') {
      return { platform: 'twitch', channel: parsed.identifier };
    }
    if (parsed.platform === 'kick') {
      // Kick needs no resolve — the slug is the embed key, and the player
      // renders an offline channel gracefully (persistent binding).
      return { platform: 'kick', channel: parsed.identifier };
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
    screen: (Stuff & Display) | null,
  ): void {
    const label =
      target.platform === 'twitch'
        ? `Twitch #${target.channel}`
        : target.platform === 'kick'
          ? `Kick #${target.channel}`
          : 'videoId' in target
            ? `YouTube ${target.videoId}`
            : `YouTube ${target.channelId}`;
    if (screen) {
      // A shared screen: the server writes every viewer's embed who sees
      // it (the driver included when they do) — never the driver's alone.
      if (!screen.acceptsSource({ kind: 'stream', target, label })) {
        return this.fail(
          context,
          `${screen.getPresentation()} doesn't show streams.`,
          'source-refused',
        );
      }
      screen.show({ kind: 'stream', target, label });
      this.send(
        context,
        Mml.fromMarkup(`\n${screen.getPresentation()} shows ${label}.\n`),
      );
      return;
    }
    host.setClientState(WATCH_KEY, target);
    host.pushClientStateUpdate(WATCH_KEY, target);
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
          'Name a stream: a handle + --twitch/--youtube/--kick, a URL, ' +
            'or a character.',
          'empty',
        );
      case 'ambiguous-handle':
        return this.fail(
          context,
          'which platform? add --twitch, --youtube, or --kick (or give ' +
            'a full URL).',
          'ambiguous-handle',
        );
      case 'url-opt-conflict':
        return this.fail(
          context,
          'that URL already names its platform — drop the ' +
            '--twitch/--youtube/--kick.',
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
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}

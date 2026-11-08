/**
 * TuneControllerBase — what every `tune` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base per
 * noun). `tune` is chat-follow, cardinality N, with `fallthrough: true`: an
 * unknown first token (`tune shroud --twitch hello`) falls through to the
 * bare form — {@link TuneInController} (tune-in, or post when a trailing
 * message is present; with no target at all, the list).
 *
 * The target is platform-agnostic — a URL, a bare handle + `--twitch` /
 * `--youtube`, or an in-game character — parsed by the pure
 * `StreamerTarget.parse` and resolved by `StreamApi`. Subcommands: off /
 * list / who / history. The relay is its own surface (not a Channel), so
 * these forward to `StreamApi`. Outbound posting (Twitch only) reject-and-
 * points unlinked/unscoped players into the auth re-consent flow; YouTube
 * posting reject-and-points read-only.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StreamApi } from '../../../../api/stream';
import { PlayerApi } from '../../../../api/player';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { TunedTarget } from '@saxonberg/types';
import { StreamerTarget } from '../../../../lib/streaming/StreamerTarget';
import type { ParsedTarget } from '../../../../lib/streaming/StreamerTarget';

type Service = 'twitch' | 'youtube' | 'kick';

export interface TuneModel extends CommandModel {
  target?: string;
  message?: string;
  twitch?: boolean;
  youtube?: boolean;
  kick?: boolean;
}

/** A service+handle derived from a parsed target (or a typed rejection). */
type ServiceHandle =
  | { ok: true; service: Service; handle: string }
  | { ok: false };

const TUNED_KEY = 'cockpit.tuned';

export abstract class TuneControllerBase extends CommandController<TuneModel> {
  /**
   * Republish the viewer's tuned set to `cockpit.tuned`.
   *
   * ⭐ **Derived from the relay, never accumulated here.** The rail reads
   * this key, and the temptation is to push/splice a row as each `tune`
   * lands — which makes the client's list a SECOND record of who is
   * following what, free to drift from the relay's own. Re-reading
   * `tunedTargetsFor` after every change keeps one source of truth.
   *
   * `canPost` is the server's answer about outbound posting: only Twitch
   * has the path this cycle (YouTube and Kick chat are read-only, as the
   * verb's own help says), so the rail can disable a composer instead of
   * letting somebody type into a channel that will refuse.
   *
   * ⚠ Not called from the relay's own drop paths — a YouTube stream
   * ending (`StreamApi.dropChannel`) leaves a stale row until the next
   * tune. Logout is covered because the key is transient.
   */
  protected async publishTuned(actor: Stuff): Promise<void> {
    if (!MixinApi.isSaxonbergClient(actor)) return;
    try {
      const channels = await StreamApi.tunedTargetsFor(actor as never);
      const rows: TunedTarget[] = channels.map((c) => ({
        platform: c.service,
        handle: c.handle,
        canPost: c.service === 'twitch',
      }));
      actor.setClientState(TUNED_KEY, rows);
      actor.pushClientStateUpdate(TUNED_KEY, rows);
    } catch {
      /*
       * ⚠ **Refreshing the rail must never fail the tune.**
       *
       * This is a UI PROJECTION of state the relay already holds
       * authoritatively — the player is tuned in either way. A world
       * without the relay singleton resident (every test that does not
       * need one) would otherwise turn a working `tune` into a thrown
       * command, which is a much worse outcome than a rail that lags by
       * one action.
       *
       * The same posture as the emote catalogue on the connect path: a
       * projection failing is not the act failing.
       */
    }
  }

  /** What the viewer follows (`tune list`, and bare `tune` with no target). */
  protected async listTuned(context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const channels = await StreamApi.tunedTargetsFor(actor);
    if (channels.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(
          "\nYou aren't following any stream chat. Follow one with " +
            '`tune <handle> --twitch` / `--youtube` / `--kick`, a URL, ' +
            'or a character.\n',
        ),
      );
      return;
    }
    const lines = ['Following:'];
    for (const c of channels) lines.push(`  ${c.service} #${c.handle}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  protected parseTarget(model: TuneModel): ParsedTarget {
    return StreamerTarget.parse((model.target ?? '').trim(), {
      twitch: model.twitch,
      youtube: model.youtube,
      kick: model.kick,
    });
  }

  /**
   * Derive `{ service, handle }` from a parsed target. URL/handle forms carry
   * both directly; a character form is resolved (its handle is the linked
   * login). On failure, notes the rejection and returns `{ ok: false }`.
   */
  protected async serviceHandle(parsed: ParsedTarget): Promise<ServiceHandle> {
    if (parsed.form === 'reject') return { ok: false };
    if (parsed.form === 'character') {
      const resolved = await StreamApi.resolveTarget(parsed);
      if (!resolved.ok) {
        // Surface a generic rejection (no context handle for a bad char).
        return { ok: false };
      }
      return { ok: true, service: resolved.target.platform, handle: resolved.target.handle };
    }
    return { ok: true, service: parsed.platform, handle: parsed.identifier };
  }

  // ---- reject-and-point --------------------------------------------------

  protected rejectParse(
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

  protected rejectResolve(
    context: CommandContext,
    parsed: ParsedTarget,
    reason: string,
  ): void {
    const platform =
      parsed.form === 'url' || parsed.form === 'handle'
        ? parsed.platform
        : 'twitch';
    switch (reason) {
      case 'no-relay':
        return this.fail(
          context,
          platform === 'youtube'
            ? "YouTube chat relay isn't configured."
            : platform === 'kick'
              ? "Kick relay isn't configured."
              : "Twitch relay isn't configured.",
          'no-relay',
        );
      case 'not-live':
        return this.fail(
          context,
          "that channel isn't streaming right now.",
          'not-live',
        );
      case 'unknown-character':
        // A bare word that names no online character is an ambiguous
        // handle — point at the platform flags, not a character dead end.
        return this.fail(
          context,
          'No online character by that name — for a stream handle ' +
            'add --twitch, --youtube, or --kick (or give a URL).',
          'unknown-character',
        );
      case 'unlinked':
        return this.fail(
          context,
          "that character hasn't linked a Twitch or Kick account.",
          'unlinked',
        );
      default:
        return this.fail(
          context,
          `No ${platform} channel by that handle (check it).`,
          'unknown-target',
        );
    }
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
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

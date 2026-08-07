/**
 * TuneController — the `tune` verb (chat-follow, cardinality N). One
 * controller, dispatch-on-subcommand with `fallthrough: true`: an unknown
 * first token (`tune shroud --twitch hello`) falls through to the bare form
 * (tune-in, or post when a trailing message is present).
 *
 * The target is platform-agnostic — a URL, a bare handle + `--twitch` /
 * `--youtube`, or an in-game character — parsed by the pure
 * `StreamerTarget.parse` and resolved by `StreamApi`. Subcommands: off /
 * list / who / history. The relay is its own surface (not a Channel), so
 * this forwards to `StreamApi`. Outbound posting (Twitch only) reject-and-
 * points unlinked/unscoped players into the auth re-consent flow; YouTube
 * posting reject-and-points read-only.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { StreamApi } from '../../../api/stream';
import { PlayerApi } from '../../../api/player';
import { StreamerTarget } from '../../../lib/streaming/StreamerTarget';
import type { ParsedTarget } from '../../../lib/streaming/StreamerTarget';

type Service = 'twitch' | 'youtube' | 'kick';

interface TuneModel extends CommandModel {
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

export default class TuneController extends CommandController<TuneModel> {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case undefined:
        return this.executeDefault(model, context);
      case 'list':
        return this.executeList(context);
      case 'off':
        return this.executeOff(model, context);
      case 'history':
        return this.executeHistory(model, context);
      case 'who':
        return this.executeWho(model, context);
      default:
        return this.fail(
          context,
          `Unknown tune subcommand: ${model.subcommand}`,
          'unknown-subcommand',
        );
    }
  }

  /** Bare `tune` → list; `tune <target>` → follow; `+ <message>` → post. */
  private async executeDefault(
    model: TuneModel,
    context: CommandContext,
  ): Promise<void> {
    const target = (model.target ?? '').trim();
    if (!target) return this.executeList(context);
    const message = (model.message ?? '').trim();
    if (message) return this.executePost(model, context, message);
    return this.executeTuneIn(model, context);
  }

  private parseTarget(model: TuneModel): ParsedTarget {
    return StreamerTarget.parse((model.target ?? '').trim(), {
      twitch: model.twitch,
      youtube: model.youtube,
      kick: model.kick,
    });
  }

  private async executeTuneIn(
    model: TuneModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);

    const resolved = await StreamApi.resolveTarget(parsed);
    if (!resolved.ok) return this.rejectResolve(context, parsed, resolved.reason);

    const res = await StreamApi.tune(actor, resolved.target);
    this.send(
      context,
      Mml.compose`\nFollowing ${res.ok ? res.service : ''} #${
        res.ok ? res.handle : resolved.target.handle
      }.\n`,
    );
  }

  private async executePost(
    model: TuneModel,
    context: CommandContext,
    body: string,
  ): Promise<void> {
    const speaker = context.commandGiver;
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return; // rejection already noted

    const result = await StreamApi.post(speaker, sh.service, sh.handle, body);
    if (result.ok) return; // the mirror is delivered to tuned-in players

    switch (result.reason) {
      case 'read-only':
        return this.fail(
          context,
          sh.service === 'kick'
            ? 'Kick chat is read-only for now — posting arrives with ' +
              'Kick phase 2.'
            : 'YouTube posting isn’t available — YouTube chat is read-only.',
          'read-only',
        );
      case 'no-channel':
        return this.fail(
          context,
          `Follow ${sh.service} #${sh.handle} first: tune ${sh.handle} --${sh.service}`,
          'no-channel',
        );
      case 'empty':
        return this.fail(context, 'message required', 'message-required');
      case 'unlinked':
        return this.fail(
          context,
          'Link your Twitch account to post here: /auth/twitch/link',
          'unlinked',
        );
      case 'unscoped':
        return this.fail(
          context,
          'Authorize chat posting first: /auth/twitch/reauth?scope=user:write:chat',
          'unscoped',
        );
      case 'throttled':
        return this.fail(
          context,
          "You're posting too fast — give it a moment.",
          'throttled',
        );
      case 'send-failed':
        return this.fail(
          context,
          `Send failed${result.detail ? `: ${result.detail}` : ''}.`,
          'send-failed',
        );
    }
  }

  private async executeOff(
    model: TuneModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return;

    const res = await StreamApi.untune(actor, sh.service, sh.handle);
    if (!res.ok) {
      return this.fail(
        context,
        `You aren't following '${sh.handle}'.`,
        'unknown-target',
      );
    }
    this.send(
      context,
      Mml.compose`\nStopped following ${sh.service} #${res.handle ?? sh.handle}.\n`,
    );
  }

  private async executeList(context: CommandContext): Promise<void> {
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

  private async executeHistory(
    model: TuneModel,
    context: CommandContext,
  ): Promise<void> {
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return;
    const ring = await StreamApi.historyFor(sh.service, sh.handle);
    if (ring.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(
          `\nNo history for ${sh.service} #${sh.handle} (follow it first?).\n`,
        ),
      );
      return;
    }
    const lines = [`${sh.service} #${sh.handle}:`];
    for (const f of ring) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeWho(
    model: TuneModel,
    context: CommandContext,
  ): Promise<void> {
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return;
    const tuned = await StreamApi.whoTuned(sh.service, sh.handle);
    if (tuned.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(`\nNo one is following ${sh.service} #${sh.handle}.\n`),
      );
      return;
    }
    const lines = [`Following ${sh.service} #${sh.handle}:`];
    for (const a of tuned) lines.push(`  ${a.getPresentation()}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  /**
   * Derive `{ service, handle }` from a parsed target. URL/handle forms carry
   * both directly; a character form is resolved (its handle is the linked
   * login). On failure, notes the rejection and returns `{ ok: false }`.
   */
  private async serviceHandle(parsed: ParsedTarget): Promise<ServiceHandle> {
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

  private rejectResolve(
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

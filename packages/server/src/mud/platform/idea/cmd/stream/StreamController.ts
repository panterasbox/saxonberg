/**
 * StreamController — the `stream` verb (broadcast-ready D10).
 *
 * ⭐ Controllers are IO: this parses the line, resolves the reason row,
 * calls ONE method on the caller's own `BroadcastMixin`, and renders the
 * answer — including a refusal BY NAME when the mixin says the move is
 * illegal. It decides nothing about a stream; the mixin does (P5).
 *
 * Gated to the streamer axis declaratively — `stream.yaml` carries
 * `requiresStreamer`, so the dispatcher refuses before this runs.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { CardApi } from '../../../../api/card';
import { StreamApi } from '../../../../api/stream';
import {
  BROADCAST_SERVICES,
  type BroadcastHost,
  type BroadcastResult,
  type BroadcastService,
} from '../../../../lib/livestream/Broadcast';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface StreamModel extends CommandModel {
  rest?: string;
  first?: string;
  second?: string;
  reason?: string;
  duration?: string;
  title?: string;
  items?: string;
  action?: string;
  panel?: string;
  service?: string;
  handle?: string;
  control?: boolean;
}

/** What each refusal word says to the streamer. */
const REFUSALS: Readonly<Record<string, string>> = {
  'not-streaming': "you aren't streaming — `stream start` first",
  ending: 'the stream is ending — `stream off` to end it now',
  'already-on-air': 'the stream is already on air',
  'no-agenda': 'there is no agenda — `stream agenda <item; item; …>`',
  'agenda-done': 'the agenda is finished',
  'unknown-panel': 'name a panel: `stream rotation pin <panel>`',
};

export default class StreamController extends CommandController<StreamModel> {
  async execute(model: StreamModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;
    if (!MixinApi.isBroadcastHost(giver)) {
      return this.fail(context, 'you have no stream to run', 'no-broadcast-host');
    }
    switch (model.subcommand) {
      case undefined:
      case null:
      case '':
        return this.executeStatus(giver, context);
      case 'start':
        return this.executeStart(giver, model, context);
      case 'live':
      case 'back':
        return this.answer(context, giver.goLive(), 'live — the desktop is on air');
      case 'away':
        return this.executeAway(giver, model, context);
      case 'end':
        return this.answer(context, giver.endStream(), 'ending — the outro is on; offline when it finishes');
      case 'off':
        return this.answer(context, giver.goOffline(), 'offline');
      case 'segment':
        giver.nameTopic(model.title ?? null);
        return this.tell(context, `topic: ${model.title ?? '(none)'}`);
      case 'agenda':
        return this.executeAgenda(giver, model, context);
      case 'next':
        return this.answer(context, giver.advanceStreamAgenda(), 'agenda: next');
      case 'rotation':
        return this.executeRotation(giver, model, context);
      case 'channel':
        return this.executeChannel(giver, model, context);
      case 'token':
        return this.executeToken(giver, model, context);
      default:
        return this.fail(
          context,
          `Unknown stream subcommand: ${model.subcommand}`,
          'unknown-subcommand',
        );
    }
  }

  /** Bare `stream`: where the stream is, and the controls card. */
  private async executeStatus(
    giver: Stuff & BroadcastHost,
    context: CommandContext,
  ): Promise<void> {
    const show = giver.show();
    const reason = show.reason ? ` (${show.reason.label})` : '';
    this.tell(context, `stream: ${show.phase}${reason}`);
    // The picker's rows ride the card's state (the streamer's own).
    giver.loadControls({
      reasons: (await StreamApi.standbyReasons()).map((r) => ({
        ...r.toView(),
        defaultDurationMs: r.defaultDurationMs,
      })),
    });
    CardApi.open(context, 'stream');
  }

  private executeStart(
    giver: Stuff & BroadcastHost,
    model: StreamModel,
    context: CommandContext,
  ): void {
    // `stream start in 10m` and `stream start 10m` read alike.
    const word = model.first === 'in' ? model.second : model.first;
    let atMs: number | null = null;
    if (word !== undefined && word !== '') {
      const ms = StreamApi.parseDuration(word);
      if (ms === null) {
        return this.fail(context, `can't parse duration '${word}' (try 10m, 1h, 90s)`, 'bad-duration');
      }
      atMs = Date.now() + ms;
    }
    const label = word ? `starting — in ${word}` : 'starting';
    return this.answer(context, giver.startStream(atMs), label);
  }

  private async executeAway(
    giver: Stuff & BroadcastHost,
    model: StreamModel,
    context: CommandContext,
  ): Promise<void> {
    const reading = await StreamApi.interpretAway(model.reason ?? '', model.duration);
    if (!reading.ok) return this.fail(context, reading.detail, reading.refusal);
    const { reason, durationMs } = reading;
    const when =
      durationMs === null ? 'back shortly' : `back in ${StreamApi.formatDuration(durationMs)}`;
    return this.answer(
      context,
      giver.goStandby(reason, durationMs),
      `standby — ${reason.label}, ${when}`,
    );
  }

  private executeAgenda(
    giver: Stuff & BroadcastHost,
    model: StreamModel,
    context: CommandContext,
  ): void {
    const text = (model.items ?? '').trim();
    // `;` is the shell's command separator, so the list splits on commas.
    const items = text === 'clear' ? [] : text.split(',');
    giver.planAgenda(items);
    const count = giver.show().agenda.length;
    return this.tell(context, count === 0 ? 'agenda cleared' : `agenda: ${count} items`);
  }

  private executeRotation(
    giver: Stuff & BroadcastHost,
    model: StreamModel,
    context: CommandContext,
  ): void {
    const action = model.action;
    if (action !== 'pin' && action !== 'skip' && action !== 'clear') {
      return this.fail(context, 'rotation: pin <panel>, skip <panel> or clear', 'bad-rotation');
    }
    return this.answer(
      context,
      giver.steerRotation(action, model.panel ?? null),
      `rotation: ${action}${model.panel ? ` ${model.panel}` : ''}`,
    );
  }

  private async executeChannel(
    giver: Stuff & BroadcastHost,
    model: StreamModel,
    context: CommandContext,
  ): Promise<void> {
    const service = (model.service ?? '').toLowerCase();
    if (!(BROADCAST_SERVICES as readonly string[]).includes(service)) {
      return this.fail(
        context,
        `service must be one of ${BROADCAST_SERVICES.join(', ')}`,
        'unknown-service',
      );
    }
    giver.nameChannel(service as BroadcastService, model.handle ?? null);
    const playerId = giver.getPlayerId();
    if (playerId) await StreamApi.refreshOverlayReading(playerId);
    return this.tell(
      context,
      model.handle ? `${service}: ${model.handle}` : `${service}: cleared`,
    );
  }

  private async executeToken(
    giver: Stuff & BroadcastHost,
    model: StreamModel,
    context: CommandContext,
  ): Promise<void> {
    const scope = model.control === true ? 'control' : 'overlay';
    const token = await StreamApi.issueToken(giver, scope);
    const use =
      scope === 'control'
        ? "pblive's SAXONBERG_CONTROL_TOKEN"
        : 'your overlay URL: ?broadcast=<token>';
    // Shown once; never stored in clear and never put on a frame's tags.
    return this.tell(
      context,
      `${scope} token (shown once — any earlier one no longer works):\n${token}\nUse it as ${use}`,
    );
  }

  /** Render a transition: the success line, or the refusal by name. */
  private answer(context: CommandContext, result: BroadcastResult, success: string): void {
    if (result.ok) {
      // On air, the streamer's own numbers start coming to their card (D16).
      const playerId = (context.commandGiver as Stuff).getPlayerId();
      if (playerId) StreamApi.watchNumbers(playerId);
      return this.tell(context, success);
    }
    return this.fail(context, REFUSALS[result.refusal] ?? result.refusal, result.refusal);
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      // Every line here carries the streamer's own words (a topic, a
      // handle, a token) — escaped whole, never read as markup.
      .toSelf(Mml.fromMarkup(`\n${Mml.escape(text)}\n`))
      .send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.tell(context, detail);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

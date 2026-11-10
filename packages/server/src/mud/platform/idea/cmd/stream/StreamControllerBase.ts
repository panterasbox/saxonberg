/**
 * StreamControllerBase — what the `stream` subcommands share
 * (broadcast-ready D10, split one controller per subcommand by
 * controller-liquidity D13 at the merge).
 *
 * ⭐ Controllers are IO: each subcommand's controller parses its line,
 * calls ONE method on the caller's own `BroadcastMixin`, and renders the
 * answer — including a refusal BY NAME when the mixin says the move is
 * illegal. It decides nothing about a stream; the mixin does (P5).
 *
 * Gated to the streamer axis declaratively — `stream.yaml` carries
 * `requiresStreamer`, so the dispatcher refuses before a controller runs.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { StreamApi } from '../../../../api/stream';
import type { BroadcastHost, BroadcastResult } from '../../../../lib/livestream/Broadcast';
import type { Stuff } from '../../../../lib/stuff/Stuff';

export interface StreamModel extends CommandModel {
  rest?: string;
  duration?: string;
  reason?: string;
  title?: string;
  items?: string;
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
  'no-agenda': 'there is no agenda — `stream agenda <item, item, …>`',
  'agenda-done': 'the agenda is finished',
  'unknown-panel': 'name a panel: `stream-rotation pin <panel>`',
};

export abstract class StreamControllerBase extends CommandController<StreamModel> {
  /** The caller's own stream, or a refusal said and `null`. */
  protected host(context: CommandContext): (Stuff & BroadcastHost) | null {
    const giver = context.commandGiver as Stuff;
    if (MixinApi.isBroadcastHost(giver)) return giver;
    this.fail(context, 'you have no stream to run', 'no-broadcast-host');
    return null;
  }

  /** Render a transition: the success line, or the refusal by name. */
  protected answer(context: CommandContext, result: BroadcastResult, success: string): void {
    if (result.ok) {
      // On air, the streamer's own numbers start coming to their card (D16).
      const playerId = (context.commandGiver as Stuff).getPlayerId();
      if (playerId) StreamApi.watchNumbers(playerId);
      return this.tell(context, success);
    }
    return this.fail(context, REFUSALS[result.refusal] ?? result.refusal, result.refusal);
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      // Every line here carries the streamer's own words (a topic, a
      // handle, a token) — escaped whole, never read as markup.
      .toSelf(Mml.fromMarkup(`\n${Mml.escape(text)}\n`))
      .send();
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    this.tell(context, detail);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

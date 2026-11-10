/**
 * StreamControllerBase — what the two `stream` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun). The `stream` verb is the v1 sliver of the livestream
 * control plane: each subcommand mutates the `/platform/idea/StreamState`
 * singleton, whose mutation fires `Events.StreamStateChanged`, which the
 * backend-layer `BroadcastFeed` re-pushes to broadcast (overlay)
 * connections.
 *
 * Gated to the streamer axis declaratively — stream.yaml's
 * `validators: requiresStreamer` refuses before a controller runs.
 *
 *   - `stream away <duration>` — {@link StreamAwayController}.
 *   - `stream back` — {@link StreamBackController}.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import StreamState from '../../StreamState';

export interface StreamModel extends CommandModel {
  /** `stream away <duration>` — bound by the view's `type: duration`, in ms. */
  duration?: number;
}

export abstract class StreamControllerBase extends CommandController<StreamModel> {
  protected resolveState(): StreamState | null {
    return (
      StuffApi.findByTemplatePath<StreamState>(StreamState.TEMPLATE_PATH) ??
      null
    );
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

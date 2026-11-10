/**
 * TeleportControllerBase — what the two `teleport` controllers share
 * (controller-liquidity W7a): the travel node standing here, found BY
 * SHAPE, and the prose.
 *
 *   - bare `teleport` — {@link TeleportBoardController}: the departures
 *     board of the node you stand at, for EVERYONE (a public timetable).
 *   - `teleport <destination>` — {@link TeleportController}: free inside an
 *     extent you hold, the node's ride, or the anchored spell.
 *
 * Two shapes of one verb, each its own view (`teleport.yaml`,
 * `teleport-destination.yaml`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi } from '../../../../api/mql';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { TravelNode } from '../../../../lib/travel/TravelNode';

export interface TeleportModel extends CommandModel {
  destination?: MqlOneResult;
  /** Channel your OWN reserve into the node for this ride. */
  channel?: boolean;
  /** Put it on the node's meter — the explicit opposite of `--channel`. */
  meter?: boolean;
}

export abstract class TeleportControllerBase extends CommandController<TeleportModel> {
  /**
   * A travel node standing here, found BY SHAPE. `teleport` is not
   * node-afforded, so this looks for what the actor can reach rather
   * than reading `commandSource`.
   */
  protected nodeHere(context: CommandContext): (Stuff & TravelNode) | null {
    return (
      MqlApi.resolveMany('reachable', {
        commandGiver: context.commandGiver,
        scope: 'reachable',
      })
        .stuff.map((s) => (MixinApi.isTravelNode(s) ? s : null))
        .find((n) => n !== null) ?? null
    );
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      // `teleport`'s player-facing fork (the TPA ride + departures board) is a
      // diegetic in-world action, not author tooling — same narration channel
      // as the other movement commands.
      .topic("act.deed")
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string = "unspecified",
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: "controller-rejected", reason, detail });
  }
}

/**
 * TeleportBoardController — bare `teleport`: read the departures board of
 * the travel node you stand at (over {@link TeleportControllerBase}).
 * Anywhere else there is nowhere to travel from.
 *
 * ⭐ The board is a PUBLIC TIMETABLE and renders before any clearance
 * read — which is why it is decided on "was a stop named" (this shape has
 * none), never on a credential.
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { TeleportControllerBase, type TeleportModel } from './TeleportControllerBase';

export default class TeleportBoardController extends TeleportControllerBase {
  async execute(_model: TeleportModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const node = this.nodeHere(context);
    if (!node) {
      return this.fail(context, 'there is nowhere to travel from here', 'no-node');
    }
    // ⭐ The board is a PUBLIC TIMETABLE and renders before any
    // clearance read. Gating it behind a credential made the one verb
    // that could show you the network refuse the people who most
    // needed to see it.
    if (!MixinApi.isSensor(giver)) {
      return this.fail(context, "you can't read the board", 'cannot-read');
    }
    this.tell(context, await node.renderDepartures(giver));
    // ⭐ Reading a public notice IS learning something. The board's
    // stops land on the reader's map marked `publication`, so a place
    // known only from a timetable is distinguishable from one they
    // walked to — and can be wrong in its own way, when a station
    // goes dark.
    //
    // ⚠ After the render and never before it: the board is a public
    // timetable, and nothing about recording what somebody read may
    // become a reason they could not read it.
    const stops = await node.publishedStops?.();
    if (stops && MixinApi.isPerceiver(giver)) {
      giver.learnTimetable(stops);
    }
    return;
  }
}

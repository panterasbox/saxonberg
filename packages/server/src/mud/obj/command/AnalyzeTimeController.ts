/**
 * AnalyzeTimeController — handler for `analyze time`. Reports the
 * current game-time, the time scale, and the calendar date. No
 * instrument required (analyze verbs are introspective). Two
 * audiences, one engine: casual prose first, the analytical line
 * (raw game-seconds + scale) after.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { WorldClockApi } from '../../api/worldclock';
import { DefaultCalendar } from '../../lib/time/DefaultCalendar';

interface AnalyzeTimeModel extends CommandModel {
  detail?: string;
}

const TOPIC = 'world.perception.measurement.analyze-time';

export default class AnalyzeTimeController extends CommandController<AnalyzeTimeModel> {
  execute(_model: AnalyzeTimeModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;
    const now = WorldClockApi.getNow();
    const scale = WorldClockApi.getScale();
    const date = DefaultCalendar.singleton().formatDate(now);

    const body = Mml.compose`It is ${date} in the world.\ngame-time: ${String(
      Math.floor(now.rawValue())
    )}s · scale: ${String(scale)}x\n`;

    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}

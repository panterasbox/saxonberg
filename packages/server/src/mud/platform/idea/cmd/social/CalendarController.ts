/**
 * CalendarController — `calendar`: read your personal calendar (D12).
 *
 * Lists the dated reminders a clinician (or a competent self-treater)
 * wrote to your implant, overdue first, each rendered with the shared
 * game date (`DefaultCalendar.formatDate`) — never a raw second count.
 * The verb is afforded by the `CalendarUpdate` hosted app's
 * `commandContributions.self`; the entries live on the Avatar
 * (`CalendarMixin`), so the controller reads the giver directly.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { WorldClockApi } from '../../../../api/worldclock';
import { Quantity } from '../../../../lib/quantity';
import { DefaultCalendar } from '../../../../lib/time/DefaultCalendar';

const TOPIC = 'act.deed';

export default class CalendarController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isCalendarKeeping(giver)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'no-calendar',
        detail: 'You have no calendar.',
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup('You have no calendar.'))
        .send();
      return;
    }

    const nowS = WorldClockApi.getNow().rawValue();
    const entries = [...giver.getCalendarEntries()].sort((a, b) => {
      const ao = a.whenGameS <= nowS ? 0 : 1;
      const bo = b.whenGameS <= nowS ? 0 : 1;
      return ao !== bo ? ao - bo : a.whenGameS - b.whenGameS;
    });

    if (entries.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup('Nothing on your calendar.'))
        .send();
      return;
    }

    const cal = DefaultCalendar.singleton();
    const lines = entries.map((e) => {
      const date = cal.formatDate(Quantity.of(e.whenGameS, 's'));
      const overdue = e.whenGameS <= nowS ? ' — overdue' : '';
      return `${date}: ${Mml.escape(e.label)}${overdue}`;
    });

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup('Your calendar:\n' + lines.join('\n')))
      .send();
  }
}

/**
 * StreamAgendaController — `stream agenda <item, item, …>` /
 * `stream agenda clear` (over {@link StreamControllerBase}).
 *
 * `;` is the shell's command separator, so the list splits on commas.
 * ⚠ `clear` is the list's own value, not a dispatch: an agenda of the one
 * item "clear" is no agenda.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamAgendaController extends StreamControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    const items = (model.items ?? '')
      .split(',')
      .filter((item, _i, all) => !(all.length === 1 && item.trim().toLowerCase() === 'clear'));
    giver.planAgenda(items);
    const count = giver.show().agenda.length;
    return this.tell(context, count === 0 ? 'agenda cleared' : `agenda: ${count} items`);
  }
}

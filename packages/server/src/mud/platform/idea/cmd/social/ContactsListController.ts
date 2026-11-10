/**
 * ContactsListController — `contacts list` (and bare `contacts`) — the
 * labels you keep, with their counts (over {@link
 * ContactsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsListController extends ContactsControllerBase {
  execute(_model: ContactsModel, context: CommandContext): void {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const labels = host.contactLabels();
    if (labels.length === 0) {
      ContactsControllerBase.send(context, Mml.fromMarkup(`\nNo contacts.\n`));
      return;
    }
    const lines = ['Your contact labels:'];
    for (const l of labels) {
      const n = host.contactsByLabel(l).length;
      lines.push(`  ${l}  (${n} ${n === 1 ? 'entry' : 'entries'})`);
    }
    ContactsControllerBase.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}

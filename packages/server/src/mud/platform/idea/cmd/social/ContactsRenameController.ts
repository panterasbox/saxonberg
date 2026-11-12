/**
 * ContactsRenameController — `contacts rename <old> <new>` — move every
 * entry from one label to another (over {@link ContactsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsRenameController extends ContactsControllerBase {
  execute(model: ContactsModel, context: CommandContext): void {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const oldLabel = (model.old_label ?? '').trim();
    const newLabel = (model.new_label ?? '').trim();
    if (!oldLabel || !newLabel) {
      return ContactsControllerBase.fail(context, 'both labels required', 'label-required');
    }
    const renamed = host.renameContactLabel(oldLabel, newLabel);
    ContactsControllerBase.send(
      context,
      Mml.compose`\nRelabeled ${String(renamed)} from ${oldLabel} to ${newLabel}.\n`,
    );
  }
}

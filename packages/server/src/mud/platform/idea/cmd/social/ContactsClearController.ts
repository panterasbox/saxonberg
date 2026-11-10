/**
 * ContactsClearController — `contacts clear <label>` — empty a label
 * (over {@link ContactsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsClearController extends ContactsControllerBase {
  execute(model: ContactsModel, context: CommandContext): void {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const label = ContactsControllerBase.labelOf(model, context);
    if (!label) return;
    const removed = host.clearContactLabel(label);
    ContactsControllerBase.send(
      context,
      Mml.compose`\nRemoved ${String(removed)} from your ${label} list.\n`,
    );
  }
}

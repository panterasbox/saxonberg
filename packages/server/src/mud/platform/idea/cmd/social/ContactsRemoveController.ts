/**
 * ContactsRemoveController — `contacts remove <name> <label>` — take one
 * entry off a label (over {@link ContactsControllerBase}).
 *
 * Matches against the entries ALREADY on the list, so a person need not
 * be online: by the name the entry goes by now (case-insensitive), or by
 * the raw playerId / templatePath. ⭐ The name match is C73's fix — it
 * was promised by the view and never happened.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsRemoveController extends ContactsControllerBase {
  async execute(model: ContactsModel, context: CommandContext): Promise<void> {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const label = ContactsControllerBase.labelOf(model, context);
    if (!label) return;
    const needle = String(model.target ?? '').trim().toLowerCase();
    if (!needle) {
      return ContactsControllerBase.fail(context, 'target required', 'target-required');
    }
    const entries = host.contactsByLabel(label);
    const avatarNames = await ContactsControllerBase.avatarNames(
      entries.flatMap((e) => (e.kind === 'avatar' ? [e.playerId] : [])),
    );
    const npcNames = await ContactsControllerBase.templateNames(
      entries.flatMap((e) => (e.kind === 'npc' ? [e.templatePath] : [])),
    );
    let removed = 0;
    for (const e of entries) {
      const ref = e.kind === 'avatar' ? e.playerId : e.templatePath;
      const name =
        e.kind === 'avatar' ? avatarNames.get(e.playerId) : npcNames.get(e.templatePath);
      const match =
        ref.toLowerCase() === needle ||
        (name !== undefined && name.toLowerCase() === needle);
      if (match) {
        host.removeContact(e.kind, ref, label);
        removed++;
      }
    }
    if (removed === 0) {
      ContactsControllerBase.send(
        context,
        Mml.compose`\n${needle} isn't in your ${label} list.\n`,
      );
      return;
    }
    ContactsControllerBase.send(
      context,
      Mml.compose`\nRemoved ${String(removed)} entry from your ${label} list.\n`,
    );
  }
}

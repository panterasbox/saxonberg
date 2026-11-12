/**
 * ContactsShowController — `contacts show <label>` — the entries on a
 * label, by the names they go by now (over {@link
 * ContactsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsShowController extends ContactsControllerBase {
  async execute(model: ContactsModel, context: CommandContext): Promise<void> {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const label = ContactsControllerBase.labelOf(model, context);
    if (!label) return;
    const entries = host.contactsByLabel(label);
    if (entries.length === 0) {
      ContactsControllerBase.send(
        context,
        Mml.compose`\nNo entries in your ${label} list.\n`,
      );
      return;
    }
    const avatarIds: string[] = [];
    const npcPaths: string[] = [];
    for (const e of entries) {
      if (e.kind === 'avatar') avatarIds.push(e.playerId);
      else npcPaths.push(e.templatePath);
    }
    const avatarNames = await ContactsControllerBase.avatarNames(avatarIds);
    const npcNames = await ContactsControllerBase.templateNames(npcPaths);
    const lines = [`Your ${label} list:`];
    for (const e of entries) {
      if (e.kind === 'avatar') {
        lines.push(`  ${avatarNames.get(e.playerId) ?? e.playerId}`);
      } else {
        lines.push(`  ${npcNames.get(e.templatePath) ?? e.templatePath} (NPC)`);
      }
    }
    ContactsControllerBase.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}

/**
 * ContactsRemoveController — `contacts remove <name> <label>` — take one
 * entry off a label (over {@link ContactsControllerBase}).
 *
 * Matches against the entries ALREADY on the list, so a person need not
 * be online: by the name the entry goes by now (case-insensitive), or by
 * the raw playerId / templatePath. ⭐ The name match is C73's fix — it
 * was promised by the view and never happened.
 */

import { GrammarApi } from '../../../../api/grammar';
import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { PlayerApi } from '../../../../api/player';
import type { MqlOneResult } from '../../../../api/mql';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsRemoveController extends ContactsControllerBase {
  async execute(model: ContactsModel, context: CommandContext): Promise<void> {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const bound = (model.target ?? null) as MqlOneResult | null;
    const raw = String(bound?.raw ?? '').trim();
    // ⭐ The list the person was named THROUGH (`~friends:iffy`) — read off
    // the binding (naming overhaul D-B6), never re-parsed; else the label
    // typed after the name.
    const via = bound?.via?.relation;
    const viaList = via !== undefined && via.holder === context.commandGiver ? via.name : null;
    // Somebody not in the world binds nothing: the list names its own
    // entries from what was typed (`~friends:iffy`, or `iffy` + a label).
    const offline = /^~([\w-]+):(.+)$/.exec(raw);
    const label = viaList ?? (offline ? offline[1]! : String(model.label ?? '').trim());
    if (!label) {
      return ContactsControllerBase.fail(context, 'Take them off which list? `contacts remove ~friends:<them>`.', 'label-required');
    }
    // Who comes off: the bound person, else the list's own entries the
    // typed name or raw id matches (they need not be in the world).
    const person = bound?.stuff ?? null;
    let targets: { kind: 'avatar' | 'npc'; ref: string }[];
    let who: string;
    if (person !== null) {
      const playerId = PlayerApi.isAvatarStuff(person) ? person.getPlayerId() : null;
      targets = [playerId ? { kind: 'avatar', ref: playerId } : { kind: 'npc', ref: person.getIdentityPath() ?? '' }];
      who = person.getPresentation();
    } else {
      const needle = (offline ? offline[2]! : raw).trim();
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
      // ⭐ The list's own entries, by the one rule (naming overhaul D-B12):
      // the name each goes by now, or its raw id.
      const named = GrammarApi.name(
        needle,
        entries.map((e) => {
          const ref = e.kind === 'avatar' ? e.playerId : e.templatePath;
          const name = (e.kind === 'avatar' ? avatarNames.get(e.playerId) : npcNames.get(e.templatePath)) ?? '';
          return { value: { kind: e.kind, ref }, keywords: [ref, name].filter((k) => k !== '').map((k) => k.toLowerCase()), title: name || ref };
        }),
      );
      targets = named.kind === 'one' ? [named.one] : named.kind === 'tie' ? named.tie : [];
      who = needle;
    }
    let removed = false;
    for (const t of targets) if (host.removeContact(t.kind, t.ref, label)) removed = true;
    ContactsControllerBase.send(
      context,
      removed
        ? Mml.compose`\nRemoved ${who} from your ${label} list.\n`
        : Mml.compose`\n${who} isn't in your ${label} list.\n`,
    );
  }
}

/**
 * ContactsAddController — `contacts add [--char] <target> <label>` — file
 * a player or an NPC under a label (over {@link ContactsControllerBase}).
 *
 * Default `add iffy <label>` expands to one `kind: 'avatar'` entry per
 * current Avatar of iffy's User (sibling-character expansion). `--char`
 * stores a single entry for the resolved Avatar only.
 */

import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';
import { PlayerApi } from '../../../../api/player';
import {
  ContactsControllerBase,
  type ContactsModel,
} from './ContactsControllerBase';

export default class ContactsAddController extends ContactsControllerBase {
  async execute(model: ContactsModel, context: CommandContext): Promise<void> {
    const host = ContactsControllerBase.hostOf(context);
    if (!host) return;
    const label = ContactsControllerBase.labelOf(model, context);
    if (!label) return;
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const target = resolved?.stuff;
    if (!target) {
      return ContactsControllerBase.fail(context, 'No such target.', 'no-target');
    }
    const now = Date.now();

    // NPC entries store the durable PERSON key — `getIdentityPath()`, a
    // Cast member's minted identity (falling back to the row for an Extra);
    // never the lineage, which every clone of the row shares
    // (controller-liquidity D11).
    if (!PlayerApi.isAvatarStuff(target)) {
      const tplPath = target.getIdentityPath();
      if (!tplPath) {
        return ContactsControllerBase.fail(
          context,
          `${target.getPresentation()} cannot be added — it has no durable identifier.`,
          'no-template-path',
        );
      }
      const added = host.addContact({
        kind: 'npc',
        templatePath: tplPath,
        label,
        source: 'self',
        addedAt: now,
      });
      const name = target.getPresentation();
      ContactsControllerBase.send(
        context,
        added
          ? Mml.compose`\nAdded ${name} to your ${label} list.\n`
          : Mml.compose`\n${name} is already in your ${label} list.\n`,
      );
      return;
    }

    // Avatar entry path. Default = sibling expansion across the target's
    // User. `--char` opts out to the single resolved Avatar.
    const addedNames: string[] = [];
    const dupeNames: string[] = [];
    if (model.char) {
      const playerId = target.getPlayerId();
      const ok = host.addContact({
        kind: 'avatar',
        playerId,
        label,
        source: 'self',
        addedAt: now,
      });
      (ok ? addedNames : dupeNames).push(target.getPresentation());
    } else {
      const user = target.getUser();
      const playerIds = user?.playerIds ?? [target.getPlayerId()];
      const names = await ContactsControllerBase.avatarNames(playerIds);
      for (const playerId of playerIds) {
        const ok = host.addContact({
          kind: 'avatar',
          playerId,
          label,
          source: 'self',
          addedAt: now,
        });
        const name = names.get(playerId) ?? playerId;
        (ok ? addedNames : dupeNames).push(name);
      }
    }

    const lines: string[] = [];
    if (addedNames.length > 0) {
      lines.push(`Added ${GrammarApi.joinList(addedNames)} to your ${label} list.`);
    }
    if (dupeNames.length > 0) {
      lines.push(`Already in ${label}: ${GrammarApi.joinList(dupeNames)}.`);
    }
    if (lines.length === 0) lines.push('No changes.');
    ContactsControllerBase.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}

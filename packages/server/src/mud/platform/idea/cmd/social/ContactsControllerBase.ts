/**
 * ContactsControllerBase — what the `contacts` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the player surface for the per-Avatar personal-lists
 * substrate. `list` (and bare `contacts`) is `ContactsListController`;
 * `add`, `remove`, `show`, `clear` and `rename` are
 * `ContactsAddController`, `ContactsRemoveController`,
 * `ContactsShowController`, `ContactsClearController` and
 * `ContactsRenameController`.
 *
 * v1 limitations:
 *   - `add` only resolves online targets. Offline targeting requires the
 *     per-Avatar encounter-memory mechanism documented in the build
 *     plan's "Offline contacts targeting — deferred" section.
 *   - Owner-only read. Non-owner reads return empty/refusal — handled
 *     at the GroupProvider boundary, not here.
 *
 * Holds the host narrowing, the label read, the display names an entry
 * goes by, and the shell words.
 *
 * ⭐ A player's name comes from the identity substrate (C73): the live
 * body's presentation, else the name on their last record
 * (`PlayerApi.storedNameOf`) — never a per-player template row, which a
 * minted character does not have (so `show` printed raw player ids, and
 * `remove` by name never matched).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import type { MqlOneResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Contacts } from '../../../../lib/social/Contacts';
import { Template } from '../../../../lib/stuff/Template';
import { PlayerApi } from '../../../../api/player';

export type ContactsHost = Stuff & Contacts;

export interface ContactsModel extends CommandModel {
  /**
   * Two shapes by subcommand:
   *   - `add`: `MqlOneResult` (target Avatar / NPC resolved via MQL)
   *   - `remove`: `string` (a name, or the raw playerId or templatePath)
   */
  target?: MqlOneResult | string;
  label?: string;
  char?: boolean;
  old_label?: string;
  new_label?: string;
}

export abstract class ContactsControllerBase extends CommandController<ContactsModel> {
  /** The giver's contacts list; null (and refused) when it keeps none. */
  protected static hostOf(context: CommandContext): ContactsHost | null {
    const giver = context.commandGiver;
    if (!MixinApi.isContacts(giver)) {
      ContactsControllerBase.fail(context, 'You have no contacts list.', 'mixin-missing');
      return null;
    }
    return giver;
  }

  /** The `label` arg, trimmed; null (and refused) when blank. */
  protected static labelOf(
    model: ContactsModel,
    context: CommandContext,
  ): string | null {
    const label = (model.label ?? '').trim();
    if (!label) {
      ContactsControllerBase.fail(context, 'label required', 'label-required');
      return null;
    }
    return label;
  }

  /**
   * Display names for a batch of playerIds, off the identity substrate:
   * the live body's presentation, else the stored name. An id with
   * neither is absent from the map (the caller falls back to the id).
   */
  protected static async avatarNames(
    playerIds: readonly string[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    await Promise.all(
      [...new Set(playerIds)].map(async (playerId) => {
        const live = PlayerApi.findAvatarByPlayerId(playerId);
        const name = live
          ? live.getPresentation()
          : await PlayerApi.storedNameOf(playerId);
        if (name) out.set(playerId, name);
      }),
    );
    return out;
  }

  /**
   * Display names for NPC entries, off their rows. Goes through
   * `Template.findByPaths` (the Document Api surface for abstract-Template
   * bulk lookup) — never touches the persistence chokepoint directly.
   */
  protected static async templateNames(
    paths: readonly string[],
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (paths.length === 0) return out;
    const templates = await Template.findByPaths(paths);
    for (const tpl of templates) {
      const data = tpl.data as { name?: unknown } | undefined;
      const name = typeof data?.name === 'string' ? data.name : undefined;
      out.set(tpl.path, name ?? tpl.path);
    }
    return out;
  }

  protected static fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    ContactsControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected static send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}

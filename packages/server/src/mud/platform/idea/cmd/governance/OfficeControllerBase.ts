/**
 * OfficeControllerBase — what the `office` subcommands share: the
 * government-office surface (the `governance` command category), one
 * controller per subcommand:
 *
 *   - `assign <player> <office>` — hand a seat to a player (founder-only;
 *     `OfficeAssignController`).
 *   - `vacate <office>` — revert a seat to the founder (founder-only;
 *     `OfficeVacateController`).
 *   - `list` / bare `office` — the public roster (`OfficeListController`).
 *
 * Authorization: the roster is public, so the verb is afforded
 * universally with no verb-level authority validator. The mutating
 * `assign`/`vacate` subcommands carry the `requiresFoundingAuthority`
 * **subcommand-level** validator — the single meta-level governance-root
 * gate (the founder's pool-of-one power to constitute the government,
 * Art. XI), distinct from per-feature role checks: normal in-world
 * authority flows through offices (the `reserve` → `requiresGovernor`
 * pattern). The validator's acting principal is derived from execution
 * context (framework-stamped `context.commandGiver`), never
 * caller-supplied. By the time `execute` runs the giver is already
 * authorized — the controller re-derives no authority, and only the
 * resolved appointee playerId is ever passed onward.
 *
 * Holds the words every subcommand speaks and the holder presentation
 * `assign` and `list` share.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { PlayerApi } from '../../../../api/player';

const TOPIC = 'shell.result';

export interface OfficeModel extends CommandModel {
  /** `assign`: the resolved target Avatar (MQL `scope: online`). */
  target?: MqlOneResult | string;
  /** `assign`/`vacate`: the office key or display name. */
  office?: string;
}

export abstract class OfficeControllerBase extends CommandController<OfficeModel> {
  /** Present a holder by their body if they are here, else the name on their record. */
  protected async presentHolder(playerId: string): Promise<string> {
    if (!playerId) return '(vacant)';
    const avatar = PlayerApi.findAvatarByPlayerId(playerId);
    if (avatar) return avatar.getPresentation();
    return (await PlayerApi.storedNameOf(playerId)) ?? 'somebody no longer on the rolls';
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

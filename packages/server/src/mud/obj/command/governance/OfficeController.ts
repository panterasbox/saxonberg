/**
 * OfficeController — the `office` / `offices` verb, the government-office
 * surface (the new `governance` command category). Subcommands:
 *
 *   - `assign <player> <office>` — hand a seat to a player (founder-only).
 *   - `vacate <office>` — revert a seat to the founder (founder-only).
 *   - `list` / bare `office` / bare `offices` — the public roster.
 *
 * Authorization: the roster is public, so the verb is afforded
 * universally with no verb-level authority validator. The mutating
 * `assign`/`vacate` subcommands enforce the **founder** gate *inside* the
 * controller (the `GroupController` per-subcommand owner-check precedent —
 * the command schema scopes `validators` to the verb level, and a
 * verb-level gate would wrongly block the public roster). The acting
 * principal is derived from execution context (`context.commandGiver`),
 * never caller-supplied — `OfficeApi.isFounder(giver)` (the
 * `gated-api-actor-from-context` rule). Only the resolved appointee
 * playerId is ever passed onward.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { OfficeApi } from '../../../api/office';
import { PlayerApi } from '../../../api/player';
import { Office } from '../../../lib/governance/Office';

const TOPIC = 'system.governance';

interface OfficeModel extends CommandModel {
  /** `assign`: the resolved target Avatar (MQL `scope: online`). */
  target?: MqlOneResult | string;
  /** `assign`/`vacate`: the office key or display name. */
  office?: string;
}

export default class OfficeController extends CommandController<OfficeModel> {
  async execute(model: OfficeModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand ?? 'list';
    switch (sub) {
      case 'assign':
        return this.executeAssign(model, context);
      case 'vacate':
        return this.executeVacate(model, context);
      case 'list':
        return this.executeList(context);
      default:
        return this.fail(
          context,
          `Unknown office subcommand: ${sub}`,
          'unknown-subcommand',
        );
    }
  }

  private async executeAssign(
    model: OfficeModel,
    context: CommandContext,
  ): Promise<void> {
    if (!(await OfficeApi.isFounder(context.commandGiver))) {
      return this.fail(
        context,
        'Only the founder may hand off offices.',
        'not-founder',
      );
    }
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const target = resolved?.stuff ?? null;
    if (!target) {
      return this.fail(context, 'No such player.', 'no-target');
    }
    if (!PlayerApi.isAvatarStuff(target)) {
      return this.fail(context, 'Targets must be players.', 'avatar-required');
    }
    const playerId = target.getPlayerId();
    if (!playerId) {
      return this.fail(
        context,
        'That player has no durable identity to seat.',
        'no-player-id',
      );
    }
    const office = Office.byKey((model.office ?? '').trim());
    if (!office) {
      return this.fail(
        context,
        `No such office: ${model.office ?? '(none)'}.`,
        'unknown-office',
      );
    }

    const result = await OfficeApi.assign(playerId, office.getKey());
    if (!result.ok) {
      return this.fail(
        context,
        `No such office: ${model.office ?? '(none)'}.`,
        'unknown-office',
      );
    }
    if (!result.changed) {
      return this.fail(
        context,
        `${target.getPresentation()} already holds ${office.getDisplayName()}.`,
        'no-change',
      );
    }

    const priorNote = result.priorHolderId
      ? `, replacing ${this.presentHolder(result.priorHolderId)}`
      : ', replacing the founder';
    this.send(
      context,
      Mml.compose`\nSeated ${target.getPresentation()} as ${office.getDisplayName()}${priorNote}.\n`,
    );
  }

  private async executeVacate(
    model: OfficeModel,
    context: CommandContext,
  ): Promise<void> {
    if (!(await OfficeApi.isFounder(context.commandGiver))) {
      return this.fail(
        context,
        'Only the founder may vacate offices.',
        'not-founder',
      );
    }
    const office = Office.byKey((model.office ?? '').trim());
    if (!office) {
      return this.fail(
        context,
        `No such office: ${model.office ?? '(none)'}.`,
        'unknown-office',
      );
    }
    const changed = await OfficeApi.vacate(office.getKey());
    if (!changed) {
      return this.fail(
        context,
        `${office.getDisplayName()} is already held by the founder.`,
        'no-change',
      );
    }
    this.send(
      context,
      Mml.compose`\nVacated ${office.getDisplayName()}; it reverts to the founder.\n`,
    );
  }

  private async executeList(context: CommandContext): Promise<void> {
    const roster = await OfficeApi.roster();
    const lines = ['Government offices:'];
    for (const row of roster) {
      const holder = row.isFounderDefault
        ? `${row.founderLabel} (founder)`
        : this.presentHolder(row.holderPlayerId ?? '');
      lines.push(
        `  ${row.displayName}  [${row.branch}/${row.origin}]  — ${holder}`,
      );
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  /** Present a holder by their online Avatar, else the raw playerId. */
  private presentHolder(playerId: string): string {
    if (!playerId) return '(vacant)';
    const avatar = PlayerApi.findAvatarByPlayerId(playerId);
    return avatar ? avatar.getPresentation() : playerId;
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

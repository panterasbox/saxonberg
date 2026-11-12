/**
 * OfficeAssignController — `office assign <player> <office>` — hand a
 * seat to a player (founder-only: the `requiresFoundingAuthority`
 * subcommand validator) (over {@link OfficeControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import { CompactApi } from '../../../../api/compact';
import { PlayerApi } from '../../../../api/player';
import { Office } from '../../../../lib/governance/Office';
import { OfficeControllerBase, type OfficeModel } from './OfficeControllerBase';

export default class OfficeAssignController extends OfficeControllerBase {
  async execute(model: OfficeModel, context: CommandContext): Promise<void> {
    // Authority is the `requiresFoundingAuthority` subcommand validator's
    // job (the dispatcher rejects non-founders before `execute` runs).
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

    const result = await CompactApi.assignOffice(playerId, office.getKey());
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
      ? `, replacing ${await this.presentHolder(result.priorHolderId)}`
      : ', replacing the founder';
    this.send(
      context,
      Mml.compose`\nSeated ${target.getPresentation()} as ${office.getDisplayName()}${priorNote}.\n`,
    );
  }
}

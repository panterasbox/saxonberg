/**
 * WizardController — the `wizard grant/revoke <player>` verb, the
 * wizard-conferral surface (wizard-authority Phase 5). Toggles a target
 * player's membership in the `'wizards'` group via the narrow-entry
 * `AccessApi.setWizardMembership`, which is gated `FromController` to
 * this controller (the `forceDestruct`/`DestructController` precedent).
 *
 * Authorization is declarative — see wizard.yaml's
 * `validators: requiresArchwizard`. The dispatcher rejects the command
 * before this controller runs when the giver isn't an archwizard, so
 * the controller re-derives no caller-supplied authority; it only maps
 * the resolved target to a playerId and dispatches the mutation.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { AccessApi } from '../../../../api/access';
import { PlayerApi } from '../../../../api/player';

interface WizardModel extends CommandModel {
  /** The resolved target Avatar (MQL `scope: online`). */
  target?: MqlOneResult | string;
}

export default class WizardController extends CommandController<WizardModel> {
  async execute(model: WizardModel, context: CommandContext): Promise<void> {
    const sub = model.subcommand;
    if (sub !== 'grant' && sub !== 'revoke') {
      return this.fail(
        context,
        `Unknown wizard subcommand: ${sub ?? '(none)'}`,
        'unknown-subcommand',
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
        'That player has no durable identity to grant.',
        'no-player-id',
      );
    }

    const changed = await AccessApi.setWizardMembership(
      playerId,
      sub === 'grant',
    );

    if (!changed) {
      return this.fail(
        context,
        sub === 'grant'
          ? `${target.getPresentation()} is already a wizard.`
          : `${target.getPresentation()} is not a wizard.`,
        'no-change',
      );
    }

    this.send(
      context,
      sub === 'grant'
        ? Mml.compose`\nConferred wizard status on ${target.getPresentation()}.\n`
        : Mml.compose`\nRevoked wizard status from ${target.getPresentation()}.\n`,
    );
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.error')
      .toSelf(body)
      .send();
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

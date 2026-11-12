/**
 * WizardControllerBase — what `wizard grant` and `wizard revoke` share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the wizard-conferral surface (wizard-authority Phase
 * 5). Each toggles a target player's membership in the `'wizards'` group
 * via the narrow-entry `AccessApi.setWizardMembership`, which is gated
 * `FromModule` to `WizardGrantController` and `WizardRevokeController`
 * (the `forceDestruct`/`DestructController` precedent).
 *
 * Authorization is declarative — see wizard.yaml's archwizard validator.
 * The dispatcher rejects the command before a controller runs when the
 * giver isn't an archwizard, so the controllers re-derive no
 * caller-supplied authority; they only map the resolved target to a
 * playerId and dispatch the mutation. The base holds that one act and
 * its words — never the permission.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { AccessApi } from '../../../../api/access';
import { PlayerApi } from '../../../../api/player';

export interface WizardModel extends CommandModel {
  /** The resolved target Avatar (MQL `scope: online`). */
  target?: MqlOneResult | string;
}

export abstract class WizardControllerBase extends CommandController<WizardModel> {
  /**
   * Grant (`makeWizard = true`) or revoke wizard status on the bound
   * target. ⚠ Called on `this` so the gate on `setWizardMembership`
   * sees the subcommand's own controller as the caller.
   */
  protected async confer(
    model: WizardModel,
    context: CommandContext,
    makeWizard: boolean,
  ): Promise<void> {
    const resolved =
      model.target && typeof model.target === 'object'
        ? (model.target as MqlOneResult)
        : null;
    const target = resolved?.stuff ?? null;
    if (!target) {
      return WizardControllerBase.fail(context, 'No such player.', 'no-target');
    }
    if (!PlayerApi.isAvatarStuff(target)) {
      return WizardControllerBase.fail(
        context,
        'Targets must be players.',
        'avatar-required',
      );
    }
    const playerId = target.getPlayerId();
    if (!playerId) {
      return WizardControllerBase.fail(
        context,
        'That player has no durable identity to grant.',
        'no-player-id',
      );
    }

    const changed = await AccessApi.setWizardMembership(playerId, makeWizard);

    if (!changed) {
      return WizardControllerBase.fail(
        context,
        makeWizard
          ? `${target.getPresentation()} is already a wizard.`
          : `${target.getPresentation()} is not a wizard.`,
        'no-change',
      );
    }

    WizardControllerBase.send(
      context,
      makeWizard
        ? Mml.compose`\nConferred wizard status on ${target.getPresentation()}.\n`
        : Mml.compose`\nRevoked wizard status from ${target.getPresentation()}.\n`,
      'shell.result',
    );
  }

  protected static send(
    context: CommandContext,
    body: Mml,
    topic: string = 'shell.error',
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(topic)
      .toSelf(body)
      .send();
  }

  protected static fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    WizardControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}

/**
 * ClockController — `clock on` / `clock off`.
 *
 * ⭐⭐ **A shift is something you choose to start** (trades-and-labor
 * D15). Holding a job puts you on the chart; it does not put you on the
 * clock. The alternative was to write an applicant a roster slot with
 * the seat's authored hours — paid for the window, present or not —
 * which is a wage for existing, and lens 6 names that a failure.
 *
 * It is also the recorded lean: `livelihood-slate` §5.4, *"[LEAN] Shift
 * model — voluntary clock-in, employer-bounded; rigid schedules are
 * hostile to real humans."*
 *
 * ⚠ A rostered NPC is untouched — the roster tick still governs it. This
 * governs a holder the tick has no assignment for, which is exactly what
 * an applicant is.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { EmploymentApi } from '../../../../api/employment';
import { BankingApi, Money } from '../../../../api/banking';
import type { ClockResult } from '../../../../lib/employment/Employed';

const TOPIC = 'act.deed';

interface ClockModel extends CommandModel {
  organization?: string;
}

export default class ClockController extends CommandController<ClockModel> {
  async execute(model: ClockModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sub = model.subcommand ?? '';
    if (sub !== 'on' && sub !== 'off') {
      return this.fail(
        context,
        'Usage: `clock on` to start a shift, `clock off` to end it.',
        'unknown-subcommand',
      );
    }
    if (!MixinApi.isEmployed(giver)) {
      return this.fail(context, "You don't hold a job anywhere.", 'not-employed-here');
    }
    const where = (model.organization ?? '').trim();
    const result =
      sub === 'on' ? await giver.clockOn(where) : await giver.clockOff(where);
    if (!result.ok) {
      return this.fail(context, ClockController.refusal(result, sub), result.reason);
    }

    const house = StuffApi.findByTemplatePath(result.organizationPath);
    const name = house && MixinApi.isOrganization(house)
      ? EmploymentApi.organizationLabel(house)
      : result.organizationPath;
    if (sub === 'on') {
      const seat =
        house && MixinApi.isOrganization(house)
          ? house.getPosition(result.positionKey)
          : undefined;
      // ⭐ Say what the shift GRANTS, or a player has no way to learn it:
      // on shift in a `fulfills` seat, an `order` here is served by them.
      const grant = seat?.fulfills
        ? " You're the one an order here is served by now."
        : '';
      const rate = seat?.wageRate
        ? ` ${Money.of(seat.wageRate, BankingApi.compactCurrency()).render()} a game-hour.`
        : '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You clock on at ${name}.${rate}${grant}`)
        .toPeers(Mml.compose`${Mml.actor(giver)} starts a shift.`)
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You clock off at ${name}. The wage settles to your account — \`bank\` reads it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} finishes a shift.`)
      .send();
  }

  /** Every refusal names something the player can go and change. */
  private static refusal(
    result: Exclude<ClockResult, { ok: true }>,
    sub: 'on' | 'off',
  ): string {
    switch (result.reason) {
      case 'not-employed-here':
        return "You don't hold a job there.";
      case 'not-on-premises':
        return result.houses && result.houses.length > 0
          ? `You'd have to be where they work. You hold a job at ${result.houses.join(', ')}.`
          : "You'd have to be somewhere they work.";
      case 'ambiguous-house':
        return `Clock ${sub} at which? ${(result.houses ?? []).join(', ')}.`;
      case 'already-on-shift':
        return "You're already on shift.";
      case 'not-on-shift':
        return "You're not on shift.";
      default:
        return `You can't clock ${sub} here.`;
    }
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${line}`)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}

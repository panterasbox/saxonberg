/**
 * TipController — `tip <amount> [--eft]`.
 *
 * Two routes, never the bar's books. **Cash** (default): drop coin in the
 * tip jar — off every ledger (anonymous, the under-the-counter take), the
 * on-shift bartender collects it later. **EFT** (`--eft`, or the automatic
 * fallback when the patron is short of coin): a direct transfer to the
 * on-shift server's account — recorded income on the *server's* ledger, but
 * the bar's account is untouched (never the bar's P&L). The patron is never
 * blocked from tipping; the cash/EFT choice is the anonymous-vs-recorded
 * story. See docs/subsystems/employment.md § Tips.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { BankingApi, Money } from '../../../../api/banking';
import type { Charge } from '../../../../api/banking';
import { EmploymentApi } from '../../../../api/employment';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import TipJar from '../../../thing/TipJar';
import { Currency } from "../../../../lib/banking/Currency";

const TOPIC = 'act.deed';

interface TipModel extends CommandModel {
  amount: string;
  eft?: boolean;
}

export default class TipController extends CommandController<TipModel> {
  async execute(model: TipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Tip how much? Name a whole amount.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'bad-amount',
        detail: model.amount,
      });
      return;
    }

    const jar = TipJar.resolveIn(context);

    // Cash route (default): drop coin in the jar — off the books.
    if (!model.eft && jar) {
      const charge: Charge = {
        amount: Money.of(minor, Currency.compact()),
        reason: 'a tip',
        presented: false,
        payeeAccountId: '',
        payeeContainer: jar,
      };
      try {
        await BankingApi.settle(charge, { kind: 'cash' });
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You drop ${Money.of(minor, Currency.compact()).render()} into the tip jar.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} drops a tip in the jar.`)
          .send();
        return;
      } catch {
        // Short of coin — fall through to the EFT tip (the auto-fallback).
      }
    }

    // EFT route: transfer to the on-shift server's account directly — the
    // "credit-card-receipt" tip. Recorded on the *server's* ledger; the
    // bar's account is never touched.
    const recipient = EmploymentApi.tipRecipientFor(giver);
    if (!recipient) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one on shift to tip right now.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-recipient',
        detail: model.amount,
      });
      return;
    }
    const recipientKey = recipient.getTemplatePath();
    const recipientAccount = recipientKey
      ? await BankingApi.primaryAccountIdOf(recipientKey)
      : null;
    if (!recipientAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(recipient)} has no account to tip into.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'recipient-no-account',
        detail: model.amount,
      });
      return;
    }
    const patronKey = giver.getTemplatePath();
    const patronAccount = patronKey
      ? await BankingApi.primaryAccountIdOf(patronKey)
      : null;
    if (!patronAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You've no account to tip from — try cash.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-account',
        detail: model.amount,
      });
      return;
    }
    try {
      await BankingApi.transfer(
        patronAccount,
        recipientAccount,
        Money.of(minor, Currency.compact()),
        'a tip',
      );
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You tip ${Money.of(minor, Currency.compact()).render()} to ${Mml.actor(recipient)}.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} tips ${Mml.actor(recipient)}.`)
        .send();
    } catch (err) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'tip-refused',
        detail: model.amount,
      });
    }
  }
}

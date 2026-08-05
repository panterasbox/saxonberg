/**
 * BankController — the `bank` verb: dispatch-on-subcommand over the player's
 * branch operations. Bare `bank` reads your balance; the subcommands are
 * `open`, `deposit <coins>`, `withdraw <amount>`, `transfer <amount> to
 * <who>`, `balance`, `statement [count]`. One controller, one verb — the
 * `ChatController`/subcommand precedent, not a verb-per-action.
 *
 * Accounts resolve by identity + branch context (no number typed); the actor
 * is the context-derived author throughout.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { Currency, BankingApi, Money } from "../../../api/banking";
import { CorpoApi } from "../../../api/corpo";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Bank } from "../../../lib/banking/Bank";

const TOPIC = "world.narration.action";

/** Default / max rows a `bank statement` lists (most recent first). */
const DEFAULT_STATEMENT_ROWS = 20;
const MAX_STATEMENT_ROWS = 100;

interface BankModel extends CommandModel {
  coins?: MqlOneResult;
  amount?: string;
  recipient?: MqlOneResult;
  count?: string;
}

export default class BankController extends BankingControllerBase<BankModel> {
  async execute(model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-bank-here", detail: "bank" });
      return;
    }
    switch (model.subcommand) {
      case "open":
        return this.open(bank, context);
      case "deposit":
        return this.deposit(bank, model, context);
      case "withdraw":
        return this.withdraw(bank, model, context);
      case "transfer":
        return this.transfer(bank, model, context);
      case "statement":
        return this.statement(bank, model, context);
      // bare `bank` and `bank balance` both read the balance
      case undefined:
      case "balance":
        return this.balance(bank, context);
      default:
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Unknown bank action: ${model.subcommand}.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand });
    }
  }

  private async open(bank: Stuff & Bank, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    await BankingApi.openAccount(bank.getBank(), bank.getCorpoKey());
    const corpo = CorpoApi.getCorpo(bank.getCorpoKey());
    const house = corpo ? corpo.label : "the bank";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open an account with ${house}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} opens an account.`)
      .send();
  }

  private async balance(bank: Stuff & Bank, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const accountId = await BankingApi.myAccountAt(bank.getBank());
    if (!accountId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`bank open\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: "balance" });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your balance is ${BankingApi.balanceOf(accountId).render()}.`)
      .send();
  }

  /**
   * `bank statement [count]` — the account's recent ledger as a running
   * statement. Read-only over the same account `balance` resolves; the
   * ledger is scanned newest-first, each line carrying the running balance
   * after it. The running balance is accumulated over the *full* history
   * (oldest→newest) so the shown window's balances are true, then the most
   * recent `count` rows (default 20, capped 100) are rendered newest-first.
   */
  private async statement(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const accountId = await BankingApi.myAccountAt(bank.getBank());
    if (!accountId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`bank open\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: "statement" });
      return;
    }
    const rows = await BankingApi.entriesFor(accountId);
    if (rows.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No activity on your account here yet.`)
        .send();
      return;
    }
    // Oldest → newest so the running balance accumulates in order (wall clock
    // primary, game clock as the tiebreak).
    const ordered = [...rows].sort(
      (a, b) => (a.realAt || 0) - (b.realAt || 0) || (a.at || 0) - (b.at || 0)
    );
    let running = 0;
    const annotated = ordered.map((r) => {
      const delta = r.toAccount === accountId ? r.amount : -r.amount;
      running += delta;
      return { r, delta, running };
    });
    const requested = Number(model.count);
    const limit =
      Number.isInteger(requested) && requested > 0
        ? Math.min(requested, MAX_STATEMENT_ROWS)
        : DEFAULT_STATEMENT_ROWS;
    const shown = annotated.slice(-limit).reverse();
    const lines = shown
      .map(({ r, delta, running: bal }) => {
        const sign = delta >= 0 ? "+" : "";
        const label = r.memo || r.kind;
        return `  ${sign}${Money.of(delta, Currency.compact()).render()}  ${label}  (balance ${Money.of(bal, Currency.compact()).render()})`;
      })
      .join("\n");
    const heading =
      annotated.length > shown.length
        ? `Statement (most recent ${shown.length} of ${annotated.length}):`
        : `Statement:`;
    const body =
      `${heading}\n${lines}\n` +
      `  Current balance: ${BankingApi.balanceOf(accountId).render()}`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }

  private async deposit(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const coins = model.coins?.stuff;
    if (!coins || !MixinApi.isGlobbable(coins)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have any '${model.coins?.raw ?? ""}' to deposit.`)
        .send();
      context.note({ kind: "empty-result", field: "coins", query: model.coins?.raw ?? "" });
      return;
    }
    try {
      await BankingApi.deposit(bank, coins);
    } catch (err) {
      return this.declineScene(context, "deposit-failed", err, "coins");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You deposit ${Mml.item(coins)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} makes a deposit.`)
      .send();
  }

  private async withdraw(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.badAmount(context, model.amount);
    }
    try {
      await BankingApi.withdraw(bank, Money.of(minor, Currency.compact()));
    } catch (err) {
      return this.declineScene(context, "withdraw-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You withdraw ${Money.of(minor, Currency.compact()).render()} in cash.`)
      .toPeers(Mml.compose`${Mml.name(giver)} makes a withdrawal.`)
      .send();
  }

  private async transfer(
    bank: Stuff & Bank,
    model: BankModel,
    context: CommandContext
  ): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      return this.badAmount(context, model.amount);
    }
    const payee = model.recipient?.stuff;
    const payeeKey = payee?.getTemplatePath() ?? null;
    if (!payeeKey) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one called '${model.recipient?.raw ?? ""}' to pay.`)
        .send();
      context.note({ kind: "empty-result", field: "recipient", query: model.recipient?.raw ?? "" });
      return;
    }
    const fromAccount = await BankingApi.myAccountAt(bank.getBank());
    const toAccount = await BankingApi.primaryAccountIdOf(payeeKey);
    if (!fromAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have an account here. Try \`bank open\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: "transfer" });
      return;
    }
    if (!toAccount) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.name(payee!)} has no account to receive into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "payee-no-account", detail: model.recipient?.raw ?? "" });
      return;
    }
    try {
      await BankingApi.transfer(fromAccount, toAccount, Money.of(minor, Currency.compact()));
    } catch (err) {
      return this.declineScene(context, "transfer-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You transfer ${Money.of(minor, Currency.compact()).render()} to ${Mml.name(payee!)}.`)
      .send();
  }

  private badAmount(context: CommandContext, raw: string | undefined): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Name a whole amount.`)
      .send();
    context.note({ kind: "controller-rejected", reason: "bad-amount", detail: raw ?? "" });
  }

  private declineScene(
    context: CommandContext,
    reason: string,
    err: unknown,
    field?: string
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: field ?? "" });
  }
}

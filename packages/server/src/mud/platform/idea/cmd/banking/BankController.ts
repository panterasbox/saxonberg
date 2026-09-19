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
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { CorpoApi } from "../../../../api/corpo";
import { MessageApi } from "../../../../api/message";
import { ContractApi } from "../../../../api/contract";
import { EmploymentApi } from "../../../../api/employment";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

const TOPIC = "act.deed";

/** Default / max rows a `bank statement` lists (most recent first). */
const DEFAULT_STATEMENT_ROWS = 20;
const MAX_STATEMENT_ROWS = 100;

interface BankModel extends CommandModel {
  coins?: MqlOneResult;
  amount?: string;
  recipient?: MqlOneResult;
  count?: string;
  for?: string;
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
      case "borrow":
        return this.borrow(bank, model, context);
      case "book":
        return this.book(bank, context);
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

  /**
   * `bank borrow <amount> [--for stock|wages]` — the ladder's rungs 1 and 2
   * (economic bootstrap D12). The borrower is the house the giver keeps;
   * the lender is this counter's bank. Every gate is a read of the house's
   * own ledger, and a refusal names the number. `finance` is credited
   * either way: the refusal is the lesson.
   */
  private async borrow(bank: Stuff & Bank, model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Borrow how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    const purpose = (model.for ?? "stock").toLowerCase();
    if (purpose !== "stock" && purpose !== "wages") {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`A loan is for \`stock\` or for \`wages\`.`).send();
      context.note({ kind: "controller-rejected", reason: "bad-purpose", detail: purpose });
      return;
    }
    const house = await this.resolveHouse(context);
    if (!house) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You keep no house to borrow for.`).send();
      context.note({ kind: "controller-rejected", reason: "not-staff", detail: "borrow" });
      return;
    }
    const result = await ContractApi.issueLoan({
      borrower: house,
      counter: bank,
      principalMinor: minor,
      rung: purpose === "wages" ? 2 : 1,
    });
    this.creditFinance(giver);
    if (!result.ok) {
      const why =
        result.reason === "ladder-gate"
          ? `${bank.getBank()} refuses: ${result.detail}.`
          : result.reason === "no-lending-terms"
            ? `${bank.getBank()} posts no loan rate — it does not lend.`
            : result.reason === "not-chartered"
              ? `${bank.getBank()} holds no bank charter — it may not lend.`
              : result.reason === "lender-short"
                ? `${bank.getBank()} cannot fund it: ${result.detail}.`
                : result.reason === "no-security"
                  ? `Nothing to pledge — ${result.detail}.`
                  : `The bank refuses (${result.reason}).`;
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${why}`).send();
      context.note({ kind: "controller-rejected", reason: result.reason, detail: result.detail });
      return;
    }
    const money = Money.of(result.advanced, BankingApi.compactCurrency());
    const terms = bank.getTerms();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        purpose === "wages"
          ? Mml.compose`${bank.getBank()} advances ${money.render()} of working capital to the house at ${terms.describeLoanRate()}, repaid as ${terms.describeRepaymentShare() || "the reserve's minimum share"}. The paper is filed in the house's papers.`
          : Mml.compose`${bank.getBank()} advances ${money.render()} against the goods on your counter at ${terms.describeLoanRate()}, repaid as ${terms.describeRepaymentShare() || "the reserve's minimum share"} until it clears — no due date. The lien stands until then; the paper is filed in the house's papers.`,
      )
      .send();
  }

  /**
   * `bank book` — the paper at this counter: what the giver's house owes
   * here, and, for the bank's own people, every loan the bank holds
   * (the lien standing or released). Default is revealed on the read.
   */
  private async book(bank: Stuff & Bank, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const counterPath = bank.getTemplatePath() ?? "";
    const lender = counterPath ? await EmploymentApi.ensureOperatorAt(counterPath) : null;
    const lines: string[] = [];
    const house = await this.resolveHouse(context);
    if (house) {
      await ContractApi.reconcileLoans(house.getAccountPath());
      const mine = (await ContractApi.instrumentsOf(house.getAccountPath())).filter((l) => l.role === "owes");
      if (mine.length) {
        lines.push(`${EmploymentApi.organizationLabel(house)} owes:`);
        for (const l of mine) lines.push(`  ${l.words}`);
      }
    }
    if (lender && (lender.employs(giver) || (await lender.hasProprietor(giver)))) {
      await ContractApi.reconcileLoans(null);
      const held = (await ContractApi.instrumentsOf(lender.getTemplatePath() ?? "")).filter((l) => l.role === "holds");
      lines.push(`${EmploymentApi.organizationLabel(lender)} holds:`);
      if (held.length === 0) lines.push("  no paper");
      for (const l of held) lines.push(`  ${l.words}`);
    }
    if (lines.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no paper here with your name on it.`)
        .send();
    } else {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${lines.join("\n")}`).send();
    }
    this.creditFinance(giver);
  }

  private async open(bank: Stuff & Bank, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    await BankingApi.openAccount(
      bank.getBank(),
      bank.getCorpoKey(),
      BankingApi.compactCurrency(),
    );
    const corpo = CorpoApi.getCorpo(bank.getCorpoKey());
    const house = corpo ? corpo.label : "the bank";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open an account with ${house}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} opens an account.`)
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
        return `  ${sign}${Money.of(delta, BankingApi.compactCurrency()).render()}  ${label}  (balance ${Money.of(bal, BankingApi.compactCurrency()).render()})`;
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
    if (!coins || !MixinApi.isStackable(coins)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have any '${model.coins?.raw ?? ""}' to deposit.`)
        .send();
      context.note({ kind: "empty-result", field: "coins", query: model.coins?.raw ?? "" });
      return;
    }
    // ⚠⚠ Read the stack's NAME AS TEXT before banking it. `deposit()`
    // CONSUMES the stack, and `Mml.thing()` holds the Stuff and resolves
    // it at RENDER time — so by the time the scene renders, it is naming
    // a destructed object, its presentation comes back undefined, and
    // MML's `escape()` throws "Cannot read properties of undefined
    // (reading 'replace')". The player saw `controller-error` on a
    // deposit that had ALREADY MOVED THEIR MONEY — the worst shape this
    // failure could take, and there was no other way to bank coin.
    //
    // A plain string is the right carrier here: a clickable ref to a
    // Stuff that no longer exists is worth nothing anyway. Found by
    // driving the world; the unit suite banks without rendering.
    const deposited = coins.getPresentation();
    try {
      await bank.deposit(coins);
    } catch (err) {
      return this.declineScene(context, "deposit-failed", err, "coins");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You deposit ${deposited}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} makes a deposit.`)
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
      await bank.withdraw(Money.of(minor, BankingApi.compactCurrency()));
    } catch (err) {
      return this.declineScene(context, "withdraw-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You withdraw ${Money.of(minor, BankingApi.compactCurrency()).render()} in cash.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} makes a withdrawal.`)
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
    const payeeKey = payee?.getIdentityPath() ?? null;
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
        .toSelf(Mml.compose`${Mml.actor(payee!)} has no account to receive into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "payee-no-account", detail: model.recipient?.raw ?? "" });
      return;
    }
    try {
      await BankingApi.transfer(fromAccount, toAccount, Money.of(minor, BankingApi.compactCurrency()));
    } catch (err) {
      return this.declineScene(context, "transfer-refused", err);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You transfer ${Money.of(minor, BankingApi.compactCurrency()).render()} to ${Mml.actor(payee!)}.`)
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

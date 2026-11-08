/**
 * BankBorrowController — `bank borrow <amount> [--for stock|wages]`: the
 * ladder's rungs 1 and 2 (economic bootstrap D12). The borrower is the
 * house the giver keeps; the lender is this counter's bank. Every gate is
 * a read of the house's own ledger, and a refusal names the number.
 * `finance` is credited either way: the refusal is the lesson.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { ContractApi } from "../../../../api/contract";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankBorrowController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, model: BankModel, context: CommandContext): Promise<void> {
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
}

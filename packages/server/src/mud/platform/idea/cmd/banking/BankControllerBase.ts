/**
 * BankControllerBase — what the `bank` subcommands share
 * (controllers-are-io W8, D9: one controller per subcommand over a base
 * per noun; *a transaction with an institution's book is a subcommand of
 * its noun*). The branch's books are the account's, so `open`,
 * `balance`, `statement`, `deposit`, `withdraw`, `transfer`, `borrow` and
 * `book` are each a controller of their own (`Bank<Sub>Controller`); bare
 * `bank` reads the balance (`BankBalanceController`).
 *
 * Holds the one resolution every subcommand starts from — *the bank here*
 * (the affording counter, else a `BankMixin` host in the room), refused
 * when there is none — and the refusal words they share. Accounts resolve
 * by identity + branch context (no number typed); the actor is the
 * context-derived author throughout.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { BankingApi } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export const TOPIC = "act.deed";

export interface BankModel extends CommandModel {
  /** `deposit`: the coin stack. */
  coins?: MqlOneResult;
  /** `withdraw` / `transfer` / `borrow`: whole minor units, as typed. */
  amount?: string;
  /** `transfer`: who is paid. */
  recipient?: MqlOneResult;
  /** `statement`: how many rows. */
  count?: string;
  /** `borrow --for stock|wages`. */
  for?: string;
}

export abstract class BankControllerBase<
  T extends BankModel = BankModel,
> extends BankingControllerBase<T> {
  async execute(model: T, context: CommandContext): Promise<void> {
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no bank here.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-bank-here", detail: "bank" });
      return;
    }
    return this.atBank(bank, model, context);
  }

  /** The subcommand's act, at the bank the giver stands at. */
  protected abstract atBank(
    bank: Stuff & Bank,
    model: T,
    context: CommandContext,
  ): Promise<void>;

  /** The giver's account at this bank, or the `no-account` refusal. */
  protected async accountHere(
    bank: Stuff & Bank,
    context: CommandContext,
    sub: string,
  ): Promise<string | null> {
    const accountId = await BankingApi.myAccountAt(bank.getBank());
    if (accountId) return accountId;
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You don't have an account here. Try \`bank open\`.`)
      .send();
    context.note({ kind: "controller-rejected", reason: "no-account", detail: sub });
    return null;
  }

  protected badAmount(context: CommandContext, raw: string | undefined): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Name a whole amount.`)
      .send();
    context.note({ kind: "controller-rejected", reason: "bad-amount", detail: raw ?? "" });
  }

  /** A refusal the banking logic threw, said and noted. */
  protected declineScene(
    context: CommandContext,
    reason: string,
    err: unknown,
    field?: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${String(err instanceof Error ? err.message : err)}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: field ?? "" });
  }
}

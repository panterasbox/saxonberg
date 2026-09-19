/**
 * TreasuryController — the `treasury` verb (gated on the Minister of
 * Finance's office): the Treasury's book, and appropriation (economic
 * bootstrap D9).
 *
 * The Treasury is the state's one account, `/compact/treasury`'s at the
 * Central Bank. The perpetual lands in it by rule; the demo tax
 * accumulates in it; and everything fiscal is SPENT from it — the Arrival
 * Note's principal, a business's opening advance, and what the Minister
 * appropriates here. `treasury appropriate <amount> to <target>` is the
 * Minister's act and it names its destination; the supply does not move
 * when the Treasury spends, and the floor refuses a spend the account
 * cannot cover. Nothing here mints: `reserve mint` used to fuse *create
 * money* with *give it to whoever I am standing next to*, and it is gone.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

interface TreasuryModel extends CommandModel {
  amount?: string;
  to?: string;
  target?: string;
}

export default class TreasuryController extends BankingControllerBase<TreasuryModel> {
  async execute(model: TreasuryModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case undefined:
      case "":
        return this.book(context);
      case "appropriate":
        return this.appropriate(model, context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`treasury\` or \`treasury appropriate <amount> to <target>\`.`)
          .send();
        context.note({ kind: "controller-rejected", reason: "unknown-subcommand", detail: model.subcommand ?? "" });
    }
  }

  /** The book: per currency — the balance, the perpetual held, the advances out, the unclaimed property held. */
  private async book(context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const d = await BankingApi.reserveDashboard(c);
      const amount = (minor: number): string => Money.of(minor, c).render();
      blocks.push(
        `The Treasury (${record.plural})\n` +
          `  holds:                        ${amount(d.treasuryBalance)}\n` +
          `  the perpetual, issued:        ${amount(d.perpetualOutstanding)}`,
      );
    }
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${blocks.join("\n\n")}`)
      .send();
  }

  /** `treasury appropriate <amount> to <target>` — an `appropriation` leg, treasury → the payee's primary. */
  private async appropriate(model: TreasuryModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Appropriate how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    if ((model.to ?? "").toLowerCase() !== "to") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`treasury appropriate <amount> to <target>\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-syntax", detail: model.to ?? "" });
      return;
    }
    const target = TreasuryController.resolvePayee(model.target ?? "");
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No business or member answers to "${model.target ?? ""}".`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-target", detail: model.target ?? "" });
      return;
    }
    const money = Money.of(minor, BankingApi.compactCurrency());
    try {
      await BankingApi.appropriate(target.key, money, `appropriation to ${target.label}`);
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      const short = /holds less than/.test(why);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          short
            ? Mml.compose`The Treasury does not hold ${money.render()}; an appropriation cannot go below the floor.`
            : Mml.compose`${target.label} has no account to receive into.`,
        )
        .send();
      context.note({
        kind: "controller-rejected",
        reason: short ? "insufficient-funds" : "no-account",
        detail: target.key,
      });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The Treasury appropriates ${money.render()} to ${target.label}. The supply is unchanged.`)
      .send();
  }
}

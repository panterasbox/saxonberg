/**
 * TreasuryBookController — bare `treasury` — the Treasury's book (over
 * {@link BankingControllerBase}), gated on the Minister of Finance's
 * office (economic bootstrap D9).
 *
 * The Treasury is the state's one account, `/compact/treasury`'s at the
 * Central Bank. The perpetual lands in it by rule; the demo tax
 * accumulates in it; and everything fiscal is SPENT from it — the Arrival
 * Note's principal, a business's opening advance, and what the Minister
 * appropriates (`TreasuryAppropriateController`). Nothing here mints:
 * `reserve mint` used to fuse *create money* with *give it to whoever I
 * am standing next to*, and it is gone.
 *
 * The book: per currency — the balance, the perpetual held, the advances
 * out, the unclaimed property held.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { ContractApi } from "../../../../api/contract";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

export default class TreasuryBookController extends BankingControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const blocks: string[] = [];
    for (const record of Currency.all()) {
      const c = record.key;
      const d = await BankingApi.reserveDashboard(c);
      const paper = await ContractApi.treasuryPaper(c);
      const amount = (minor: number): string => Money.of(minor, c).render();
      blocks.push(
        `The Treasury (${record.plural})\n` +
          `  holds:                        ${amount(d.treasuryBalance)}\n` +
          `  the perpetual, issued:        ${amount(d.perpetualOutstanding)}\n` +
          `  opening advances outstanding: ${amount(paper.openingAdvancesOwed)}\n` +
          `  arrival notes outstanding:    ${amount(paper.notesOwed)}\n` +
          `  unclaimed property held:      ${amount(paper.unclaimedHeld)}`,
      );
    }
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${blocks.join("\n\n")}`)
      .send();
  }
}

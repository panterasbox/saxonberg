/**
 * BankBookController — `bank book`: the paper at this counter — what the
 * giver's house owes here, and, for the bank's own people, every loan the
 * bank holds (the lien standing or released). Default is revealed on the
 * read.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { ContractApi } from "../../../../api/contract";
import { EmploymentApi } from "../../../../api/employment";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankBookController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, _model: BankModel, context: CommandContext): Promise<void> {
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
}

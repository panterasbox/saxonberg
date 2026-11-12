/**
 * ReserveSetController — `reserve set <row> <value>` — the Governor's
 * dials: the Schedule's `reserve.*` rows and every Tier C key whose seat
 * is the Governor (the capital controls), on the record. Any other key is
 * refused `wrong-seat`, naming who sets it (wizard-axis D11) — the
 * independence clause in code: the seat that spends (the Minister of
 * Finance) cannot tune the rules, and the seat that tunes cannot spend
 * (over {@link BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";

interface ReserveSetModel extends CommandModel {
  row?: string;
  value?: string;
}

export default class ReserveSetController extends BankingControllerBase<ReserveSetModel> {
  async execute(model: ReserveSetModel, context: CommandContext): Promise<void> {
    await this.setSeatDial(context, model.row, model.value, "central-bank-governor");
  }
}

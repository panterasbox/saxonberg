/**
 * TreasurySetController — `treasury set <row> <value>` — the Minister of
 * Finance's dials: taxes, levies, the fisc's grants and advances (Tier
 * C), on the record (wizard-axis D11) (over {@link BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";

interface TreasurySetModel extends CommandModel {
  row?: string;
  value?: string;
}

export default class TreasurySetController extends BankingControllerBase<TreasurySetModel> {
  async execute(model: TreasurySetModel, context: CommandContext): Promise<void> {
    return this.setSeatDial(context, model.row, model.value, "minister-of-finance");
  }
}

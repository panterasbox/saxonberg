/**
 * RackReclaimController — `rack reclaim <thing> [from <rack>]`: take back a weapon you checked at a house's check rack.
 */

import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { RackStuff } from "../../../../lib/retail/HeldGoods";
import { HeldGoodsControllerBase } from "./HeldGoodsControllerBase";

interface RackReclaimModel extends CommandModel {
  /** Bound by the view; addressable, defaulted to what is in reach. */
  rack?: MqlOneResult;
  thing: string;
}

export default class RackReclaimController extends HeldGoodsControllerBase<RackReclaimModel> {
  async execute(model: RackReclaimModel, context: CommandContext): Promise<void> {
    return this.reclaimFrom(
      (model.rack?.stuff ?? null) as RackStuff | null,
      model.thing,
      context,
      { on: "on the rack", off: "off the rack", offPeers: "off the check rack" },
    );
  }
}

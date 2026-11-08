/**
 * ShelfReclaimController — `shelf reclaim <thing> [from <shelf>]`: take back a good you (or the house you act for) consigned that has not sold (the flat `reclaim` until controllers-are-io W7).
 */

import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { ShelfStuff } from "../../../../lib/retail/ConsignmentShelf";
import { HeldGoodsControllerBase } from "./HeldGoodsControllerBase";

interface ShelfReclaimModel extends CommandModel {
  /** Bound by the view; addressable, defaulted to what is in reach. */
  shelf?: MqlOneResult;
  thing: string;
}

export default class ShelfReclaimController extends HeldGoodsControllerBase<ShelfReclaimModel> {
  async execute(model: ShelfReclaimModel, context: CommandContext): Promise<void> {
    return this.reclaimFrom(
      (model.shelf?.stuff ?? null) as ShelfStuff | null,
      model.thing,
      context,
      { on: "on the shelf", off: "off the shelf", offPeers: "off the consignment shelf" },
    );
  }
}

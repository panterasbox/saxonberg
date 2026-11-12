/**
 * HouseShopControllerBase — what `house par`, `house price` and `house
 * stock` share: the three subcommands of the shipped `house` verb that
 * belong to a SHOP, one controller each (`HouseParController`,
 * `HousePriceController`, `HouseStockController`), over the kernel's
 * `HouseControllerBase` (the house a giver keeps, `houseKept`).
 *
 * ⚠ Stanzas on a shipped view, per the instrumentation doctrine — the
 * trade's controllers on the platform's verb, exactly as `house freight`
 * and `house traffic` are trade-haulage's. An install without this pack
 * gets a legible `controller-error` on these three, never a crash.
 *
 * The line: `house book`, `house pnl`, `house payroll` and `house roster`
 * are the KERNEL's — every business has books, a payroll and a chart. A
 * par sheet, an ask and a stock rail are what a SHOPKEEPER keeps, so they
 * ship with the shopkeeper.
 *
 * ⚠ **Gated on the SEAT, never the wizard axis.** Venue authority comes
 * from a position held or the proprietorship (`resolveHouse`, inherited).
 * A thief holding the house tablet gets `house stock` (the sheet is what
 * the screen shows) but not the house's money.
 *
 * Holds the one word `par` and `stock` share: the house app runs on a
 * SCREEN.
 */

import { HouseControllerBase } from '@saxonberg/server/mud/platform/idea/cmd/banking/HouseControllerBase';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Display } from '@saxonberg/server/mud/lib/display/Display';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

export const TOPIC = 'act.deed';

export abstract class HouseShopControllerBase<
  T extends CommandModel = CommandModel,
> extends HouseControllerBase<T> {
  /**
   * The house app runs on a SCREEN: the tablet you hold, one in sight you
   * may drive, or one anywhere by mind. None → `no-display`.
   */
  protected async screen(
    context: CommandContext,
  ): Promise<{ display: Stuff & Display; mode: "hand" | "mind" } | null> {
    const screen = await this.resolveScreen(context.commandGiver);
    if (!screen) {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You'd need a screen for that — the house tablet, or one you can drive.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-display", detail: "house" });
    }
    return screen;
  }
}

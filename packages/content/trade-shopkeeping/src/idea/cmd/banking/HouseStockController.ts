/**
 * HouseStockController — `house stock` — the live sheet as prose **and** the `stock` card: the
 * rows are the perceived bulk holders (MQL, giver-anchored); the par
 * lines ride the prose (over {@link HouseShopControllerBase}).
 *
 * A screen signed in as a principal shows THAT house's sheet — the
 * stock is by the screen's principal (documented posture, display.md).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { StockSheetLine } from '@saxonberg/server/mud/api/employment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CardApi } from '@saxonberg/server/mud/api/card';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { HouseShopControllerBase, TOPIC } from './HouseShopControllerBase';

export default class HouseStockController extends HouseShopControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const screen = await this.resolveScreen(giver);
    // A screen signed in as a principal shows THAT house's sheet to whoever
    // drives it — the thief with the tablet reads it; otherwise the seat's.
    const principal = screen?.display.getPrincipal() ?? "";
    const signedIn = principal ? StuffApi.findByTemplatePath(principal) : null;
    const house =
      signedIn && MixinApi.isBusiness(signedIn) ? signedIn : await this.houseKept(context);
    if (!house) return;
    if (!screen) return void (await this.screen(context));
    const sheet = house.stockSheetFor(giver);
    const body = HouseStockController.renderSheet(house.getPresentation(), sheet);
    const prose = Mml.compose`${body}`;
    if (screen.mode === "mind") {
      // Driving by mind from elsewhere: the screen shows the sheet to
      // whoever stands before it; the driver sees nothing of it.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You put the stock sheet up on ${screen.display.getPresentation()} — you drive it; you see nothing.`)
        .send();
    } else {
      MessageApi.scene(giver).topic(TOPIC).toSelf(prose).send();
    }
    // The display is the card's birth path when a display is involved:
    // `show` pushes to every viewer who sees the screen, the holder among
    // them — never a second push through `CardApi.open`.
    screen.display.show({
      kind: "card",
      cardId: "stock",
      key: CardApi.keyFor(context, "stock"),
      prose,
    });
  }

  private static renderSheet(house: string, sheet: readonly StockSheetLine[]): string {
    if (sheet.length === 0) return `${house} keeps no par sheet yet — \`house par <category> <level>\` starts one.`;
    const lines = sheet.map(({ line, onHand, shortfall }) => {
      const short = shortfall > 0 ? ` — short ${String(shortfall)}` : "";
      return `  ${line.category}: ${String(onHand)} / ${String(line.level)} ${line.unit}${short}`;
    });
    return `Stock at ${house}:\n${lines.join("\n")}`;
  }
}

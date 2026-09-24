/**
 * HouseShopController — `house par`, `house price` and `house stock`:
 * the three subcommands of the shipped `house` verb that belong to a
 * SHOP.
 *
 * ⚠ Stanzas on a shipped view, per the instrumentation doctrine — the
 * trade's controller on the platform's verb, exactly as `house freight`
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
 */

import { BankingControllerBase } from '@saxonberg/server/mud/platform/idea/cmd/banking/BankingControllerBase';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { Currency, BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { PAR_UNITS } from '@saxonberg/server/mud/api/employment';
import type { Business, ParUnit, StockSheetLine } from '@saxonberg/server/mud/api/employment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CardApi } from '@saxonberg/server/mud/api/card';
import type { Display } from '@saxonberg/server/mud/lib/display/Display';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Stock from '@saxonberg/server/mud/lib/retail/Stock';

const TOPIC = 'act.deed';

interface HouseShopModel extends CommandModel {
  category?: string;
  level?: string;
  grade?: string;
  from?: string;
  thing?: MqlOneResult;
  ask?: string;
}

export default class HouseShopController extends BankingControllerBase<HouseShopModel> {
  async execute(model: HouseShopModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case 'par':
        return this.par(model, context);
      case 'price':
        return this.price(model, context);
      case 'stock':
        return this.stock(context);
      default:
        MessageApi.scene(context.commandGiver)
          .topic(TOPIC)
          .toSelf(Mml.compose`Usage: \`house par <category> <level>\`, \`house price <thing> <ask>\` or \`house stock\`.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'unknown-subcommand',
          detail: model.subcommand ?? '',
        });
    }
  }

  /** The house, or a `not-staff` rejection. */
  private async house(context: CommandContext): Promise<(Stuff & Business) | null> {
    const house = await this.resolveHouse(context);
    if (!house) {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't keep any house here.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-staff', detail: 'house' });
    }
    return house;
  }

  /**
   * `house par <category> <level> [--grade <band>] [--from <business>]` —
   * the unit is inferred from the level's suffix (`12L`, `5kg`, bare
   * number = count); a level of `0` removes the line.
   */
  private async par(model: HouseShopModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
    if (!house) return;
    if (!(await this.screen(context))) return;
    const category = (model.category ?? "").trim();
    const parsed = HouseShopController.parseLevel(model.level ?? "");
    if (!category || !parsed) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`house par <category> <level>\` — the level as \`12\` (count), \`6L\` or \`5kg\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-par", detail: `${category} ${model.level ?? ""}` });
      return;
    }
    if (parsed.level === 0) {
      const removed = house.removeParLine(category);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          removed
            ? Mml.compose`You strike ${category} from the par sheet of ${house.getPresentation()}.`
            : Mml.compose`${category} isn't on the par sheet.`,
        )
        .send();
      return;
    }
    house.setParLine({
      category,
      level: parsed.level,
      unit: parsed.unit,
      minGrade: (model.grade ?? "").trim(),
      supplier: (model.from ?? "").trim(),
    });
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Par for ${category} at ${house.getPresentation()}: ${String(parsed.level)} ${parsed.unit}${model.from ? ` from ${model.from}` : ""}.`)
      .send();
  }

  /**
   * `house price <thing> <ask>` — the shop's own ask for a good's kind
   * (economic bootstrap D14): sets the base price on the counter the
   * house operates that holds the thing (else its first counter), keyed
   * by the good's template. A `stocking` line derives from this base; a
   * terms good the house never priced asked the supplier's price plus
   * the Schedule's margin until now. ⚠ The seat's, never the screen's —
   * a price is the house's money policy.
   */
  private async price(model: HouseShopModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.house(context);
    if (!house) return;
    const thing = model.thing?.stuff ?? null;
    const ask = Number.parseInt((model.ask ?? "").trim(), 10);
    if (!thing || !Number.isFinite(ask) || ask <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`house price <thing> <ask>\` — the ask in whole ${Currency.of(BankingApi.compactCurrency()).plural}.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-price", detail: model.ask ?? "" });
      return;
    }
    const key = thing.getTemplatePath() ?? "";
    const counters = house
      .getOperatingLocations()
      .map((p) => StuffApi.findByTemplatePath(p))
      .filter((c): c is Stock => c instanceof Stock);
    const holding = MixinApi.isContainable(thing) ? thing.getContainer() : null;
    const counter = counters.find((c) => c === holding) ?? counters[0] ?? null;
    if (!counter || !key) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${house.getPresentation()} keeps no counter to price ${Mml.thing(thing)} on.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-counter", detail: key });
      return;
    }
    counter.setPrice(key, ask);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${house.getPresentation()} now asks ${Money.of(ask, BankingApi.compactCurrency()).render()} for ${Mml.thing(thing)} and its kind${counter.lineFor(key)?.pricing === "stocking" ? " — at par; the shelf moves it" : ""}.`)
      .send();
  }

  /** `12` → count, `6L` → L, `5kg` → kg; null when unparsable. */
  private static parseLevel(raw: string): { level: number; unit: ParUnit } | null {
    const m = /^(\d+(?:\.\d+)?)\s*([A-Za-z]*)$/.exec(raw.trim());
    if (!m) return null;
    const level = Number(m[1]);
    const suffix = (m[2] ?? "").toLowerCase();
    const unit: ParUnit | null =
      suffix === "" ? "count"
      : suffix === "l" ? "L"
      : suffix === "kg" ? "kg"
      : PAR_UNITS.includes(suffix as ParUnit) ? (suffix as ParUnit)
      : null;
    if (!Number.isFinite(level) || level < 0 || !unit) return null;
    return { level, unit };
  }

  /**
   * `house stock` — the live sheet as prose **and** the `stock` card: the
   * rows are the perceived bulk holders (MQL, giver-anchored); the par
   * lines ride the prose.
   */
  private async stock(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const screen = await this.resolveScreen(giver);
    // A screen signed in as a principal shows THAT house's sheet to whoever
    // drives it — the thief with the tablet reads it; otherwise the seat's.
    const principal = screen?.display.getPrincipal() ?? "";
    const signedIn = principal ? StuffApi.findByTemplatePath(principal) : null;
    const house =
      signedIn && MixinApi.isBusiness(signedIn) ? signedIn : await this.house(context);
    if (!house) return;
    if (!screen) return void (await this.screen(context));
    const sheet = house.stockSheetFor(giver);
    const body = HouseShopController.renderSheet(house.getPresentation(), sheet);
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

  /**
   * The house app runs on a SCREEN: the tablet you hold, one in sight you
   * may drive, or one anywhere by mind. None → `no-display`.
   */
  private async screen(
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

  private static renderSheet(house: string, sheet: readonly StockSheetLine[]): string {
    if (sheet.length === 0) return `${house} keeps no par sheet yet — \`house par <category> <level>\` starts one.`;
    const lines = sheet.map(({ line, onHand, shortfall }) => {
      const short = shortfall > 0 ? ` — short ${String(shortfall)}` : "";
      return `  ${line.category}: ${String(onHand)} / ${String(line.level)} ${line.unit}${short}`;
    });
    return `Stock at ${house}:\n${lines.join("\n")}`;
  }
}

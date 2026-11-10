/**
 * HousePriceController — `house price <thing> <ask>` — the shop's own ask for a good's kind
 * (economic bootstrap D14): sets the base price on the counter the
 * house operates that holds the thing (else its first counter), keyed
 * by the good's template. A `stocking` line derives from this base; a
 * terms good the house never priced asked the supplier's price plus
 * the Schedule's margin until now. ⚠ The seat's, never the screen's —
 * a price is the house's money policy (over {@link
 * HouseShopControllerBase}).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { Currency, BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Stock from '@saxonberg/server/mud/lib/retail/Stock';
import { HouseShopControllerBase, TOPIC } from './HouseShopControllerBase';

interface HousePriceModel extends CommandModel {
  thing?: MqlOneResult;
  ask?: string;
}

export default class HousePriceController extends HouseShopControllerBase<HousePriceModel> {
  async execute(model: HousePriceModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const house = await this.houseKept(context);
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
}

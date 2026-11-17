/**
 * ShelfConsignController — `shelf consign <thing> [on <shelf>] --ask <coin>`
 * (the flat `consign` until controllers-are-io W7 — the shelf's book is a
 * subcommand of `shelf`).
 *
 * Put a good you own up for sale on the store's consignment shelf: custody
 * moves to the shop, but your owner-stamp stays with you (custody ≠
 * ownership). A brokerage `ConsignmentListing` records the ask + payout
 * target; ownership is never on the listing.
 *
 * Gates (anti-grief + honesty) — ⭐ all the SHELF's, `ConsignmentShelf.
 * consignBy` (controller-liquidity D9): you must hold title (the rule
 * reclaim shares, `HeldGoods.mayDisposeOf`); you must hold a bank account
 * (the payout target — nudge to Goodkin otherwise); and you must be under
 * the per-consignor listing cap (the shared-shelf guard).
 *
 * ⭐⭐ **A stack goes up ONE UNIT at a time.** A stack is
 * owned-by-possession and cannot bear title, but a lot of one can (see
 * `ChattelLogic`): consigning takes a unit off, titles it, and leaves the
 * rest in your hands. That is what lets a mill sell cloth, which is a stack
 * on purpose so two dye lots never merge.
 *
 * ⭐ **Consigning as the house.** With a business's operating account
 * active in the wallet (`wallet use house`), you consign **as that
 * business**: a good it owns is yours to sell, an unstamped good is
 * stamped to it, the listing's `consignorKey` is the business path and the
 * payout is its operating account — so each consignor's account rises on
 * resale through the shipped split leg. The distributor's floor hands
 * consign this way.
 */

import { HeldGoodsControllerBase, TOPIC } from "./HeldGoodsControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import Stock from "../../../../lib/retail/Stock";
import { Mml } from "../../../../api/mml";
import { ChattelApi } from "../../../../api/chattel";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Container } from "../../../../lib/spatial/Container";
import type { Containable } from "../../../../lib/spatial/Containable";
import { EmploymentApi } from "../../../../api/employment";
import type { Organization } from "../../../../lib/employment/Organization";
import { StuffApi } from "../../../../api/stuff";
import type { Chattel } from '../../../../lib/chattel/Chattel';
import type { MqlOneResult } from '../../../../api/mql';
import type { ShelfStuff } from "../../../../lib/retail/ConsignmentShelf";
import { Freshness } from "../../../../lib/material/Freshness";


interface ConsignModel extends CommandModel {
  /** Bound by the view; addressable, defaulted to what is in reach. */
  shelf?: MqlOneResult;
  /** ⭐ The good, bound by the view from your inventory. */
  thing: MqlOneResult;
  ask?: string;
}

export default class ShelfConsignController extends HeldGoodsControllerBase<ConsignModel> {
  async execute(model: ConsignModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Bound by the view, not hunted for here.
    const shelf = (model.shelf?.stuff ?? null) as ShelfStuff | null;
    if (!shelf) {
      this.reject(giver, context, Mml.compose`There's nowhere to consign here.`, {
        kind: "empty-result",
        field: "thing",
        query: model.thing?.raw ?? "",
      });
      return;
    }

    const ask = Number.parseInt(model.ask ?? "", 10);
    if (!Number.isFinite(ask) || ask <= 0) {
      this.reject(giver, context, Mml.compose`Name an asking price — \`--ask <coin>\`.`, {
        kind: "controller-rejected",
        reason: "no-ask",
        detail: model.ask ?? "",
      });
      return;
    }

    // ⭐ Read, never hunted. `scope: [inventory]` on the view is what
    // "you must be carrying it" means, and the binder enforces it.
    const item = (model.thing?.stuff ?? null) as (Stuff & Containable) | null;
    if (!item) {
      this.reject(giver, context, Mml.compose`You aren't carrying "${model.thing?.raw ?? ""}".`, {
        kind: "controller-rejected",
        reason: "not-held",
        detail: model.thing?.raw ?? "",
      });
      return;
    }

    // ⭐⭐ Every gate is the SHELF's (controller-liquidity D9, C63): the
    // title rule it shares with reclaim, the payout account, the cap, the
    // turned good — all asked before the split, the stamp or the move. A
    // stack goes up one unit at a time (`ConsignmentShelf.consignBy`).
    const raw = model.thing?.raw ?? "";
    const answer = await shelf.consignBy(giver, item, ask);
    if (!answer.ok) {
      switch (answer.reason) {
        case "worn":
          return this.reject(
            giver,
            context,
            Mml.compose`You're wearing ${Mml.thing(item)} — take it off first (\`remove ${raw}\`).`,
            { kind: "controller-rejected", reason: answer.reason, detail: raw },
          );
        case "unsplittable":
          return this.reject(giver, context, Mml.compose`${Mml.thing(item)} won't divide into lots.`, {
            kind: "controller-rejected", reason: answer.reason, detail: raw,
          });
        case "not-owner":
          return this.reject(giver, context, Mml.compose`${Mml.thing(item)} isn't yours to sell.`, {
            kind: "controller-rejected", reason: answer.reason, detail: raw,
          });
        case "no-account":
          return this.reject(
            giver,
            context,
            Mml.compose`Open a bank account first — the Goodkin counting-house will set you up.`,
            { kind: "controller-rejected", reason: answer.reason, detail: raw },
          );
        case "over-cap":
          return this.reject(
            giver,
            context,
            Mml.compose`You've reached your consignment limit here (${String(answer.facts.cap)}). Reclaim one first.`,
            { kind: "controller-rejected", reason: answer.reason, detail: String(answer.facts.cap) },
          );
        case "turned":
          return this.reject(giver, context, Mml.compose`${Mml.thing(item)} has turned; nobody will list that.`, {
            kind: "controller-rejected", reason: answer.reason, detail: raw,
          });
        default: {
          const never: never = answer;
          return never;
        }
      }
    }
    const { listed, kept, basis } = answer.facts;
    const money = Money.of(ask, BankingApi.compactCurrency()).render();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        basis === "terms"
          ? kept > 0
            ? Mml.compose`You leave ${Mml.thing(listed)} on the shop's terms — it owes you ${money} when it sells and sets its own price — and keep ${String(kept)} back. It's still yours until then.`
            : Mml.compose`You leave ${Mml.thing(listed)} on the shop's terms — it owes you ${money} when it sells and sets its own price. It's still yours until then.`
          : kept > 0
            ? Mml.compose`You put ${Mml.thing(listed)} up for sale at ${money}, and keep ${String(kept)} back. It's still yours until it sells.`
            : Mml.compose`You put ${Mml.thing(listed)} up for sale at ${money}. It's still yours until it sells.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets ${Mml.thing(listed)} on the ${basis === "terms" ? "counter" : "consignment shelf"}.`)
      .send();
  }
}

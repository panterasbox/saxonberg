/**
 * ConsignController — `consign <thing> --ask <coin>`.
 *
 * Put a good you own up for sale on the store's consignment shelf: custody
 * moves to the shop, but your owner-stamp stays with you (custody ≠
 * ownership). A brokerage `ConsignmentListing` records the ask + payout
 * target; ownership is never on the listing.
 *
 * Gates (anti-grief + honesty): you must own the good (`ChattelApi.ownerOf`,
 * not the listing); it must be a discrete good (a fungible stack is
 * owned-by-possession, never consigned); you must hold a bank account (the
 * payout target — nudge to Goodkin otherwise); and you must be under the
 * per-consignor listing cap (the shared-shelf guard, the withdrawal-quota
 * sibling).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import ConsignmentShelf from "../../ConsignmentShelf";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { ChattelApi } from "../../../api/chattel";
import { Currency, BankingApi, Money } from "../../../api/banking";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";

const TOPIC = "world.narration.action";

interface ConsignModel extends CommandModel {
  thing: string;
  ask?: string;
}

export default class ConsignController extends CommandController<ConsignModel> {
  async execute(model: ConsignModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const shelf = ConsignmentShelf.resolveIn(context);
    if (!shelf) {
      this.reject(giver, context, Mml.compose`There's nowhere to consign here.`, {
        kind: "empty-result",
        field: "thing",
        query: model.thing,
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

    const item = this.resolveHeld(giver, model.thing);
    if (!item) {
      this.reject(giver, context, Mml.compose`You aren't carrying "${model.thing}".`, {
        kind: "controller-rejected",
        reason: "not-held",
        detail: model.thing,
      });
      return;
    }

    // Discrete-goods only — a fungible stack is owned-by-possession.
    if (MixinApi.isGlobbable(item)) {
      this.reject(giver, context, Mml.compose`You can't consign a loose stack.`, {
        kind: "controller-rejected",
        reason: "fungible",
        detail: model.thing,
      });
      return;
    }

    // You consign what you own (authoritative via ownerOf, not custody).
    const consignorKey = giver.getTemplatePath();
    const owner = await ChattelApi.ownerOf(item);
    if (
      owner?.kind !== "player" ||
      owner.templatePath !== consignorKey
    ) {
      this.reject(giver, context, Mml.compose`${Mml.item(item)} isn't yours to sell.`, {
        kind: "controller-rejected",
        reason: "not-owner",
        detail: model.thing,
      });
      return;
    }

    // Payout target — a bank account is required (nudge otherwise).
    if ((await BankingApi.primaryAccountIdOf(consignorKey)) == null) {
      this.reject(
        giver,
        context,
        Mml.compose`Open a bank account first — the Goodkin counting-house will set you up.`,
        { kind: "controller-rejected", reason: "no-account", detail: consignorKey },
      );
      return;
    }

    // Per-consignor cap — the shared-shelf anti-grief guard (0 disables).
    const cap = this.listingCap();
    if (cap > 0 && shelf.activeListingCount(consignorKey) >= cap) {
      this.reject(
        giver,
        context,
        Mml.compose`You've reached your consignment limit here (${String(cap)}). Reclaim one first.`,
        { kind: "controller-rejected", reason: "over-cap", detail: String(cap) },
      );
      return;
    }

    // Establish the title if the good is unstamped (author-owned) — a
    // consignment needs a durable chattel id to key the listing on.
    if (!item.getChattelId()) await ChattelApi.stamp(item, giver);

    // Custody → the shop's shelf; the owner-stamp stays put.
    ContainmentApi.move(item, shelf as unknown as Stuff & Container);
    shelf.recordListing(item.getChattelId(), consignorKey, ask);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You put ${Mml.item(item)} up for sale at ${Money.of(ask, Currency.compact()).render()}. It's still yours until it sells.`,
      )
      .toPeers(Mml.compose`${Mml.name(giver)} sets ${Mml.item(item)} on the consignment shelf.`)
      .send();
  }

  /** Resolve a good the giver is carrying, by keyword. */
  private resolveHeld(
    giver: Stuff,
    keyword: string,
  ): (Stuff & Containable & { getChattelId(): string }) | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      if (
        MixinApi.isPerceptible(item) &&
        item.hasKeyword(keyword) &&
        MixinApi.isChattel(item)
      ) {
        return item as Stuff & Containable & { getChattelId(): string };
      }
    }
    return null;
  }

  private listingCap(): number {
    try {
      const raw = AppApi.setting(AppSettingKeys.retailConsignmentListingCap);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
    } catch {
      return 5;
    }
  }

  private reject(
    giver: Stuff,
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    note: Parameters<CommandContext["note"]>[0],
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note(note);
  }
}

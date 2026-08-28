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
 *
 * ⭐ **Consigning as the house.** With a business's operating account
 * active in the wallet (`wallet use house`), you consign **as that
 * business**: a good it owns is yours to sell, an unstamped good is
 * stamped to it, the listing's `consignorKey` is the business path and the
 * payout is its operating account — so each consignor's account rises on
 * resale through the shipped split leg. The distributor's floor hands
 * consign this way.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import ConsignmentShelf from "../../../thing/ConsignmentShelf";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { ChattelApi } from "../../../../api/chattel";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Container } from "../../../../lib/spatial/Container";
import type { Containable } from "../../../../lib/spatial/Containable";
import { EmploymentApi } from "../../../../api/employment";
import { StuffApi } from "../../../../api/stuff";

const TOPIC = "act.deed";

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

    // The principal you consign as: the business whose account is active in
    // your wallet (and that you buy for), else yourself.
    const house = await this.activeHouse(giver);
    const principal: Stuff = house ?? giver;
    const consignorKey = principal.getTemplatePath();

    // You consign what you own (authoritative via ownerOf, not custody) —
    // the house's goods when acting as the house, your own otherwise.
    // An unstamped good in your hands that resolves to you (or to nobody)
    // is stamped to the principal below — a hand consigning the house's
    // floor stock titles it to the house, never to themselves.
    const owner = await ChattelApi.ownerOf(item);
    const ownedBy = (key: string | null): boolean =>
      (owner?.kind === "player" || owner?.kind === "organization") &&
      owner.templatePath === key;
    // Title to sell: the principal's stamp, the giver's own, or NO stamp
    // at all — a good nobody has ever owned (a floor bottle the spawn
    // sweep stood in the outfit's stock) is the possessor's to put up,
    // and consigning stamps it to the principal. A chattel id alone is
    // identity, not ownership.
    const ownedByPrincipal =
      ownedBy(consignorKey) ||
      owner === null ||
      ownedBy(giver.getTemplatePath());
    if (!ownedByPrincipal) {
      this.reject(giver, context, Mml.compose`${Mml.thing(item)} isn't yours to sell.`, {
        kind: "controller-rejected",
        reason: "not-owner",
        detail: model.thing,
      });
      return;
    }

    // Payout target — a bank account is required (nudge otherwise).
    if (!consignorKey || (await BankingApi.primaryAccountIdOf(consignorKey)) == null) {
      this.reject(
        giver,
        context,
        Mml.compose`Open a bank account first — the Goodkin counting-house will set you up.`,
        { kind: "controller-rejected", reason: "no-account", detail: consignorKey ?? undefined },
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
    if (!item.getChattelId()) await ChattelApi.stamp(item, principal);

    // Custody → the shop's shelf; the owner-stamp stays put.
    ContainmentApi.move(item, shelf as unknown as Stuff & Container);
    shelf.recordListing(item.getChattelId(), consignorKey, ask);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You put ${Mml.thing(item)} up for sale at ${Money.of(ask, Currency.compact()).render()}. It's still yours until it sells.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets ${Mml.thing(item)} on the consignment shelf.`)
      .send();
  }

  /**
   * The Business whose operating account is the wallet's active one, if the
   * giver buys for it — the house they trade as right now. Null = personal.
   */
  private async activeHouse(giver: Stuff): Promise<Stuff | null> {
    const active = BankingApi.activeCredential()?.getActiveAccount() ?? null;
    if (!active) return null;
    const ownerKey = await BankingApi.ownerKeyOf(active);
    if (!ownerKey || ownerKey === giver.getTemplatePath()) return null;
    const live = StuffApi.findByTemplatePath(ownerKey);
    if (!live || !MixinApi.isBusiness(live)) return null;
    const mine = await EmploymentApi.buysFor(giver);
    return mine.includes(live) ? live : null;
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

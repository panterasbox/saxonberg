/**
 * ConsignController — `consign <thing> --ask <coin>`.
 *
 * Put a good you own up for sale on the store's consignment shelf: custody
 * moves to the shop, but your owner-stamp stays with you (custody ≠
 * ownership). A brokerage `ConsignmentListing` records the ask + payout
 * target; ownership is never on the listing.
 *
 * Gates (anti-grief + honesty): you must own the good (`ChattelApi.ownerOf`,
 * not the listing); you must hold a bank account (the payout target — nudge
 * to Goodkin otherwise); and you must be under the per-consignor listing cap
 * (the shared-shelf guard, the withdrawal-quota sibling).
 *
 * ⭐⭐ **A stack goes up ONE UNIT at a time.** A stack is
 * owned-by-possession and cannot bear title, but a lot of one can (see
 * `ChattelLogic`): consigning takes a unit off, titles it, and leaves the
 * rest in your hands. That is what lets a mill sell cloth, which is a glob
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
import type { Organization } from "../../../../lib/employment/Organization";
import { StuffApi } from "../../../../api/stuff";
import type { Chattel } from '../../../../lib/chattel/Chattel';

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

    /*
     * ⭐⭐ **A stack goes up ONE UNIT at a time.**
     *
     * This used to refuse every `Globbable` outright — a true statement
     * about a STACK and the wrong conclusion about a SALE. A bolt of
     * cloth is a glob on purpose (two dye lots must never merge), so the
     * rule meant a mill could weave cloth it could never sell: a live
     * drive of the textile chain ended on
     * `controller-rejected:fungible(bolt)`.
     *
     * The resolution is upstream, in the chattel rule itself: a STACK
     * cannot bear title, a LOT OF ONE can, and a titled lot does not
     * merge. So consigning takes one unit off, titles it, and leaves the
     * rest of the stack in the seller's hands owned-by-possession.
     *
     * ⚠ The split happens LAST, after every gate — ownership, account,
     * cap. A stack divided by a consignment that then refuses is a stack
     * the caller has to put back together.
     */
    const glob = MixinApi.isGlobbable(item) ? item : null;
    if (glob && !glob.canSplit(1)) {
      // The veto seam's own reasons — a shadowed or adorned stack has
      // per-instance state that does not divide.
      this.reject(
        giver,
        context,
        Mml.compose`${Mml.thing(item)} won't divide into lots.`,
        { kind: "controller-rejected", reason: "unsplittable", detail: model.thing },
      );
      return;
    }

    // The principal you consign as: the business whose account is active in
    // your wallet (and that you buy for), else yourself.
    const house = await this.activeHouse(giver);
    const principal: Stuff = house ?? giver;
    const consignorKey = principal.getIdentityPath();

    // You consign what you own (authoritative via ownerOf, not custody) —
    // the house's goods when acting as the house, your own otherwise.
    // An unstamped good in your hands that resolves to you (or to nobody)
    // is stamped to the principal below — a hand consigning the house's
    // floor stock titles it to the house, never to themselves.
    const owner = MixinApi.isChattel(item)
      ? await item.chattelOwner()
      : null;
    const ownedBy = (key: string | null): boolean =>
      (owner?.kind === "player" || owner?.kind === "organization") &&
      owner.templatePath === key;
    // Title to sell: the principal's stamp, the giver's own, or NO stamp
    // at all — a good nobody has ever owned (a floor bottle the spawn
    // sweep stood in the outfit's stock) is the possessor's to put up,
    // and consigning stamps it to the principal. A chattel id alone is
    // identity, not ownership.
    // (`ChattelApi.ownerOf` DERIVES an unstamped good's owner from the
    // parcel over its template — a `group`, the trade's title. Only a
    // player or an organization is ever stamped, so a group owner is
    // never a stamp: the good is nobody's in particular.)
    // A corpo's yard sells the corpo's liquid: a good titled to an
    // organization ABOVE the acting house (Veshko's bottles, the parcel
    // held by /corpo/veshko; the yard's parentOrganization) is the
    // house's to put up.
    const chain = house
      ? (house as Stuff & Organization).organizationChain().map(
          (o) => o.getTemplatePath(),
        )
      : [];
    const ownedByPrincipal =
      ownedBy(consignorKey) ||
      owner === null ||
      owner.kind === "group" ||
      (owner.kind === "organization" && chain.includes(owner.templatePath)) ||
      ownedBy(giver.getIdentityPath());
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
    // The shelf's authored override wins (the market stall's generous
    // cap); every other shelf rides the global dial.
    const cap = shelf.getListingCapOverride() ?? this.listingCap();
    if (cap > 0 && shelf.activeListingCount(consignorKey) >= cap) {
      this.reject(
        giver,
        context,
        Mml.compose`You've reached your consignment limit here (${String(cap)}). Reclaim one first.`,
        { kind: "controller-rejected", reason: "over-cap", detail: String(cap) },
      );
      return;
    }

    // Take one unit off the stack. `split` short-circuits to the source
    // when the lot IS the whole stack, so a one-unit stack and a
    // discrete good travel the same path from here.
    const listed = glob
      ? ((await glob.split(1)) as unknown as Stuff &
          Containable & { getChattelId(): string })
      : item;

    // Establish the title if the good is unstamped (author-owned) — a
    // consignment needs a durable chattel id to key the listing on. A
    // freshly split lot is always unstamped: identity is per-instance
    // and is not among the glob-identity fields a split copies.
    if (!listed.getChattelId()) {
      await (listed as unknown as Stuff & Chattel).stampChattel(principal);
    }

    // Custody → the shop's shelf; the owner-stamp stays put.
    ContainmentApi.move(listed, shelf as unknown as Stuff & Container);
    shelf.recordListing(listed.getChattelId(), consignorKey, ask);

    const kept = glob && listed !== item ? glob.getQuantity() : 0;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        kept > 0
          ? Mml.compose`You put ${Mml.thing(listed)} up for sale at ${Money.of(ask, Currency.compact()).render()}, and keep ${String(kept)} back. It's still yours until it sells.`
          : Mml.compose`You put ${Mml.thing(listed)} up for sale at ${Money.of(ask, Currency.compact()).render()}. It's still yours until it sells.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets ${Mml.thing(listed)} on the consignment shelf.`)
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
    if (!ownerKey || ownerKey === giver.getIdentityPath()) return null;
    const live = StuffApi.findByTemplatePath(ownerKey);
    if (!live || !MixinApi.isBusiness(live)) return null;
    const mine = MixinApi.isEmployed(giver) ? await giver.buysFor() : [];
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

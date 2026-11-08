/**
 * HeldGoodsControllerBase — what the `shelf` and `rack` subcommands share
 * (controllers-are-io W7, D9: *a transaction with an institution's book is
 * a subcommand of its noun*). A store's consignment shelf and a house's
 * check rack keep the same kind of book — goods held in custody for their
 * owner, the `HeldGoodsMixin` surface — so `shelf reclaim` and `rack
 * reclaim` are one act ({@link HeldGoodsControllerBase.reclaimFrom}) over
 * two nouns, each binding its own book.
 *
 * ⚠ Fixed in passing: the flat `reclaim` bound its operand as
 * `requires: [ConsignmentShelfMixin]`, so a reclaim from a `CheckRack` was
 * refused at shape though the controller served any held-goods fixture.
 * `rack reclaim` binds a `HeldGoodsMixin` rack.
 *
 * Reclaim: take back a good held in custody — an unsold consignment OR a
 * checked weapon: custody returns to you. There is **no chattel op** — you
 * owned it the whole time (the stamp never left). Authority is
 * `ChattelApi.ownerOf`, not the holding.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { BankingApi } from "../../../../api/banking";
import { StuffApi } from "../../../../api/stuff";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { RackStuff } from "../../../../lib/retail/HeldGoods";
import type { ShelfStuff } from "../../../../lib/retail/ConsignmentShelf";

export const TOPIC = "act.deed";

/** The words a reclaim speaks — the shelf's, or the rack's. */
export interface ReclaimWords {
  /** "on the shelf" — where the good is not, when it is not. */
  on: string;
  /** "off the shelf" — the self line. */
  off: string;
  /** "off the consignment shelf" — the peers line. */
  offPeers: string;
}

export abstract class HeldGoodsControllerBase<
  T extends CommandModel = CommandModel,
> extends CommandController<T> {
  /** Take `thing` back from `shelf` (a consignment shelf or a check rack). */
  protected async reclaimFrom(
    shelf: ShelfStuff | RackStuff | null,
    thing: string,
    context: CommandContext,
    words: ReclaimWords,
  ): Promise<void> {
    const giver = context.commandGiver;
    // Reclaim serves any held-goods fixture — a store's consignment
    // shelf or a house's check rack — over the shared custody surface.
    // ⭐ Bound by the view, not hunted for here.
    if (!shelf) {
      this.reject(giver, context, Mml.compose`There's nowhere to reclaim from here.`, {
        kind: "empty-result",
        field: "thing",
        query: thing,
      });
      return;
    }

    const item = shelf.resolveHeld(thing);
    if (!item) {
      this.reject(giver, context, Mml.compose`There's no "${thing}" of yours ${words.on}.`, {
        kind: "controller-rejected",
        reason: "not-listed",
        detail: thing,
      });
      return;
    }

    // You reclaim what you own (custody is with the shop; ownership is
    // yours) — or what the HOUSE you act for owns (economic bootstrap
    // D11: a supplier outfit's hand takes an unpaid crate back off a
    // shop's counter — rung 0's repossession, a query over who owns it).
    const owner = MixinApi.isChattel(item)
      ? await item.chattelOwner()
      : null;
    const house = await this.activeHouse(giver);
    const mine =
      (owner?.kind === "player" && owner.templatePath === giver.getIdentityPath()) ||
      (owner?.kind === "organization" && house !== null && owner.templatePath === house.getIdentityPath());
    if (!mine) {
      this.reject(giver, context, Mml.compose`${Mml.thing(item)} isn't yours to take.`, {
        kind: "controller-rejected",
        reason: "not-owner",
        detail: thing,
      });
      return;
    }

    // Custody → you; clear the listing. No chattel op (ownership never left).
    if (MixinApi.isContainer(giver)) {
      ContainmentApi.move(item, giver); // narrowed to Stuff & Container
    }
    if (MixinApi.isChattel(item)) shelf.removeHolding(item.getChattelId());

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You take ${Mml.thing(item)} back ${words.off}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} takes ${Mml.thing(item)} back ${words.offPeers}.`)
      .send();
    }

  /**
   * The Business whose operating account is the wallet's active one, if the
   * giver buys for it — the house they act (or trade) as right now: the
   * rule `shelf consign` and both reclaims share. Null = personal.
   */
  protected async activeHouse(giver: Stuff): Promise<Stuff | null> {
    const active = BankingApi.activeCredential()?.getActiveAccount() ?? null;
    if (!active) return null;
    const ownerKey = await BankingApi.ownerKeyOf(active);
    if (!ownerKey || ownerKey === giver.getIdentityPath()) return null;
    const live = StuffApi.findByTemplatePath(ownerKey);
    if (!live || !MixinApi.isBusiness(live)) return null;
    const mine = MixinApi.isEmployed(giver) ? await giver.buysFor() : [];
    return mine.includes(live) ? live : null;
  }

  protected reject(
    giver: Stuff,
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    note: Parameters<CommandContext["note"]>[0],
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note(note);
  }
}

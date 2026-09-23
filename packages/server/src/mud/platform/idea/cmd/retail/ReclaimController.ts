/**
 * ReclaimController — `reclaim <thing>`.
 *
 * Take back a good held in a shop's or house's custody — an unsold
 * consignment OR a checked weapon: custody returns to you. There is **no
 * chattel op** — you owned it the whole time (the stamp never left).
 * Authority is `ChattelApi.ownerOf`, not the holding. Serves any
 * `HeldGoodsShelf` (the shared custody base).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import ConsignmentShelf from "../../../thing/ConsignmentShelf";
import CheckRack from "../../../thing/CheckRack";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { BankingApi } from "../../../../api/banking";
import { StuffApi } from "../../../../api/stuff";
import { Mml } from "../../../../api/mml";
import { ChattelApi } from "../../../../api/chattel";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { MqlApi } from '../../../../api/mql';
import type { RackStuff } from "../../../thing/CheckRack";
import type { ShelfStuff } from "../../../thing/ConsignmentShelf";
import type { MqlOneResult } from "../../../../api/mql";

const TOPIC = "act.deed";

interface ReclaimModel extends CommandModel {
  /** Bound by the view; addressable, defaulted to what is in reach. */
  shelf?: MqlOneResult;
  thing: string;
}

export default class ReclaimController extends CommandController<ReclaimModel> {
  async execute(model: ReclaimModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // Reclaim serves any held-goods fixture — a store's consignment
    // shelf or a house's check rack — over the shared custody surface.
    const shelf =
      // ⭐ Bound by the view, not hunted for here.
      (model.shelf?.stuff ?? null) as ShelfStuff | RackStuff | null;
    if (!shelf) {
      this.reject(giver, context, Mml.compose`There's nowhere to reclaim from here.`, {
        kind: "empty-result",
        field: "thing",
        query: model.thing,
      });
      return;
    }

    const item = shelf.resolveHeld(model.thing);
    if (!item) {
      this.reject(giver, context, Mml.compose`There's no "${model.thing}" of yours on the shelf.`, {
        kind: "controller-rejected",
        reason: "not-listed",
        detail: model.thing,
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
        detail: model.thing,
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
      .toSelf(Mml.compose`You take ${Mml.thing(item)} back off the shelf.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} takes ${Mml.thing(item)} back off the consignment shelf.`)
      .send();
  }

  /**
   * The Business whose operating account is the wallet's active one, if the
   * giver buys for it — the house they act as right now (the `consign`
   * controller's own rule). Null = personal.
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

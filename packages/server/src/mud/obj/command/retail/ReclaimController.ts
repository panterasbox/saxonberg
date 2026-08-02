/**
 * ReclaimController — `reclaim <thing>`.
 *
 * Take back an unsold good you consigned: custody returns to you. There is
 * **no chattel op** — you owned it the whole time (the stamp never left).
 * Authority is `ChattelApi.ownerOf`, not the listing.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import ConsignmentShelf from "../../../lib/retail/ConsignmentShelf";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { ChattelApi } from "../../../api/chattel";
import type { Stuff } from "../../../lib/stuff/Stuff";

const TOPIC = "world.narration.action";

interface ReclaimModel extends CommandModel {
  thing: string;
}

export default class ReclaimController extends CommandController<ReclaimModel> {
  async execute(model: ReclaimModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const shelf = ConsignmentShelf.resolveIn(context);
    if (!shelf) {
      this.reject(giver, context, Mml.compose`There's nowhere to reclaim from here.`, {
        kind: "empty-result",
        field: "thing",
        query: model.thing,
      });
      return;
    }

    const item = shelf.resolveConsigned(model.thing);
    if (!item) {
      this.reject(giver, context, Mml.compose`There's no "${model.thing}" of yours on the shelf.`, {
        kind: "controller-rejected",
        reason: "not-listed",
        detail: model.thing,
      });
      return;
    }

    // You reclaim what you own (custody is with the shop; ownership is yours).
    const owner = await ChattelApi.ownerOf(item);
    if (
      owner?.kind !== "player" ||
      owner.templatePath !== giver.getTemplatePath()
    ) {
      this.reject(giver, context, Mml.compose`${Mml.item(item)} isn't yours to take.`, {
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
    if (MixinApi.isChattel(item)) shelf.removeListing(item.getChattelId());

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You take ${Mml.item(item)} back off the shelf.`)
      .toPeers(Mml.compose`${Mml.name(giver)} takes ${Mml.item(item)} back off the consignment shelf.`)
      .send();
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

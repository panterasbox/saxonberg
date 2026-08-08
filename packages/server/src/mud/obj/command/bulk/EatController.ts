/**
 * EatController — `eat X`.
 *
 * The solid analog of `drink`. Targets a discrete edible item (a Stuff
 * carrying a `Material` with `edibility === true`, gated by
 * `mustBeEdible`), hands a portion to the actor's `ingest` seam as
 * **solid** intake (filling the digestion buffer's solid sub-volume),
 * and — on full acceptance — consumes the whole item. A discrete item
 * is all-or-nothing: if the stomach is too full to take the whole
 * portion, the item survives and the actor is told they're too full (a
 * half-eaten ration is out of v1 scope).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { BulkableApi } from "../../../api/bulk";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { StuffApi } from "../../../api/stuff";
import { Mml } from "../../../api/mml";
import { METABOLIC_DEFAULTS } from "../../../lib/metabolism/Metabolic";

const TOPIC = "act.deed";

interface EatModel extends CommandModel {
  target: MqlOneResult;
}

export default class EatController extends CommandController<EatModel> {
  async execute(model: EatModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target.stuff;

    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to eat.`)
        .send();
      context.note({
        kind: "empty-result",
        field: "target",
        query: model.target.raw,
      });
      return;
    }

    const material = MixinApi.isTangible(target) ? target.getMaterial() : null;
    if (!material || material.getEdibility() !== true) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't eat ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "not-edible",
        detail: "target has no edible material",
      });
      return;
    }

    const portion = METABOLIC_DEFAULTS.EAT_PORTION_LITRES;
    const accepted = BulkableApi.ingestSolid(giver, material, portion);

    // Discrete item is all-or-nothing: only a full portion consumes it.
    if (accepted < portion - 1e-9) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You're too full to eat ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "too-full",
        detail: "digestion buffer's solid sub-volume is full",
      });
      return;
    }

    const appearance = material.getAppearance() || material.getName() || "it";
    // Emit the scene while the item still exists, then consume it.
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You eat the ${appearance}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} eats ${Mml.thing(target)}.`)
      .send();
    await StuffApi.destruct(target);
  }
}

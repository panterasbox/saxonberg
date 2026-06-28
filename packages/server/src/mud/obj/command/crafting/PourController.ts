/**
 * PourController — `pour <spirit> into <shaker>` / `add <spirit>` (the
 * manual-build intake).
 *
 * Resolves the spirit's reachable graded bottle and a build vessel (the
 * shaker / mixing glass), then runs an engaged step that — **at
 * completion** — debits a standard measure off the bottle (to the
 * discard sink, conservation, exactly as `CraftingLogic.consumeBulkInputs`
 * does) and banks a graded contribution into the vessel's build buffer.
 *
 * Coexists with the general bulk `pour` (`bulk/PourController`) by target
 * type: a build vessel is **not** `Bulkable`, so the bulk pour can't
 * resolve a destination slot for it and falls through; a `Bulkable`
 * holder isn't a build vessel, so this controller falls through to the
 * bulk pour. No recency fragility.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type Material from "../../../lib/material/Material";
import { BulkableApi } from "../../../api/bulk";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { StuffApi } from "../../../api/stuff";

const TOPIC = "world.narration.action";
/** A standard manual pour (≥ every demo recipe's per-slot measure). */
const STANDARD_POUR_L = 0.06;
const POUR_MS = 3000;
const EPS = 1e-9;

interface PourModel extends CommandModel {
  spirit: MqlOneResult;
  vessel?: MqlOneResult;
}

/** A material's recipe category — its primary keyword (e.g. gin → `gin`). */
function primaryCategory(material: Material): string {
  const keywords = material.getKeywords();
  return (keywords.length > 0 ? keywords[0]! : material.getName()).toLowerCase();
}

export default class PourController extends ManualBuildController<PourModel> {
  async execute(model: PourModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const bottle = model.spirit?.stuff ?? null;
    if (!bottle) {
      this.declineStep(
        context,
        Mml.compose`You don't see any '${model.spirit?.raw ?? "?"}' to pour.`,
        "empty-result",
      );
      return;
    }
    if (!MixinApi.isBulkable(bottle) || !MixinApi.isGraded(bottle)) {
      this.declineStep(
        context,
        Mml.compose`You can't pour a measure from ${Mml.item(bottle)}.`,
        "not-a-holder",
      );
      return;
    }

    const vessel: Stuff | null =
      model.vessel?.stuff ?? this.findBuildVessel(giver);
    if (!vessel || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(
        context,
        Mml.compose`Pour it into what? You need a shaker or mixing glass.`,
        "no-vessel",
      );
      return;
    }

    const slot = BulkableApi.slotFor(bottle, model.spirit.via?.bulk?.affordance);
    if (!slot) {
      this.declineStep(
        context,
        Mml.compose`There's nothing to pour out of ${Mml.item(bottle)}.`,
        "not-a-holder",
      );
      return;
    }

    // Resolve the material → category up front: the onComplete closure is
    // sync, but a Material singleton may need an async load first.
    const mpath = slot.getMaterialPath();
    const material = mpath ? await StuffApi.singleton<Material>(mpath) : null;
    const category = material ? primaryCategory(material) : "unknown";
    const gradeBand = bottle.getGradeBand();
    // Captured for the demonstration-capture trail (empty for a scripted
    // dispatch — only a hand-typed build accumulates a transcript).
    const commandText = context.commandText;

    this.engageStep(context, {
      durationMs: POUR_MS,
      beginSelf: Mml.compose`You start pouring ${Mml.item(bottle)} into ${Mml.item(vessel)}.`,
      beginPeers: Mml.compose`${Mml.name(giver)} starts pouring ${Mml.item(bottle)} into ${Mml.item(vessel)}.`,
      onComplete: () => {
        const result = BulkableApi.transfer(slot, null, {
          kind: "measure",
          litres: STANDARD_POUR_L,
          mode: "lenient",
        });
        if (result.applied <= EPS) {
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.compose`${Mml.item(bottle)} is empty — nothing pours.`)
            .send();
          return;
        }
        vessel.addContribution({
          category,
          measureL: result.applied,
          gradeBand,
        });
        vessel.recordCommand(commandText);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You pour ${Mml.item(bottle)} into ${Mml.item(vessel)}.`)
          .toPeers(Mml.compose`${Mml.name(giver)} pours ${Mml.item(bottle)} into ${Mml.item(vessel)}.`)
          .send();
      },
    });
  }
}

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
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type Material from "../../../../lib/material/Material";
import { BulkableApi } from "../../../../api/bulk";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { StuffApi } from "../../../../api/stuff";

const TOPIC = "act.deed";
/** A standard manual pour (≥ every demo recipe's per-slot measure). */
const STANDARD_POUR_L = 0.06;
const POUR_MS = 3000;
const EPS = 1e-9;

interface PourModel extends CommandModel {
  spirit: MqlOneResult;
  vessel?: MqlOneResult;
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

    // The discrete-ingredient branch (the cooking `add`): a Tangible
    // ingredient — not a graded bottle — dropped into the pot whole. The
    // item is consumed at completion and banked as an item-contribution.
    if (!MixinApi.isBulkable(bottle) || !MixinApi.isGraded(bottle)) {
      if (
        MixinApi.isTangible(bottle) &&
        bottle.getMaterial() !== null &&
        !MixinApi.isTool(bottle) &&
        !MixinApi.isCrafted(bottle)
      ) {
        this.addIngredient(context, bottle, vessel);
        return;
      }
      this.declineStep(
        context,
        Mml.compose`You can't pour a measure from ${Mml.thing(bottle)}.`,
        "not-a-holder",
      );
      return;
    }

    const slot = BulkableApi.slotFor(bottle, model.spirit.via?.bulk?.affordance);
    if (!slot) {
      this.declineStep(
        context,
        Mml.compose`There's nothing to pour out of ${Mml.thing(bottle)}.`,
        "not-a-holder",
      );
      return;
    }

    // Resolve the material → category up front: the onComplete closure is
    // sync, but a Material singleton may need an async load first.
    const mpath = slot.getMaterialPath();
    const material = mpath ? await StuffApi.singleton<Material>(mpath) : null;
    const gradeBand = bottle.getGradeBand();
    // Captured for the demonstration-capture trail (empty for a scripted
    // dispatch — only a hand-typed build accumulates a transcript).
    const commandText = context.commandText;

    this.engageStep(context, {
      durationMs: this.paceMs(POUR_MS, vessel, ["shaker", "mixing-glass", "pot"]),
      beginSelf: Mml.compose`You start pouring ${Mml.thing(bottle)} into ${Mml.thing(vessel)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts pouring ${Mml.thing(bottle)} into ${Mml.thing(vessel)}.`,
      onComplete: () => {
        // ⚠ Read the spoilage BEFORE the draw — a full drain clears the
        // source's payload, and the gauge rides the payload.
        const freshnessLoad = slot.getFreshnessLoad();
        const result = BulkableApi.transfer(slot, null, {
          kind: "measure",
          litres: STANDARD_POUR_L,
          mode: "lenient",
        });
        if (result.applied <= EPS) {
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(Mml.compose`${Mml.thing(bottle)} is empty — nothing pours.`)
            .send();
          return;
        }
        vessel.addContribution({
          // The material's authored tags are the vocabulary a recipe slot
          // matches on — never a keyword or the display name.
          tags: material ? [...material.getTags()] : [],
          measureL: result.applied,
          gradeBand,
          materialPath: material?.getTemplatePath() ?? undefined,
          freshnessLoad,
        });
        vessel.recordCommand(commandText);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You pour ${Mml.thing(bottle)} into ${Mml.thing(vessel)}.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} pours ${Mml.thing(bottle)} into ${Mml.thing(vessel)}.`)
          .send();
      },
    });
  }

  /**
   * The discrete-ingredient step: an engaged `add` that — at completion —
   * consumes the ingredient whole (`StuffApi.destruct`, chattel released
   * by the shipped path) and banks an item-contribution (category by
   * tags, grade or `fair`, a glob's stack as its count).
   */
  private addIngredient(
    context: CommandContext,
    ingredient: Stuff,
    vessel: Stuff,
  ): void {
    if (!MixinApi.isBuildVessel(vessel) || !MixinApi.isTangible(ingredient)) {
      return;
    }
    const giver = context.commandGiver;
    const material = ingredient.getMaterial()!;
    const build = vessel;
    const commandText = context.commandText;
    this.engageStep(context, {
      durationMs: this.paceMs(POUR_MS, vessel, ["shaker", "mixing-glass", "pot"]),
      beginSelf: Mml.compose`You start adding ${Mml.thing(ingredient)} to ${Mml.thing(vessel)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} adds ${Mml.thing(ingredient)} to ${Mml.thing(vessel)}.`,
      onComplete: () => {
        if (ingredient.isDestroyed()) return; // gone mid-step — nothing to add
        build.addContribution({
          measureL: 0,
          gradeBand: MixinApi.isGraded(ingredient)
            ? ingredient.getGradeBand()
            : "fair",
          kind: "item",
          count: MixinApi.isGlobbable(ingredient)
            ? ingredient.getQuantity()
            : 1,
          tags: [...material.getTags()],
          materialPath: material.getTemplatePath() ?? undefined,
          freshnessLoad: MixinApi.isFresh(ingredient)
            ? ingredient.getMicrobialLoad()
            : 0,
        });
        build.recordCommand(commandText);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You add ${Mml.thing(ingredient)} to ${Mml.thing(vessel)}.`)
          .send();
        StuffApi.destruct(ingredient);
      },
    });
  }
}

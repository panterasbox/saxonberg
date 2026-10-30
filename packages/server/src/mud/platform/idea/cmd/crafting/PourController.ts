/**
 * PourController — `pour <spirit> into <shaker>` / `add <spirit>` (the
 * manual-build intake).
 *
 * Resolves the spirit's reachable graded bottle and a build vessel (the
 * shaker / mixing glass), then runs an engaged step that — **at
 * completion** — debits ONE SERVING of what is poured off the bottle (to
 * the discard sink, conservation, exactly as
 * `CraftingLogic.consumeBulkInputs` does) and banks a graded contribution
 * into the vessel's build buffer.
 *
 * ⭐ A pour is one serving (ceramics re-plan R1-D4): the material's own
 * `servingKg` at its density — gin 60 ml, dry vermouth 10 ml, bitters
 * 2 ml — so the jigger is the row's and a new spirit needs no code; three
 * pours of sweet vermouth is a negroni's measure, and the arithmetic is
 * the play. `--amount` measures instead, the bulk pour's own option.
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
import { MaterialApi } from "../../../../api/material";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { StuffApi } from "../../../../api/stuff";
import { Contamination } from '../../../../lib/material/Contaminable';
import { Freshness } from "../../../../lib/material/Freshness";

const TOPIC = "act.deed";
const POUR_MS = 3000;
const EPS = 1e-9;

interface PourModel extends CommandModel {
  spirit: MqlOneResult;
  vessel?: MqlOneResult;
  /** `--amount 30ml` — how much to pour. Absent ⇒ one serving. */
  amount?: string;
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
      model.vessel?.stuff ?? null;
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
        // ⭐ Matter, not mark (farming A4's rule, found again by the dairy
        // drive): a `Provision` is Crafted — it carries a maker — so this
        // guard, written before provisions were, refused every food item
        // and no by-hand dish could take roots. A crafted thing is an
        // ingredient when it is FOOD; a finished tool or good is not.
        (!MixinApi.isCrafted(bottle) || bottle.getMaterial()!.getEdibility())
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

    const slot = BulkableApi.slotFor(bottle, model.spirit.via);
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
    // One serving of what is in the bottle, unless the hand measures (a
    // row with no density measures as water). An empty bottle names no
    // material and pours nothing either way.
    const density = material?.getDensity().rawValue() ?? 0;
    const servingL = material
      ? (MaterialApi.servingKgOf(material) / (density > 0 ? density : 1000)) * 1000
      : 0;
    const measure = BulkableApi.amountFromOption(model.amount, {
      kind: "measure",
      litres: servingL,
      mode: "lenient",
    });
    // Captured for the demonstration-capture trail (empty for a scripted
    // dispatch — only a hand-typed build accumulates a transcript).
    const commandText = context.commandText;

    this.engageStep(context, {
      durationMs: this.paceMs(POUR_MS, vessel, ["shaker", "mixing-glass", "pot"]),
      effortW: 150,
      beginSelf: Mml.compose`You start pouring ${Mml.thing(bottle)} into ${Mml.thing(vessel)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts pouring ${Mml.thing(bottle)} into ${Mml.thing(vessel)}.`,
      onComplete: () => {
        // ⚠ Read the spoilage BEFORE the draw — a full drain clears the
        // source's payload, and the gauge rides the payload.
        const freshnessLoad = new Freshness(slot).load();
        const pathogenLoads = new Contamination(slot).loads();
        // ⭐ …and what the source was MADE OF, for the same reason and at
        // the same moment: a blend poured from a blend must arrive at the
        // mint knowing its ingredients, or the by-hand route silently
        // flattens them into the source's own name.
        const sourceMakeup = slot.getPayload()?.makeup;
        const result = BulkableApi.transfer(slot, null, measure);
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
          pathogenLoads,
          makeup: sourceMakeup,
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
   * tags, grade or `fair`, a stack's stack as its count).
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
      effortW: 150,
      beginSelf: Mml.compose`You start adding ${Mml.thing(ingredient)} to ${Mml.thing(vessel)}.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} adds ${Mml.thing(ingredient)} to ${Mml.thing(vessel)}.`,
      onComplete: () => {
        if (ingredient.isDestroyed()) return; // gone mid-step — nothing to add
        const count = MixinApi.isStackable(ingredient)
          ? ingredient.getQuantity()
          : 1;
        build.addContribution({
          measureL: 0,
          gradeBand: MixinApi.isGraded(ingredient)
            ? ingredient.getGradeBand()
            : "fair",
          kind: "item",
          count,
          // Every unit's mass — `getMass()` is one unit's.
          massKg: ingredient.getMass().rawValue() * count,
          tags: [...material.getTags()],
          materialPath: material.getTemplatePath() ?? undefined,
          pathogenLoads: MixinApi.isContaminable(ingredient)
            ? ingredient.getPathogenLoads()
            : {},
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

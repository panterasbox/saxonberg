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

import { CommandController } from "../../../../lib/command/CommandController";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { BulkableApi } from "../../../../api/bulk";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import { Mml } from "../../../../api/mml";
import { METABOLIC_DEFAULTS } from "../../../../lib/metabolism/Metabolic";
import { Freshness } from "../../../../lib/material/Freshness";
import {
  UTENSIL_KINDS,
  UTENSIL_PHRASE,
  type UtensilKind,
} from "../../../../lib/bulk/Utensil";

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

    // ⭐ A cooked meal is a bulk blend in a claimed dish, so `eat stew`
    // targets the BOWL. Serve from the slot rather than swallowing the
    // crockery — the two arms of the verb, one act.
    if (this.isServedDish(target)) {
      return this.eatFromDish(target, context);
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
    // ⭐ The discrete half of the spoilage reach: a solid item carries its
    // gauge on its own `FreshnessMixin` fields rather than on a blend
    // payload, so the dose is folded into a TRANSIENT payload here — the
    // same `withDose` the bulk slot's `getIngestPayload` uses, so a bowl
    // of stew and the roast it came from poison by identical arithmetic.
    const load = MixinApi.isFresh(target) ? target.getMicrobialLoad() : 0;
    const payload = Freshness.withDose(null, material, load);
    const accepted = BulkableApi.ingestSolid(giver, material, portion, payload);

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
    // ⭐ Cutlery READS, it never gates. A clean utensil in reach is used
    // and dirtied — which is what puts it in the same wash loop as the
    // crockery — and its absence changes the sentence, not the outcome.
    const utensil = this.claimUtensil(giver);
    const withIt = utensil ? ` ${UTENSIL_PHRASE[utensil.kind]}` : "";
    // Emit the scene while the item still exists, then consume it.
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        utensil
          ? Mml.compose`You eat the ${appearance}${withIt}.`
          : Mml.compose`You eat the ${appearance} with your fingers.`,
      )
      .toPeers(
        utensil
          ? Mml.compose`${Mml.actor(giver)} eats ${Mml.thing(target)}${withIt}.`
          : Mml.compose`${Mml.actor(giver)} eats ${Mml.thing(target)} with their fingers.`,
      )
      .send();
    await StuffApi.destruct(target);
  }

  /** A vessel holding edible matter — a bowl of stew, a plate of roast. */
  private isServedDish(target: Stuff): boolean {
    if (!MixinApi.isBulkable(target) || !target.hasInteriorBulk()) return false;
    if (target.isBulkEmpty("interior")) return false;
    const payload = target.getBulkPayload("interior");
    if (payload) return payload.edible === true;
    return target.getBulkMaterial("interior")?.getEdibility() === true;
  }

  /**
   * Eat a portion out of a dish. The bulk sibling of the discrete arm —
   * same solid intake, same spoilage fold (through the slot's own
   * `getIngestPayload`), and the dish is EMPTIED rather than destroyed,
   * because a bowl you have finished is a bowl to wash, not a bowl that
   * has ceased to exist.
   */
  private async eatFromDish(
    target: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const slot = BulkableApi.slotFor(target, undefined);
    if (!slot) return;
    const material = slot.getMaterial();
    const payload = slot.getIngestPayload();
    const appearance =
      payload?.appearance ?? material?.getAppearance() ?? "it";
    const portion = Math.min(
      METABOLIC_DEFAULTS.EAT_PORTION_LITRES,
      slot.getAmount().rawValue(),
    );
    const accepted = BulkableApi.ingestSolid(giver, material, portion, payload);
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
    const utensil = this.claimUtensil(giver);
    const withIt = utensil ? ` ${UTENSIL_PHRASE[utensil.kind]}` : "";
    MessageApi.scene(giver)
      .topic(TOPIC)
      // ⚠ No article: a blend's authored appearance carries its own
      // ("a thick brown stew…"), where a Material's does not. The
      // discrete arm below keeps `the`. Live drive read "You eat the a
      // thick brown stew".
      .toSelf(
        utensil
          ? Mml.compose`You eat ${appearance}${withIt}.`
          : Mml.compose`You eat ${appearance} with your fingers.`,
      )
      .toPeers(
        utensil
          ? Mml.compose`${Mml.actor(giver)} eats from ${Mml.thing(target)}${withIt}.`
          : Mml.compose`${Mml.actor(giver)} eats from ${Mml.thing(target)} with their fingers.`,
      )
      .send();
    BulkableApi.transfer(slot, null, {
      kind: "measure",
      litres: accepted,
      mode: "lenient",
    });
  }

  /**
   * The first clean utensil in reach — held kit first, then the table.
   * Soils it on the way out (a used spoon is washed like a used bowl).
   * `null` when there is none, which is a perfectly good way to eat.
   */
  private claimUtensil(
    eater: CommandContext["commandGiver"],
  ): { kind: UtensilKind } | null {
    const self = eater as unknown as Stuff;
    const reach: Stuff[] = [];
    if (MixinApi.isContainer(self)) reach.push(...self.getContents());
    if (MixinApi.isContainable(self)) {
      const here = self.getContainer();
      if (here && MixinApi.isContainer(here)) reach.push(...here.getContents());
    }
    for (const kind of UTENSIL_KINDS) {
      for (const candidate of reach) {
        if (!MixinApi.isBulkable(candidate)) continue;
        if (candidate.getCategory() !== kind) continue;
        const vessel = candidate as unknown as Partial<{
          isClaimable(): boolean;
          soil(): void;
        }>;
        if (typeof vessel.isClaimable === "function" && !vessel.isClaimable()) {
          continue;
        }
        if (typeof vessel.soil === "function") vessel.soil();
        return { kind };
      }
    }
    return null;
  }
}

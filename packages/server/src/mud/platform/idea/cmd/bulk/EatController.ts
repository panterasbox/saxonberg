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
import type Material from "../../../../lib/material/Material";
import type { BulkPayload } from "../../../../lib/bulk/Bulkable";
import { BulkableApi } from "../../../../api/bulk";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { StuffApi } from "../../../../api/stuff";
import { Mml } from "../../../../api/mml";
import { METABOLIC_DEFAULTS } from "../../../../lib/metabolism/Metabolic";
import { Freshness } from "../../../../lib/material/Freshness";
import { Contamination } from "../../../../lib/material/Contaminable";
import { BlendLabel } from "../../../../lib/metabolism/BlendLabel";
import { BlendIdentity } from "../../../../lib/craft/BlendIdentity";
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
    const payload = this.ingestPayloadFor(target, material);
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

  /**
   * ⚠⚠ **The discrete arm of the ingest bridge — every route from a solid
   * item into a body passes through here.**
   *
   * A dish carries its per-instance facts on a stored `BulkPayload` and
   * `Freshness.ingestPayloadOf` hands them over whole. A discrete item has
   * no payload at all: its facts live on its own mixins, and the payload
   * is SYNTHESIZED here so a bowl of stew and the roast it came from
   * poison — and attribute — by identical arithmetic.
   *
   * ⚠ Anything a discrete item knows that must reach the mouth has to be
   * copied across this line, and a fact that isn't fails **silently and
   * completely**: the suite stays green, the food is bad, the eater is
   * fine. Three are carried today — the spoilage dose the microbial load
   * has earned, the pathogen loads (with any formed toxin they have
   * already made), and the maker, without which harm from a meal can name
   * nobody.
   */
  private ingestPayloadFor(
    target: Stuff,
    material: Material,
  ): BulkPayload | null {
    const load = MixinApi.isFresh(target) ? target.getMicrobialLoad() : 0;
    let payload = Freshness.withDose(null, material, load);
    const maker = MixinApi.isCrafted(target) ? target.getMaker() : "";
    if (maker) payload = { ...(payload ?? {}), maker };
    const pathogens = MixinApi.isContaminable(target)
      ? target.getPathogenLoads()
      : {};
    return Contamination.withLoads(payload, pathogens);
  }

  /** A vessel holding edible matter — a bowl of stew, a plate of roast. */
  private isServedDish(target: Stuff): boolean {
    if (!MixinApi.isBulkable(target) || !target.hasInteriorBulk()) return false;
    if (target.isBulkEmpty("interior")) return false;
    return BlendLabel.isEdible(
      target.getBulkPayload("interior"),
      target.getBulkMaterial("interior"),
    );
  }

  /**
   * Eat a portion out of a dish. The bulk sibling of the discrete arm —
   * same solid intake, same spoilage fold (through the slot's own
   * `Freshness.ingestPayloadOf`), and the dish is EMPTIED rather than destroyed,
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
    const payload = Freshness.ingestPayloadOf(slot);
    const appearance =
      BlendIdentity.appearanceOf(payload, material) || "it";
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
    // ⭐ Found by what it IS. This asked `isBulkable` and then matched
    // the vessel `category`, because the utensil kind used to live on the
    // bulk mixin — which is the whole reason a spoon had to be a vessel.
    // It also duck-typed `isClaimable`/`soil` off a `Partial<{…}>`, which
    // is the same tell one level down: a concept with no home.
    for (const kind of UTENSIL_KINDS) {
      for (const candidate of reach) {
        if (!MixinApi.isCutlery(candidate)) continue;
        if (candidate.getUtensilKind() !== kind) continue;
        if (!MixinApi.isServiceable(candidate)) continue;
        if (!candidate.isClaimable()) continue;
        candidate.soil();
        return { kind };
      }
    }
    return null;
  }
}

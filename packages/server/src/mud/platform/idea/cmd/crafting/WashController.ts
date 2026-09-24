/**
 * WashController — `wash <thing>` (clean a thing at water), and bare
 * `wash` (wash your own hands).
 *
 * One verb, one act: apply reachable **water** to clean a thing. A named
 * target dispatches on what it IS — serviceware gives up its dregs and
 * returns to the pool, a contamination carrier gives up its surface
 * grime, a dyed garment sheds colour — each an engaged step (~3 s) at
 * any bulk holder whose matter is water (the basin, the tap, a jug).
 *
 * ⭐ **Bare `wash` washes your hands** — the recovery build's `scrub`,
 * folded in (D10). It has no object arg because the hands are always
 * your own body, so a null target simply routes here; nothing was
 * widened. (`rinse` takes a body ARG and so could not fold in — see
 * `RinseController`'s header and `WaterFixture`.)
 *
 * Afforded by the water source: `WaterFixture`'s `peers` bucket, so you
 * learn `wash` by standing at a sink.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlManyResult, MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Hygiene } from "../../../../lib/vitals/Hygiene";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { BulkableApi } from "../../../../api/bulk";

const TOPIC = "act.deed";
const WASH_MS = 3000;

interface WashModel extends CommandModel {
  target?: MqlOneResult;
  water?: MqlManyResult;
}

export default class WashController extends ManualBuildController<WashModel> {
  execute(model: WashModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const glass = model.target?.stuff ?? null;
    // ⭐ Bare `wash` (no thing named) = wash your own HANDS. The medic's
    // old `scrub`, folded in: hygiene has no object arg, so nothing was
    // widened to get here — a null target simply means "your hands".
    if (glass === null) {
      this.washHands(model.water, context);
      return;
    }
    // ⭐ **Washing is not a glassware verb.** It was `instanceof
    // CraftVessel`, which is why a knife could not be washed at all — and
    // a knife is the one implement in the kitchen that most needs it, the
    // whole counterplay to cross-contamination. Anything that gets
    // SOILED or gets DIRTY can be washed; the two are separate facts and
    // a target may be either or both.
    const serviceable =
      glass !== null && MixinApi.isServiceable(glass) ? glass : null;
    const contaminable =
      glass !== null && MixinApi.isContaminable(glass) ? glass : null;
    // ⚠⚠ AND A THIRD FACT, which the textiles build added: TWO CONCEPTS
    // SHARE THE WORD "washed" and they must not be folded together.
    // Soil and contamination are *is this claimable / is it dirty* —
    // binary by necessity. What laundering does to a garment is *how
    // much colour is still bound*, which is continuous and is where the
    // dyer's craft is measured. A dyed thing that is neither serviceware
    // nor a contamination carrier is a garment, and takes that path.
    const dyed = glass !== null && MixinApi.isDyed(glass) ? glass : null;
    if (dyed !== null && serviceable === null && contaminable === null) {
      return this.launderGarment(dyed, model.water, context);
    }
    if (serviceable === null && contaminable === null) {
      this.declineStep(
        context,
        Mml.compose`You can't wash ${Mml.thing(glass)} clean.`,
        "not-washable",
      );
      return;
    }
    const water = this.findWater(model.water);
    if (!water) {
      this.declineStep(
        context,
        Mml.compose`There's no water here to wash ${Mml.thing(glass)} in.`,
        "no-water",
      );
      return;
    }

    this.engageStep(context, {
      durationMs: WASH_MS,
      effortW: 200,
      beginSelf: Mml.compose`You take ${Mml.thing(glass)} to ${Mml.thing(water)}.`,
      onComplete: () => {
        // The serviceware half: dregs out, garnish out, ice tipped, the
        // soil mark cleared so the pool will claim it again.
        serviceable?.wash();
        // ⭐⭐ The contamination half, and it is the counterplay the whole
        // build turns on. ⚠ It clears the SURFACE and never the contents:
        // washing a pot of bad stew is not a cure for the stew. (On a
        // `CraftVessel` the serviceware wash has already tipped the dregs,
        // so the ordering is not load-bearing — but the two acts are
        // different and the comment is what keeps them apart.)
        contaminable?.clearContamination();
        // ⚠ A dyed apron is serviceware AND cloth. It took this branch
        // for the soil, so the colour half is folded in here rather than
        // silently skipped — the fade is the same either way, only the
        // line the player reads differs.
        dyed?.launder();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You wash ${Mml.thing(glass)} clean.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} washes ${Mml.thing(glass)}.`)
          .send();
      },
    });
  }

  /**
   * ⭐ **Bare `wash` = wash your own hands** (the recovery build's `scrub`,
   * folded in — D10). Clean hands treat a wound without seeding sepsis;
   * handling a bleeding wound dirties them. Resets the body's `washedAt`
   * stamp so its cleanliness reads full again. Needs water in reach, the
   * same precondition as every other `wash` path.
   */
  private washHands(
    bound: MqlManyResult | undefined,
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    if (!MixinApi.isHygiene(giver)) {
      this.declineStep(context, Mml.compose`Wash what?`, "no-hands");
      return;
    }
    const water = this.findWater(bound);
    if (!water) {
      this.declineStep(
        context,
        Mml.compose`There's no water here to wash your hands in.`,
        "no-water",
      );
      return;
    }
    this.engageStep(context, {
      durationMs: WASH_MS,
      effortW: 200,
      beginSelf: Mml.compose`You step to ${Mml.thing(water)} to wash your hands.`,
      onComplete: () => {
        (giver as Stuff & Hygiene).scrub();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You scrub your hands clean under the water.`)
          .toPeers(
            Mml.compose`${Mml.actor(giver)} scrubs their hands clean.`,
          )
          .send();
      },
    });
  }

  /**
   * `wash <garment>` — one trip through the tub.
   *
   * ⭐ **This is where the dyer's craft is measured.** Each wash strips
   * colour in proportion to `1 − fastness`, so an un-mordanted piece
   * comes out of the first launder pale and a well-mordanted one
   * survives many. Competence in dyeing buys fastness and
   * repeatability; it never buys a brighter colour, and this is what
   * makes that a mechanic rather than a claim.
   *
   * ⚠ Water is a **precondition, never a consumable** — the same rule
   * the vessel branch follows, and the reason there is no laundry
   * vocation: the care loop is not an errand per wash.
   */
  private launderGarment(
    garment: Stuff,
    bound: MqlManyResult | undefined,
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    const water = this.findWater(bound);
    if (!water) {
      this.declineStep(
        context,
        Mml.compose`There's no water here to wash ${Mml.thing(garment)} in.`,
        "no-water",
      );
      return;
    }
    if (!MixinApi.isDyed(garment)) return;
    const before = garment.getColorTag();
    this.engageStep(context, {
      durationMs: WASH_MS,
      effortW: 200,
      beginSelf: Mml.compose`You take ${Mml.thing(garment)} to ${Mml.thing(water)}.`,
      onComplete: () => {
        if (!MixinApi.isDyed(garment)) return;
        const changed = garment.launder();
        const after = garment.getColorTag();
        const line =
          before && !after
            ? Mml.compose`The colour goes out of ${Mml.thing(garment)} entirely.`
            : changed
              ? Mml.compose`You wash ${Mml.thing(garment)}. Some of the colour comes away with the water.`
              : Mml.compose`You wash ${Mml.thing(garment)} clean.`;
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(line)
          .toPeers(Mml.compose`${Mml.actor(giver)} washes ${Mml.thing(garment)}.`)
          .send();
      },
    });
  }

  /**
   * A reachable bulk holder of water — held, then in the room (the
   * two-leg reach the tool finder uses).
   *
   * ⭐ Water is the Material's **`water` tag** and nothing else. This
   * once also matched the keyword and the display name, which is how it
   * worked at all: the water row carried no `water` tag, so the identity
   * branch never fired and the string match was load-bearing. Keywords
   * are the command line's tokens and say nothing about what a thing IS
   * — see docs/antipatterns.md § Keywords Where You Mean Identity.
   */
  private findWater(bound: MqlManyResult | undefined): Stuff | null {
    // ⭐ A NARROWING, not a search: `wash.yaml` declares `water` with a
    // `[mixin.BulkableMixin]` default, so what arrives is every reachable
    // vessel and the only question left is what is IN it — contents,
    // which no predicate asks (`lint:instrument-args`).
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isBulkable(c) || MixinApi.isCrafted(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      if (!m) continue;
      if (m.hasTag("water")) return c;
    }
    return null;
  }
}

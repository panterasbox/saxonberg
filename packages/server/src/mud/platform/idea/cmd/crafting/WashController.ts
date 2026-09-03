/**
 * WashController — `wash <glass>` (return a used glass to the pool).
 *
 * The bussing beat's last step. An engaged step (~3 s) that needs a
 * reachable **water source** — any bulk holder in reach whose matter is
 * water (the basin, the tap, a jug) — and then the vessel washes itself:
 * the residue to the discard sink, whatever was left in the glass (the
 * olive) thrown out, the ice tipped, the soil mark cleared so the pool
 * will claim it again.
 *
 * Afforded by the water source (`UnboundedReceptacle`'s environment
 * contributions), the same pattern as the `Menu`'s `order`.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { BulkableApi } from "../../../../api/bulk";
import CraftVessel from "../../../thing/CraftVessel";

const TOPIC = "act.deed";
const WASH_MS = 3000;

interface WashModel extends CommandModel {
  glass: MqlOneResult;
}

export default class WashController extends ManualBuildController<WashModel> {
  execute(model: WashModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const glass = model.glass?.stuff ?? null;
    // ⚠⚠ TWO CONCEPTS SHARE THE WORD "washed", and they must not be
    // folded together. `CraftVessel.soiled` is *is this glass claimable
    // for a fill* — binary by necessity, owned by crafting. What
    // laundering does to a garment is *how much colour is still bound*.
    // The vessel branch is untouched; a garment takes the other one.
    if (!(glass instanceof CraftVessel)) {
      if (glass && MixinApi.isDyed(glass)) {
        return this.launderGarment(glass, context);
      }
      this.declineStep(context, Mml.compose`Wash what?`, "no-glass");
      return;
    }
    const water = this.findWater(giver);
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
      beginSelf: Mml.compose`You take ${Mml.thing(glass)} to ${Mml.thing(water)}.`,
      onComplete: () => {
        glass.wash();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You wash ${Mml.thing(glass)} clean.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} washes ${Mml.thing(glass)}.`)
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
  private launderGarment(garment: Stuff, context: CommandContext): void {
    const giver = context.commandGiver;
    const water = this.findWater(giver);
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
  private findWater(giver: Stuff): Stuff | null {
    const candidates: Stuff[] = [];
    if (MixinApi.isContainer(giver)) candidates.push(...giver.getContents());
    if (MixinApi.isContainable(giver)) {
      const loc = giver.getContainer();
      if (loc && MixinApi.isContainer(loc)) candidates.push(...loc.getContents());
    }
    for (const c of candidates) {
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

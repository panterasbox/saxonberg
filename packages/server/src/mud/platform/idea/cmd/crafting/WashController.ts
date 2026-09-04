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

const TOPIC = "act.deed";
const WASH_MS = 3000;

interface WashModel extends CommandModel {
  glass: MqlOneResult;
}

export default class WashController extends ManualBuildController<WashModel> {
  execute(model: WashModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const glass = model.glass?.stuff ?? null;
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
    if (glass === null || (serviceable === null && contaminable === null)) {
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
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You wash ${Mml.thing(glass)} clean.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} washes ${Mml.thing(glass)}.`)
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

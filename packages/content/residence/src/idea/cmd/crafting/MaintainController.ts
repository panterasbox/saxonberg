/**
 * MaintainController — `maintain [<building>]`: put a morning's work into
 * the FABRIC of a building — the one you are in, or one whose outside you
 * stand at (residences D4/D5; paint build D13).
 *
 * The one act on the other side of the weathering clock. A building's
 * fabric — its `Durable` condition — wears once its coat is gone (the
 * weather walk on its face, `Faced.reconcileWeather`); this is
 * what reverses it, and it costs exactly what upkeep costs in life: a
 * tool, some wear on the tool, and somebody's attention. ⭐ It mends sills
 * and putty and nothing else: laying a coat is `paint`'s.
 *
 * Three checks, in the order a person would ask them:
 *
 *   1. **Am I somewhere maintainable?** A building with a shell — the one
 *      this room is part of, or the one named from its landing. A public
 *      street has no fabric to keep.
 *   2. **Do I have the kit?** A carried tool offering the `upkeep`
 *      capability. Conferred by the tool, which is also what makes the
 *      verb visible at all; a person with no kit never sees it.
 *   3. **Is there anything to do?** A sound shell is told so and the
 *      kit is spared.
 *
 * ⭐ **Anybody may do this.** The tenure TERM says who *owes* the
 * upkeep, and that is a different question with a different answer
 * surface (`survey`). A tenant who paints their landlord's window
 * frames has painted them; a stranger who does it has done the
 * neighbourhood a favour. Refusing that would be modelling permission
 * where the world models work.
 */

import { CommandController } from "@saxonberg/server/mud/lib/command/CommandController";
import type {
  CommandContext,
  CommandModel,
} from "@saxonberg/server/mud/api/command";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Tooled } from "@saxonberg/server/mud/lib/craft/Tooled";
import type { Durable } from "@saxonberg/server/mud/lib/material/Durable";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { NavigationApi } from "@saxonberg/server/mud/api/navigation";
import HoldingWarren from "../../HoldingWarren";
import type { Faced } from "@saxonberg/server/mud/lib/material/Faced";
import StructureBase from "@saxonberg/server/mud/lib/structure/Structure";

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface MaintainModel extends CommandModel {
  kit?: MqlOneResult;
  target?: MqlOneResult;
}


/** The capability a tool must offer to count as a householder's kit. */
const UPKEEP = "upkeep";

/** Wear per maintenance beat — a season of upkeep costs a kit. */
const KIT_WEAR = 0.08;

/** Below this an outside coat reads as going — the platform's `structure.coat.thinM` default. */
const COAT_THIN_M = 0.00001;

/** A BUILDING with an outside and a condition — what there is to keep up (a chair is `repair`'s). */
function kept(s: Stuff): s is Stuff & Faced & Durable {
  return s instanceof StructureBase && MixinApi.isFaced(s) && MixinApi.isDurable(s);
}

export default class MaintainController extends CommandController {
  async execute(model: MaintainModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const room = context.location;

    const building = await this.buildingOf(model.target?.stuff ?? null, room);
    if (!building) {
      context.note({
        kind: "controller-rejected",
        reason: "nothing-to-maintain",
        detail: "no building here",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          Mml.compose`This isn't anybody's to keep up — there's no house here, only somewhere to be.`,
        )
        .send();
      return;
    }

    const kit = this.kitOf(model.kit?.stuff);
    if (!kit) {
      context.note({
        kind: "controller-rejected",
        reason: "no-upkeep-tool",
        detail: "no kit in hand",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          Mml.compose`You'd need a householder's kit in your hands to do anything about it.`,
        )
        .send();
      return;
    }

    const before = building.getConditionWord();
    if (before === "sound") {
      const coatWanting = building.coatGone() || building.coatThin(COAT_THIN_M);
      context.note({
        kind: "controller-rejected",
        reason: coatWanting ? "coat-not-fabric" : "already-sound",
        detail: coatWanting ? "the coat wants paint, not the kit" : "nothing needs doing",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          coatWanting
            ? Mml.compose`The sills and putty are sound. What it wants is a coat of paint, and that is a brush's work, not the kit's.`
            : Mml.compose`You look the place over and find nothing that needs doing. Put the kit down.`,
        )
        .send();
      return;
    }

    building.setCondition(1);
    if (MixinApi.isDurable(kit as Stuff)) {
      (kit as unknown as Durable).wear(KIT_WEAR);
    }

    MessageApi.scene(actor)
      .topic("sense.survey")
      .toSelf(
        Mml.compose`You work the fabric over — putty into the seams, a sill made good, a nail where a nail was wanted. It was ${Mml.text(before)}; it is sound again.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(actor)} works over the fabric of the place with a householder's kit.`,
      )
      .send();
  }

  /**
   * The building to keep up: one named from its landing (it entered the
   * room's pool there), else the building this room is part of.
   */
  private async buildingOf(
    named: Stuff | null,
    room: Stuff | null | undefined,
  ): Promise<(Stuff & Faced & Durable) | null> {
    if (named !== null && named !== room) return kept(named) ? named : null;
    if (!room) return null;
    // A holding's room: the holding knows its house (its own, or the
    // building row it stands in).
    if (MixinApi.isWarrenMember(room)) {
      const warren = room.getWarren();
      if (warren instanceof HoldingWarren) {
        // The building THIS room is part of — a farmstead's barn is not its
        // house; open ground (the yard, a tract) is no building's.
        const key = room.getPlacePath();
        const house = key ? (warren as unknown as HoldingWarren).buildingOf(key) : null;
        return house !== null && kept(house) ? house : null;
      }
    }
    const path = room.getPlacePath();
    const s = path ? await NavigationApi.structureAt(path) : null;
    return s !== null && kept(s) ? s : null;
  }

  /** ⭐ The bound kit, if it offers `upkeep`. Resolved by the binder. */
  private kitOf(bound: Stuff | null | undefined): (Stuff & Tooled) | null {
    if (!bound || !MixinApi.isTool(bound)) return null;
    return bound.hasCapability(UPKEEP) ? (bound as Stuff & Tooled) : null;
  }
}

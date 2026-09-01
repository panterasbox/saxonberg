/**
 * MaintainController — `maintain`: put a morning's work into the fabric
 * of the place you are standing in (residences D4/D5).
 *
 * The one act on the other side of the weathering clock. A shell decays
 * on game time with no scheduler (`reconcileShell`); this is what
 * reverses it, and it costs exactly what upkeep costs in life: a tool,
 * some wear on the tool, and somebody's attention.
 *
 * Three checks, in the order a person would ask them:
 *
 *   1. **Am I somewhere maintainable?** The room must belong to a
 *      holding — a programme, reached through the `WarrenMember`
 *      back-ref. A public street has no shell to keep.
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
import type { Tooled } from "@saxonberg/server/mud/lib/craft/Tooled";
import type { Durable } from "@saxonberg/server/mud/lib/material/Durable";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Mml } from "@saxonberg/server/mud/api/mml";
import HoldingProgramme from "../../HoldingProgramme";

/** The capability a tool must offer to count as a householder's kit. */
const UPKEEP = "upkeep";

/** Wear per maintenance beat — a season of upkeep costs a kit. */
const KIT_WEAR = 0.08;

export default class MaintainController extends CommandController {
  execute(_model: CommandModel, context: CommandContext): void {
    const actor = context.commandGiver;
    const room = context.location;

    const programme = this.holdingOf(room);
    if (!programme) {
      context.note({
        kind: "controller-rejected",
        reason: "nothing-to-maintain",
        detail: "no holding here",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          Mml.compose`This isn't anybody's to keep up — there's no house here, only somewhere to be.`,
        )
        .send();
      return;
    }

    const kit = this.kitOf(actor);
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

    const before = programme.conditionBand();
    if (before === "sound") {
      context.note({
        kind: "controller-rejected",
        reason: "already-sound",
        detail: "nothing needs doing",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          Mml.compose`You look the place over and find nothing that needs doing. Put the kit down.`,
        )
        .send();
      return;
    }

    programme.restoreShell();
    if (MixinApi.isDurable(kit as Stuff)) {
      (kit as unknown as Durable).wear(KIT_WEAR);
    }

    MessageApi.scene(actor)
      .topic("sense.survey")
      .toSelf(
        Mml.compose`You work the place over — putty into the seams, paint where the weather has been at it, a nail where a nail was wanted. It was ${Mml.text(before)}; it is sound again.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(actor)} works over the fabric of the place with a householder's kit.`,
      )
      .send();
  }

  /** The programme whose shell this room belongs to, or null. */
  private holdingOf(room: Stuff | null | undefined): HoldingProgramme | null {
    if (!room || !MixinApi.isWarrenMember(room)) return null;
    const warren = room.getWarren();
    return warren instanceof HoldingProgramme
      ? (warren as unknown as HoldingProgramme)
      : null;
  }

  /** A carried tool offering `upkeep`. */
  private kitOf(actor: Stuff): (Stuff & Tooled) | null {
    if (!MixinApi.isContainer(actor)) return null;
    for (const item of actor.getContents()) {
      if (MixinApi.isTool(item) && item.hasCapability(UPKEEP)) {
        return item as Stuff & Tooled;
      }
    }
    return null;
  }
}

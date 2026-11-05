/**
 * MaintainController — `maintain [<building>]`: put a morning's work into
 * the FABRIC of a building — the one you are in, or one whose outside you
 * stand at (residences D4/D5; paint build D13) — or of a ship's hull
 * (harbors: re-caulking a hull is the same upkeep act as keeping a house,
 * done with a caulker's kit, and it is seamanship).
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
 *      this room is part of, or the one named from its landing — or the
 *      ship whose rooms these are. A public street has no fabric to keep.
 *      Every sentence after this one is in the fabric's own words: a
 *      house is puttied, a hull is caulked.
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
 * neighborhood a favor. Refusing that would be modeling permission
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
import BuildingBase from "@saxonberg/server/mud/lib/structure/Building";
import Ship from "@saxonberg/server/mud/platform/idea/Ship";
import type Place from "@saxonberg/server/mud/lib/stuff/Place";

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

/** What there is to keep up: a BUILDING, or a SHIP's hull (a chair is `repair`'s). */
type Fabric = BuildingBase | Ship;

function kept(s: Stuff): s is Fabric {
  return s instanceof BuildingBase || s instanceof Ship;
}

/** The words a fabric is kept in — a house's sills and putty, a hull's seams and pitch. */
interface UpkeepWords {
  kit: string;
  work: string;
  witnessed: string;
  /** The Discipline the work exercises; none for a house yet. */
  discipline?: string;
}

const HOUSE: UpkeepWords = {
  kit: "a householder's kit",
  work: "You work the fabric over — putty into the seams, a sill made good, a nail where a nail was wanted.",
  witnessed: "works over the fabric of the place with a householder's kit.",
};

const HULL: UpkeepWords = {
  kit: "a caulker's kit",
  work: "You work along her seams, paying in oakum and hot pitch wherever the weather has been at them.",
  witnessed: "works along her seams with a caulker's kit.",
  discipline: "seamanship",
};

export default class MaintainController extends CommandController {
  async execute(model: MaintainModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const room = context.location;

    const named = model.target?.stuff ?? null;
    // ⭐ Named something that is neither a building nor a ship — a peak:
    // the kit has nothing on it to mend (paint B33). Said of the thing named.
    if (named !== null && named !== room && !kept(named)) {
      context.note({
        kind: "controller-rejected",
        reason: "not-a-building",
        detail: "not a building",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          Mml.compose`${Mml.thing(named)} is not a building — there are no sills or seams on it for a kit.`,
        )
        .send();
      return;
    }

    const building = await this.buildingOf(named, room);
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

    const words = building instanceof Ship ? HULL : HOUSE;
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
          Mml.compose`You'd need ${Mml.text(words.kit)} in your hands to do anything about it.`,
        )
        .send();
      return;
    }

    const before = building.getConditionWord();
    if (before === "sound") {
      const coatWanting = !(building instanceof Ship) && (building.coatGone() || building.coatThin(COAT_THIN_M));
      context.note({
        kind: "controller-rejected",
        reason: coatWanting ? "coat-not-fabric" : "already-sound",
        detail: coatWanting ? "the coat wants paint, not the kit" : "nothing needs doing",
      });
      MessageApi.scene(actor)
        .topic("sense.survey")
        .toSelf(
          coatWanting
            ? Mml.compose`The fabric is sound. What it wants is a coat, and that is a brush's work, not the kit's.`
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
        Mml.compose`${Mml.text(words.work)} It was ${Mml.text(before)}; it is sound again.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(actor)} ${Mml.text(words.witnessed)}`,
      )
      .send();

    // ⭐ The fabric names the Discipline the work exercises:
    // caulking a hull is seamanship; keeping a house is nobody's yet.
    if (words.discipline && MixinApi.isAdvancing(actor)) {
      await actor.creditDeed({
        discipline: words.discipline,
        difficulty: "standard",
        outcome: "success",
      });
    }
  }

  /**
   * The building to keep up: one named from its landing (it entered the
   * room's pool there), else the building this room is part of.
   */
  private async buildingOf(
    named: Stuff | null,
    room: Stuff | null | undefined,
  ): Promise<Fabric | null> {
    if (named !== null && named !== room) return kept(named) ? named : null;
    if (!room) return null;
    // A ship's room: her warren says she is the ship.
    const own = room.isPlace() ? (room as unknown as Place).structureNow() : null;
    if (own instanceof Ship) return own;
    // A holding's room: the holding knows its house (its own, or the
    // building row it stands in).
    if (MixinApi.isWarrenMember(room)) {
      const warren = room.getWarren();
      if (warren instanceof HoldingWarren) {
        // The building THIS room is part of — a farmstead's barn is not its
        // house; open ground (the yard, a tract) is no building's.
        const house = warren.buildingOf(room);
        return house !== null && kept(house) ? house : null;
      }
    }
    const path = room.getIdentityPath();
    const s = path ? await NavigationApi.structureAt(path) : null;
    return s !== null && kept(s) ? s : null;
  }

  /** ⭐ The bound kit, if it offers `upkeep`. Resolved by the binder. */
  private kitOf(bound: Stuff | null | undefined): (Stuff & Tooled) | null {
    if (!bound || !MixinApi.isTool(bound)) return null;
    return bound.hasCapability(UPKEEP) ? (bound as Stuff & Tooled) : null;
  }
}

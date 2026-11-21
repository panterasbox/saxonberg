/**
 * RentController — `rent <boat> [for <n> days] [at <book>]` (the hire
 * book).
 *
 * A boat let by the day: the shed's hire book prices her kind
 * (`HireBook.rates`), the hirer pays `n × rate` to the house up front (the
 * book is the venue), and she is put on hire to them
 * (`HirableMixin.hireTo`) — in their custody, never their title. ⭐ Her hire
 * is the one record: it names the book that let her, and
 * the book writes nothing — its page reads its boats out off the boats. The hire ends when she is put down on the landing
 * she was let from (`Boat.onMoved`), so nothing here schedules anything.
 *
 * Refused, before any money moves: a thing that is not let by the day; a
 * book here that does not let her kind; a closed house; a boat that is not
 * lying in the book's room, or is out already, or is somebody else's; a
 * span that is not a whole number of days.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import HireBook from "../../../thing/HireBook";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { EmploymentApi } from "../../../../api/employment";
import { WorldClockApi } from "../../../../api/worldclock";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { MqlOneResult } from "../../../../api/mql";

const TOPIC = "act.deed";

/** A world day, seconds — what a hire is let by. */
const DAY_S = 86_400;

/** The day-counts said as words (`for a day`, `for two days`). */

interface RentModel extends CommandModel {
  boat?: MqlOneResult;
  /** The hire in game seconds, whole days (`type: duration`, `granularity: day`). */
  span?: number;
  book?: MqlOneResult;
}

export default class RentController extends CommandController<RentModel> {
  async execute(model: RentModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = model.boat?.stuff ?? null;
    if (boat === null || !MixinApi.isHirable(boat)) {
      this.reject(giver, context, Mml.compose`That is not something anybody lets by the day.`, "not-hirable");
      return;
    }
    // ⭐ Whole days, read by the view's one duration slot (D-C6).
    const days = Math.round((model.span ?? DAY_S) / DAY_S);
    const kind = boat.getTemplatePath() ?? "";
    const bound = model.book?.stuff ?? null;
    const book = bound instanceof HireBook && bound.rateFor(kind) !== null ? bound : null;
    if (book === null) {
      this.reject(giver, context, Mml.compose`Nobody here lets ${Mml.thing(boat)} by the day.`, "not-let");
      return;
    }

    // The house is brought current first, as `buy` does: a closed one lets nothing.
    const venue = book.getIdentityPath() ?? "";
    const house = await EmploymentApi.ensureOperatorAt(venue);
    if (house !== null && MixinApi.isBusiness(house) && house.isClosed()) {
      this.reject(giver, context, Mml.compose`There's nobody keeping the boats just now.`, "unattended");
      return;
    }

    // ⭐ She is let from where she lies — the book's own landing.
    const room = MixinApi.isContainable(book) ? book.getContainer() : null;
    const lies = MixinApi.isContainable(boat) ? boat.getContainer() : null;
    if (room === null || lies !== room) {
      this.reject(giver, context, Mml.compose`${Mml.thing(boat)} is not lying here to be let.`, "not-here");
      return;
    }
    if (boat.isHired()) {
      this.reject(giver, context, Mml.compose`${Mml.thing(boat)} is out on hire already.`, "out-on-hire");
      return;
    }
    // ⭐ Only the house's own boats are let: a boat somebody bought and left
    // on the shingle is theirs, not the shed's.
    const owner = MixinApi.isChattel(boat) ? boat.stampedOwner() : null;
    const housePath = house?.getIdentityPath() ?? null;
    if (owner !== null && (owner.kind === "player" || owner.kind === "organization") && owner.templatePath !== housePath) {
      this.reject(giver, context, Mml.compose`${Mml.thing(boat)} is not the house's to let.`, "not-the-houses");
      return;
    }

    const rate = book.rateFor(kind) ?? 0;
    const total = rate * days;
    const paid = await EmploymentApi.settleSale(venue, total, total, "a boat's hire");
    if (!paid) {
      this.reject(giver, context, Mml.compose`You can't cover the hire just now.`, "insufficient-funds");
      return;
    }
    const nowS = WorldClockApi.getNow().rawValue();
    const home = room.getDurableHandle() ?? room.getTemplatePath() ?? "";
    boat.hireTo(giver, nowS + days * DAY_S, home, venue);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You hire ${Mml.thing(boat)} for ${this.span(days)}. ${paid.tail} She is yours to take out; put her back down here at ${Mml.thing(room)} and the hire is done.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} hires ${Mml.thing(boat)}.`)
      .send();
  }

  private span(days: number): string {
    return days === 1 ? "a day" : `${days} days`;
  }

  private reject(
    giver: Stuff,
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: "controller-rejected", reason, detail: reason });
  }
}

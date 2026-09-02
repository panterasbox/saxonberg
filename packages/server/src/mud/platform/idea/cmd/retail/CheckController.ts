/**
 * CheckController — `check <weapon>`.
 *
 * Hand a weapon to the house's check rack: custody moves to the rack, but
 * your owner-stamp stays with you (custody ≠ ownership — the chattel
 * core), and you get a claim ticket. It rides the shared HELD-GOODS
 * custody base (`HeldGoodsMixin`) — NOT the consignment/sale layer — so a
 * checked weapon is simply held for you to `reclaim`, never brokered (a
 * coat check, not a marketplace).
 *
 * Gates: there must be a rack here; you must be carrying the thing; it
 * must be a WEAPON (the combat construction-domain predicate — a shield
 * is armor and is refused); and it must be a discrete good (a fungible
 * stack is owned-by-possession, never checked). An unstamped weapon is
 * stamped to you on check, so `reclaim` can authorize on `ownerOf`.
 *
 * No bank account, no ask, no house — this is custody, not a sale. The
 * only new verb the bar-fight build adds, afforded solely by the
 * `CheckRack` fixture's `commandContributions` (the verb exists only
 * where a rack stands).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import CheckRack from "../../../thing/CheckRack";
import Ticket from "../../../thing/Ticket";
import { ContainmentApi } from "../../../../api/containment";
import { StuffApi } from "../../../../api/stuff";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { ChattelApi } from "../../../../api/chattel";
import { CombatApi } from "../../../../api/combat";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Container } from "../../../../lib/spatial/Container";
import type { Containable } from "../../../../lib/spatial/Containable";

const TOPIC = "act.deed";

interface CheckModel extends CommandModel {
  thing: string;
}

export default class CheckController extends CommandController<CheckModel> {
  async execute(model: CheckModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const rack = CheckRack.resolveIn(context);
    if (!rack) {
      return this.reject(
        giver,
        context,
        Mml.compose`There's nowhere to check a weapon here.`,
        { kind: "empty-result", field: "thing", query: model.thing },
      );
    }

    const item = this.resolveHeld(giver, model.thing);
    if (!item) {
      return this.reject(
        giver,
        context,
        Mml.compose`You aren't carrying "${model.thing}".`,
        { kind: "controller-rejected", reason: "not-held", detail: model.thing },
      );
    }

    // A weapon, and a discrete one — a shield is armor (refused), a
    // fungible stack is owned-by-possession (never checked).
    if (!CombatApi.isWeapon(item)) {
      return this.reject(
        giver,
        context,
        Mml.compose`${Mml.thing(item)} isn't a weapon to check.`,
        { kind: "controller-rejected", reason: "not-a-weapon", detail: model.thing },
      );
    }
    if (MixinApi.isGlobbable(item)) {
      return this.reject(
        giver,
        context,
        Mml.compose`You can't check a loose stack.`,
        { kind: "controller-rejected", reason: "fungible", detail: model.thing },
      );
    }

    // Establish the owner-stamp if unstamped — reclaim authorizes on it.
    if (!item.getChattelId()) await ChattelApi.stamp(item, giver);
    const consignorKey = giver.getIdentityPath() ?? "";

    // Custody → the rack; the owner-stamp stays put. It's a plain
    // holding (no ask, no listing) — nothing to buy, only to reclaim.
    ContainmentApi.move(item, rack);
    rack.recordHolding(item.getChattelId(), consignorKey);

    // The diegetic claim: a carried ticket stamped with the rack. The
    // AUTHORITY to reclaim is the owner-stamp, not the ticket — so a lost
    // ticket never traps your weapon (it's flavor, not the key).
    const ticket = await StuffApi.create(() => new Ticket());
    ticket.pointPath = rack.getTemplatePath() ?? "";
    ticket.number = rack.countHeld(consignorKey);
    ticket.setShortDescription("a coat-check ticket");
    ContainmentApi.move(ticket as unknown as Stuff & Containable, giver as unknown as Stuff & Container);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You check ${Mml.thing(item)} at the rack and pocket the ticket.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} checks a weapon at the rack.`)
      .send();
  }

  /** Resolve a chattel good the giver is carrying, by keyword. */
  private resolveHeld(
    giver: Stuff,
    keyword: string,
  ): (Stuff & Containable & { getChattelId(): string }) | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      if (
        MixinApi.isPerceptible(item) &&
        item.hasKeyword(keyword) &&
        MixinApi.isChattel(item)
      ) {
        return item as Stuff & Containable & { getChattelId(): string };
      }
    }
    return null;
  }

  private reject(
    giver: Stuff,
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    note: Parameters<CommandContext["note"]>[0],
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note(note);
  }
}

/**
 * RackCheckController — `rack check <weapon> [from <rack>]` (the flat `check`
 * until controllers-are-io W7 — the rack's book is a subcommand of `rack`).
 *
 * Hand a weapon to the house's check rack: custody moves to the rack, but
 * your owner-stamp stays with you (custody ≠ ownership — the chattel
 * core), and you get a claim ticket. It rides the shared HELD-GOODS
 * custody base (`HeldGoodsMixin`) — NOT the consignment/sale layer — so a
 * checked weapon is simply held for you to `rack reclaim`, never brokered (a
 * coat check, not a marketplace).
 *
 * Gates: there must be a rack here; you must be carrying the thing (the
 * view). What the rack TAKES is the rack's (`accepts` — a check rack:
 * a discrete weapon), and `checkIn` does the act: an unstamped weapon is
 * stamped to you, so `reclaim` can authorize on `ownerOf`.
 *
 * No bank account, no ask, no house — this is custody, not a sale. The
 * `rack` noun is afforded solely by the `CheckRack` fixture's
 * `commandContributions` (it exists only where a rack stands).
 */

import { HeldGoodsControllerBase, TOPIC } from "./HeldGoodsControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Container } from "../../../../lib/spatial/Container";
import type { Containable } from "../../../../lib/spatial/Containable";
import type { Chattel } from '../../../../lib/chattel/Chattel';
import type { MqlOneResult } from '../../../../api/mql';
import type { RackStuff } from '../../../../lib/retail/HeldGoods';


interface CheckModel extends CommandModel {
  /** Bound by the view; addressable, defaulted to what is in reach. */
  rack?: MqlOneResult;
  /** ⭐ The good, bound by the view from your inventory. */
  thing: MqlOneResult;
}

export default class RackCheckController extends HeldGoodsControllerBase<CheckModel> {
  async execute(model: CheckModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Bound by the view, not hunted for here.
    const rack = (model.rack?.stuff ?? null) as RackStuff | null;
    if (!rack) {
      return this.reject(
        giver,
        context,
        Mml.compose`There's nowhere to check a weapon here.`,
        { kind: "empty-result", field: "thing", query: model.thing?.raw ?? "" },
      );
    }

    // ⭐ Read, never hunted. `scope: [inventory]` on the view is what
    // "you must be carrying it" means, and the binder enforces it.
    const item = (model.thing?.stuff ?? null) as
      | (Stuff & Containable & Chattel)
      | null;
    if (!item) {
      return this.reject(
        giver,
        context,
        Mml.compose`You aren't carrying "${model.thing?.raw ?? ""}".`,
        { kind: "controller-rejected", reason: "not-held", detail: model.thing?.raw ?? "" },
      );
    }

    // ⭐ The rack decides what it takes and does the check-in — the
    // owner-stamp, custody, the book and the ticket (controller-liquidity
    // W8, C61). This controller words the answer.
    const result = await rack.checkIn(item, giver as unknown as Stuff & Container);
    if (!result.ok) {
      switch (result.reason) {
        case "not-a-weapon":
          return this.reject(
            giver,
            context,
            Mml.compose`${Mml.thing(item)} isn't a weapon to check.`,
            { kind: "controller-rejected", reason: "not-a-weapon", detail: model.thing?.raw ?? "" },
          );
        case "fungible":
          return this.reject(
            giver,
            context,
            Mml.compose`You can't check a loose stack.`,
            { kind: "controller-rejected", reason: "fungible", detail: model.thing?.raw ?? "" },
          );
        default: {
          const never: never = result.reason;
          return never;
        }
      }
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You check ${Mml.thing(item)} at the rack and pocket the ticket.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} checks a weapon at the rack.`)
      .send();
  }
}

/**
 * BuyController — `buy <thing>`.
 *
 * ⭐ `buy` speaks ONE protocol (`ForSaleMixin`): the thing
 * in front of you that has something for sale. The view binds it; the
 * controller asks it which seller standing here offers the word, hands that
 * seller the whole sale, and says what it returns. Every implementer owns
 * its own sequence and returns its refusals before any money moves:
 *
 *   - **a shop counter** (`Stock`) — a shelf good, settled in full to the
 *     store's house, the demo tax remitted, the buyer **stamped**; or a
 *     priced good its house owns lying in its room (a boat on the shingle),
 *     whose title is **transferred** where she lies;
 *   - **a consignment shelf** — the consignor's ask, the remainder **split**
 *     to them (the store keeps the commission), the title **transferred**;
 *   - **the yard's hull book** — title to a hull on the stocks, named by her
 *     buyer as she is entered in the register.
 *
 * Unlike the bar, a store hands nothing over unless payment clears.
 *
 * ⭐ **The wallet's active account is the principal you trade as**
 * (`ForSale.purchaserOf`): a purchasing holder who ran `wallet use house`
 * buys for the business. No `--for`: the wallet says whom you buy for.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { MqlOneResult } from '../../../../api/mql';

const TOPIC = "act.deed";

interface BuyModel extends CommandModel {
  /** Where you are buying from — bound by the view, `from`-addressable. */
  counter?: MqlOneResult;
  thing: string;
}

export default class BuyController extends CommandController<BuyModel> {
  async execute(model: BuyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Bound by the view (`buy.yaml` § counter), not hunted for here.
    const bound = model.counter?.stuff ?? null;
    if (bound === null || !MixinApi.isForSale(bound)) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`There's nothing to buy here.`).send();
      context.note({ kind: "empty-result", field: "thing", query: model.thing });
      return;
    }
    // ⭐ No seller NAMED, and the one the default bound does not offer the
    // word: ask the others standing here. (A seller bound by the view's
    // DEFAULT carries the default's query as its raw text, or none —
    // either way, not one the player named.)
    const named = !!model.counter?.raw && !/^reachable:/.test(model.counter.raw);
    const seller = named ? bound : bound.sellerFor(model.thing);
    // ⭐ The command's own Interactive: a script never prompts (D23).
    const interactive = context.interactive;
    const out = await seller.sell({
      buyer: giver,
      word: model.thing,
      ask: interactive ? (question: string) => interactive.promptText(question) : null,
    });
    if (out.ok) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(out.self).toPeers(out.peers).send();
      return;
    }
    // ⭐ A refusal the buyer's body reported is worded here (size and
    // carrying W8); the seller words only its own half.
    const carry = out.facts?.carry;
    const line = carry !== undefined
      ? Mml.compose`${Mml.text(this.carryRefusalWords(giver, carry))} ${out.line}`
      : out.line;
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note(out.note);
  }
}

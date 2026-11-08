/**
 * EatController — `eat X`.
 *
 * The solid analog of `drink`. Targets a discrete edible item (a Stuff
 * carrying a `Material` with `edibility === true`, gated by
 * `mustBeEdible`), hands a portion to the actor's `ingest` seam as
 * **solid** intake (filling the digestion buffer's solid sub-volume),
 * and — on full acceptance — consumes the whole item. A discrete item
 * is all-or-nothing: if the stomach is too full to take the whole
 * portion, the item survives and the actor is told they're too full (a
 * half-eaten ration is out of v1 scope).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlManyResult, MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { UTENSIL_PHRASE } from "../../../../lib/bulk/Cutlery";

const TOPIC = "act.deed";

interface EatModel extends CommandModel {
  target: MqlOneResult;
  with?: MqlManyResult;
}

export default class EatController extends CommandController<EatModel> {
  async execute(model: EatModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to eat.`)
        .send();
      context.note({ kind: "empty-result", field: "target", query: model.target.raw });
      return;
    }
    if (!MixinApi.isEating(giver)) {
      return this.decline(context, Mml.compose`You can't eat.`, "not-an-eater");
    }
    // ⭐ The ACT is the eater's (`Eating.eat`): the edibility, the
    // portion, the dish arm, the utensil, the crumbs. This verb only reads
    // the request and words what happened.
    const outcome = await giver.eat(target, model.with?.stuff ?? []);
    if (!outcome.ok) {
      if (outcome.reason === "airway") {
        // The body's own words for why (under the water, you would breathe it in).
        return this.decline(context, Mml.compose`${outcome.line}`, "airway");
      }
      return outcome.reason === "too-full"
        ? this.decline(context, Mml.compose`You're too full to eat ${Mml.thing(target)}.`, "too-full")
        : this.decline(context, Mml.compose`You can't eat ${Mml.thing(target)}.`, "not-edible");
    }
    const withIt = outcome.utensil ? ` ${UTENSIL_PHRASE[outcome.utensil]}` : " with your fingers";
    const peersWith = outcome.utensil ? ` ${UTENSIL_PHRASE[outcome.utensil]}` : " with their fingers";
    // ⚠ A blend's appearance carries its own article ("a thick brown
    // stew…"), a material's does not — the live drive read "You eat the a
    // thick brown stew".
    const wentDown = EatController.wentDownLine(outcome.liking?.word, outcome.hungerHelped === true);
    const self = outcome.fromDish
      ? Mml.compose`You eat ${outcome.what}${withIt}.${wentDown}`
      : Mml.compose`You eat the ${outcome.what}${withIt}.${wentDown}`;
    const peers = outcome.fromDish
      ? Mml.compose`${Mml.actor(giver)} eats from ${Mml.thing(target)}${peersWith}.`
      : Mml.compose`${Mml.actor(giver)} eats ${outcome.foodName}${peersWith}.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(self).toPeers(peers).send();
  }

  private decline(
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: "controller-rejected", reason, detail: reason });
  }

  /** How it went down, for this person. It feeds you either way. */
  private static wentDownLine(word: string | undefined, hungerHelped: boolean): string {
    switch (word) {
      case 'revolting':
        return hungerHelped ? ' It is revolting, but you are starving and it goes down.' : ' It is revolting.';
      case 'unpleasant':
        return hungerHelped ? ' It is unpleasant, but you are hungry and it goes down.' : ' It is unpleasant.';
      case 'good':
        return ' It goes down well.';
      case 'delicious':
        return ' It is delicious.';
      default:
        return '';
    }
  }
}

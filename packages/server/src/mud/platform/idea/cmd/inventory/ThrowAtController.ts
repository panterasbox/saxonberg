/**
 * ThrowAtController — `throw <thing> at <something>`: an initiation, and it
 * routes through the combat handshake exactly as `attack` does. That is the
 * whole reason the handshake was extracted: "routes identically" has to be a
 * fact rather than a claim, and a verb that lived outside combat would otherwise
 * be a consent bypass with a friendly name.
 *
 * ⭐⭐ The arrival is the thrower's (`Combatant.deliverThrown`): a broken vessel
 * spills its real volume onto whoever is there, and the DOSE curve decides what
 * each share does. This file holds the question to a defender and the words.
 */

import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PromptCancelledError } from '../../../../api/prompt';
import { CombatApi } from '../../../../api/combat';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { TermsProposal } from '../../../../lib/combat/CombatTerms';
import type { Combatant } from '../../../../lib/combat/Combatant';
import { ThrowControllerBase, type ThrowModel } from './ThrowControllerBase';

const TOPIC = 'act.deed';

interface ThrowAtModel extends ThrowModel {
  target?: MqlOneResult;
}

export default class ThrowAtController extends ThrowControllerBase<ThrowAtModel> {
  async execute(model: ThrowAtModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;
    const item = this.heldItem(model, context);
    if (!item) return;
    const target = model.target?.stuff ?? null;
    if (target === null) {
      return this.fail(context, `You don't see any '${model.target?.raw ?? ''}' here.`, 'empty-result');
    }
    if (target === giver) {
      return this.fail(context, "You can't throw that at yourself.", 'self-target');
    }
    const thrower = giver as Stuff & Combatant;
    // ── Everyone this would touch, and whether that is allowed. ──
    const verdict = thrower.mayDeliverTo(target, CombatApi.splashSetFor(target));
    if (!verdict.ok) {
      // Refused BEFORE anything commits: nothing thrown, no poise spent, no
      // session opened. Area delivery must not be a cheaper route to a person
      // than aiming at them.
      return this.fail(
        context,
        `You can't throw that without catching ${Mml.thing(verdict.refusedBy).toString()} in it.`,
        'splash-would-catch-a-bystander',
      );
    }
    // ── Throwing at a person is starting a fight. Same door as `attack`. ──
    if (MixinApi.isVitals(target) && MixinApi.isEngaged(target)) {
      const opened = await thrower.initiateCombat(target, {}, (t, mine) =>
        ThrowAtController.resolveConflict(t, mine),
      );
      if (!opened.ok) {
        if (opened.reason === 'cancelled') return this.fail(context, 'The moment passes.', 'cancelled');
        return this.fail(context, "You can't start that fight.", opened.reason ?? 'failed');
      }
    }

    // It leaves your hand: committed only once the fight (if any) opened.
    if (!this.letGo(item, context)) return;

    // ⚠ `toTarget` requires a Sensor — and you can throw things at OBJECTS,
    // not just at people. A terminal has nothing to be told.
    const hurl = MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You hurl ${Mml.thing(item)} at ${Mml.actor(target)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} hurls ${Mml.thing(item)} at ${Mml.actor(target)}.`);
    if (MixinApi.isSensor(target)) {
      hurl.toTarget(target, Mml.compose`${Mml.actor(giver)} hurls ${Mml.thing(item)} at you!`);
    }
    hurl.send();

    const out = await thrower.deliverThrown(item, target);
    const say = (line: ReturnType<typeof Mml.compose>): void => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    };
    if (out.arrived === 'wide') say(Mml.compose`It goes wide.`);
    if (out.arrived === 'survived' && out.flawed) say(Mml.compose`It does not break — but it struck hard.`);
    if (out.arrived !== 'shattered') return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.thing(item)} shatters against ${Mml.actor(target)}.`)
      .toPeers(Mml.compose`${Mml.thing(item)} shatters against ${Mml.actor(target)}.`)
      .send();
    for (const landed of await out.spatter()) {
      say(
        landed.kind === 'report'
          ? Mml.fromMarkup(Mml.escape(landed.line))
          : Mml.compose`The ${landed.material} spatters across ${Mml.actor(landed.victim)} and begins to eat.`,
      );
    }
  }

  /** Prompt a live defender on a terms conflict — asking is the controller's
   * job, exactly as it is for `attack`. */
  private static async resolveConflict(
    target: Stuff,
    mine: TermsProposal,
  ): Promise<boolean | null | 'cancelled'> {
    if (!MixinApi.isHasInteractive(target)) return null;
    const interactive = [...target.getInteractives()][0];
    if (!interactive) return null;
    try {
      const picked = await interactive.promptChoice(
        `You are challenged to a ${mine.lethality} fight (to ${mine.stopCondition}). Accept?`,
        [
          { label: 'Accept', response: 'accept' },
          { label: 'Refuse the terms', response: 'decline' },
        ],
      );
      return picked === 'accept';
    } catch (err) {
      if (err instanceof PromptCancelledError) return 'cancelled';
      throw err;
    }
  }
}

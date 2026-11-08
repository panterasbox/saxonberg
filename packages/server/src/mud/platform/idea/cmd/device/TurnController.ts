/**
 * TurnController — `turn <thing>` / `turn back <thing>`: work a screw or a
 * handle by turning it (ceramics D25).
 *
 * ⭐ Dumb: the THING turns (`TurnableMixin`) and answers what that did, in
 * facts — a screw press bears down on the mould on its bed, and a charge
 * with green strength comes free. The words are this controller's
 * (controllers-are-io D4); nothing else is decided here.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { TurnFacts, TurnRefusal, TurnTightness } from '../../../../lib/craft/Turnable';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

/** How hard the screw is down, in words. */
const TIGHT: Record<TurnTightness, string> = {
  snug: 'snug',
  'hard-down': 'hard down',
  'as-tight': 'as tight as it will go',
};

interface TurnModel extends CommandModel {
  target?: MqlOneResult;
  subcommand?: string;
}

export default class TurnController extends CommandController<TurnModel> {
  async execute(model: TurnModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (target === null) {
      this.declineTurn(context, Mml.compose`Turn what? There is nothing like that here.`, 'no-target');
      return;
    }
    if (!MixinApi.isTurnable(target)) {
      this.declineTurn(context, Mml.compose`There is nothing to turn on ${Mml.thing(target)}.`, 'not-turnable');
      return;
    }
    const back = (model.subcommand ?? '').trim().toLowerCase() === 'back';
    const out = await target.turnBy(giver, back);
    if (!out.ok) {
      this.declineTurn(context, this.refusalWords(out, target), out.reason);
      return;
    }
    const scene = MessageApi.scene(giver).topic(TOPIC).toSelf(this.doneWords(out.facts, target));
    scene.toPeers(this.peerWords(out.facts, giver, target));
    scene.send();
  }

  /** What the room sees of a turn. */
  private peerWords(facts: TurnFacts, giver: Stuff, target: Stuff): Composed {
    switch (facts.kind) {
      case 'slackened':
        return Mml.compose`${Mml.actor(giver)} slackens off ${Mml.thing(target)}.`;
      case 'squeezed':
        return Mml.compose`${Mml.actor(giver)} turns ${Mml.thing(target)} down on a post of paper.`;
      case 'released':
      case 'pressed':
        return Mml.compose`${Mml.actor(giver)} turns ${Mml.thing(target)} down.`;
      case 'let-go':
        return Mml.compose`${Mml.actor(giver)} lets go of the jack's wheel.`;
      case 'took-wheel':
        return Mml.compose`${Mml.actor(giver)} takes the crank of the jack's wheel.`;
      default: {
        const never: never = facts;
        return never;
      }
    }
  }

  /** ⭐ The words for a refused turn (D4) — every reason, exhaustively. */
  private refusalWords(out: TurnRefusal, target: Stuff): Composed {
    switch (out.reason) {
      case 'not-turnable':
        return Mml.compose`There is nothing to turn on ${Mml.thing(target)}.`;
      case 'already-slack':
        return Mml.compose`${Mml.thing(target)} is already slack.`;
      case 'screwed-down':
        return Mml.compose`The screw will go no further — ${Mml.thing(target)} is bearing down as hard as it can.`;
      case 'not-turning':
        return Mml.compose`You are not turning ${Mml.thing(target)}.`;
      case 'already':
        return Mml.compose`You already have the wheel.`;
      case 'taken':
        return Mml.compose`${Mml.actor(out.facts.holder)} already has the wheel of ${Mml.thing(target)}.`;
      case 'out-of-reach':
        return Mml.compose`You are not at ${Mml.thing(target)}.`;
      case 'cannot':
        return Mml.compose`You cannot turn a wheel.`;
      case 'busy':
        return Mml.compose`Your hands are on something else.`;
      default: {
        const never: never = out;
        return never;
      }
    }
  }

  /** The words for what a turn did. */
  private doneWords(facts: TurnFacts, target: Stuff): Composed {
    switch (facts.kind) {
      case 'slackened':
        return Mml.compose`You spin the bar back and the platen lifts clear.`;
      case 'squeezed':
        return Mml.compose`You heave the bar round and the platen bears down on the post, ${TIGHT[facts.tight]}; water runs from ${facts.sheets === 1 ? 'the sheet' : `${facts.sheets} sheets`} and away down the bed.`;
      case 'released':
        return Mml.compose`You heave the bar round and the platen bears down, ${TIGHT[facts.tight]}. ${Mml.thing(facts.released)} takes the shape and comes free of the mould.`;
      case 'pressed':
        return facts.mould !== null
          ? Mml.compose`You heave the bar round and the platen bears down on ${Mml.thing(facts.mould)}, ${TIGHT[facts.tight]}.`
          : Mml.compose`You heave the bar round. The platen comes down on an empty bed.`;
      case 'let-go':
        return Mml.compose`You let go of the wheel of ${Mml.thing(target)}.`;
      case 'took-wheel':
        return Mml.compose`You take the crank of ${Mml.thing(target)}'s great wheel, ready to turn it for whoever lays.`;
      default: {
        const never: never = facts;
        return never;
      }
    }
  }

  private declineTurn(context: CommandContext, line: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

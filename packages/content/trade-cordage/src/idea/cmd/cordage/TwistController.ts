/**
 * TwistController — `twist <stock> [on <jack>] [--yarns n] [--length m]
 * [--mark <color>]` (cordage D5). The jack plans the twist — the stage is
 * what you twist — and answers facts; the verb engages it and words them
 * (controllers-are-io D4).
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import RopeJack, { type TwistBegin, type TwistRefusal } from '../../../thing/RopeJack';

type Composed = ReturnType<typeof Mml.compose>;

interface TwistModel extends CommandModel {
  stock?: MqlManyResult;
  jack?: MqlOneResult;
  yarns?: number;
  length?: string;
  mark?: string;
}

export default class TwistController extends ManualBuildController<TwistModel> {
  async execute(model: TwistModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const jack = model.jack?.stuff ?? null;
    if (!(jack instanceof RopeJack)) {
      this.declineStep(context, Mml.compose`You need a rope jack at the head of a walk to twist rope.`, 'no-jack');
      return;
    }
    const plan = await jack.twistPlan(actor, (model.stock?.stuff ?? []) as Stuff[], {
      yarns: typeof model.yarns === 'number' ? model.yarns : null,
      length: model.length?.toString().trim() || null,
      mark: model.mark?.trim() || null,
    });
    if (!plan.ok) {
      this.declineStep(context, TwistController.refusalWords(plan), plan.reason);
      return;
    }
    const self = jack as unknown as Stuff;
    await this.engagePlan(context, plan, {
      beginSelf: (f) => TwistController.beginWords(f, self, actor),
      beginPeers: (f) =>
        f.kind === 'strand'
          ? Mml.compose`${Mml.actor(actor)} walks yarns out down the ropewalk.`
          : Mml.compose`${Mml.actor(actor)} lays a rope down the ropewalk.`,
      onRefused: (r) => TwistController.refusalWords(r),
      onDone: (f) => ({
        self:
          f.kind === 'strand'
            ? Mml.compose`The yarns lie twisted into one strand, ${f.lengthM} m of it, hard-laid right-handed${f.mark ? `, a ${f.mark} yarn in its heart` : ''}.`
            : Mml.compose`The strands close up into a rope, laid left-handed against their own twist so it will never unlay: ${f.lengthM} m of it.`,
      }),
    });
  }

  /** The pace, in words: who has the wheel. */
  private static paceWords(hand: Stuff | null, actor: Stuff): string {
    return hand !== null ? `, ${hand.describeFor(actor)} turning the wheel` : ', turning the wheel yourself between walks';
  }

  /** What the layer reads as the twist begins. */
  private static beginWords(f: TwistBegin, jack: Stuff, actor: Stuff): Composed {
    switch (f.kind) {
      case 'strand':
        return Mml.compose`You hook ${f.yarns} yarns to the whirls of ${Mml.thing(jack)} and walk them out ${f.lengthM} m down the walk${TwistController.paceWords(f.wheelHand, actor)}.`;
      case 'rope':
        return Mml.compose`You hook ${f.strands} strands to ${Mml.thing(jack)} and walk the top down between them as the jack turns them the other way${TwistController.paceWords(f.wheelHand, actor)}.`;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** ⭐ The words for a refused twist (controllers-are-io D4) — every reason, exhaustively. */
  private static refusalWords(out: TwistRefusal): Composed {
    switch (out.reason) {
      case 'no-walk':
        return Mml.compose`A rope is laid down a walk; set the jack up at the head of one.`;
      case 'bad-length':
        return Mml.compose`"${out.facts.length}" is not a length — say it in meters, like \`--length 50\`.`;
      case 'longer-than-walk':
        return Mml.compose`The walk is ${out.facts.walkM} m long; a rope cannot be laid longer than it.`;
      case 'nothing':
        return Mml.compose`Twist what? Yarn makes a strand; strands make a rope.`;
      case 'not-twistable':
        return Mml.compose`You twist yarn into strands, and strands into rope — not that.`;
      case 'bad-yarns':
        return Mml.compose`A strand is so many yarns — a whole number of them.`;
      case 'not-enough-yarn':
        return Mml.compose`${out.facts.yarns} yarns ${out.facts.lengthM} m long want ${out.facts.skeins} skeins; you have ${out.facts.have}.`;
      case 'yarn-gone':
        return Mml.compose`The yarn is not where it was; the strand comes to nothing.`;
      case 'no-strand':
        return Mml.compose`The yarns will not take the twist.`;
      case 'too-few-strands':
        return Mml.compose`A rope is laid from three strands or more; you have ${out.facts.strands}.`;
      case 'strands-short':
        return Mml.compose`The strands are only ${out.facts.shortestM} m long.`;
      case 'strands-gone':
        return Mml.compose`A strand is not where it was; the rope comes to nothing.`;
      case 'no-rope':
        return Mml.compose`The strands will not lay up.`;
      default: {
        const never: never = out;
        return never;
      }
    }
  }
}

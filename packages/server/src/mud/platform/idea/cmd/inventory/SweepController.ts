/**
 * SweepController — `sweep [<floor|hearth>] [with <broom|brush>]`, the
 * byre's mucking out included — cleanliness D15, D18, D20.
 *
 * ⭐ One act, two hosts, one result (`SweepableMixin`, controller-liquidity
 * W7c, slimmed in W18): the FLOOR decides what a broom takes up
 * (`FloorMixin.sweepInto` — everything on an earth floor, only the debris
 * on a scrubbed one) and what it is heaped into (sweepings, or the byre's
 * muck); a flued fire, with a brush to hand, its chimney
 * (`Flued.sweepChimney`). Either way so many kg of these kinds came up,
 * and some of it is in the sweeper's hands. How long it takes is the
 * thing's. This file finds what is to hand, engages the plan and says what
 * came up.
 *
 * ⚠ A grate is RAKED (`rake`, W18) — a fire that is not flued is not
 * swept, and the refusal says so.
 *
 * ⭐ No target — or one that is not swept itself — sweeps the floor you
 * stand on: `sweep`, `sweep byre`.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { SweepBegin, SweepFacts, SweepRefusal } from '../../../../lib/cleanliness/Sweepable';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface SweepModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlManyResult;
}

export default class SweepController extends ManualBuildController<SweepModel> {
  async execute(model: SweepModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const brush = this.bestInstrument(model.tool, 'flue-brushing') !== null;
    const broom = this.bestInstrument(model.tool, 'sweeping') !== null;
    const named = model.target?.stuff ?? null;
    const room = context.location ?? null;
    const floor = room && MixinApi.isAdornable(room) ? (room.getFloor() as unknown as Stuff | null) : null;
    // A fire that is not flued has nothing to sweep (its grate is raked);
    // anything else that is not swept itself — the byre you stand in —
    // means the floor underfoot.
    const unflued = named !== null && !MixinApi.isSweepable(named) && MixinApi.isBurner(named);
    const target = named !== null && MixinApi.isSweepable(named) ? named : unflued ? null : floor;
    const plan =
      target !== null && MixinApi.isSweepable(target)
        ? target.sweepPlanFor({ actor: giver, broom, brush })
        : null;
    if (target === null || plan === null) {
      this.declineStep(
        context,
        unflued && named !== null
          ? Mml.compose`${Mml.thing(named)} has no flue to sweep. Its grate is raked — rake it.`
          : Mml.compose`There is no floor here to sweep.`,
        unflued ? 'not-sweepable' : 'no-floor',
      );
      return;
    }
    if (!plan.ok) {
      this.declineStep(context, SweepController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, SweepController.sweepWords(target, giver));
  }

  /** ⭐ The words for a sweep of `target` (D4). */
  protected static sweepWords(target: Stuff, giver: Stuff): ActWords<SweepBegin, SweepFacts, SweepRefusal> {
    return {
      beginSelf: (b) => {
        switch (b.tool) {
          case 'broom':
            return Mml.compose`You set to on ${Mml.thing(target)} with the broom.`;
          case 'brush':
            return Mml.compose`You work the brush up into ${Mml.thing(target)}, rod by rod.`;
          case 'hands':
            return Mml.compose`You get down and sweep ${Mml.thing(target)} with your hands.`;
          default: {
            const never: never = b.tool;
            return never;
          }
        }
      },
      onRefused: (r) => SweepController.refusalWords(r),
      onDone: (f) => SweepController.doneWords(f, target, giver),
    };
  }

  /** What came up, in words — a floor's and a flue's alike. */
  protected static doneWords(f: SweepFacts, target: Stuff, giver: Stuff): { self: Composed; peers?: Composed } {
    if (!(f.kg > 0.05) && f.taken.length === 0) {
      return { self: Mml.compose`You sweep ${Mml.thing(target)}, and there is nothing worth the name to take up.` };
    }
    const what = Object.keys(f.kinds).slice(0, 3).join(', ');
    const of = what ? ` of ${what}` : '';
    const first = f.taken[0];
    return {
      self:
        first !== undefined
          ? Mml.compose`You sweep ${Mml.thing(target)} clean${of}, and take it up: ${Mml.thing(first)}.`
          : Mml.compose`You sweep ${Mml.thing(target)} clean${of}. It comes down where it will.`,
      peers: Mml.compose`${Mml.actor(giver)} sweeps ${Mml.thing(target)}.`,
    };
  }

  /** ⭐ Every reason, exhaustively. */
  protected static refusalWords(r: SweepRefusal): Composed {
    switch (r.reason) {
      case 'nothing-to-sweep':
        return Mml.compose`There is nothing here a broom could take up.`;
      case 'no-brush':
        return Mml.compose`A chimney is swept with a flue brush, and you have none to hand. (Its grate is raked — rake it.)`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}

/**
 * SweepController — `sweep [<floor|hearth>] [with <broom|brush>]`, the
 * byre's mucking out included — cleanliness D15, D18, D20.
 *
 * ⭐ One act, and the thing swept plans it (`SweepableMixin`,
 * controller-liquidity W7c): the FLOOR decides what a broom takes up
 * (`FloorMixin.sweepInto` — everything on an earth floor, only the debris
 * on a scrubbed one) and what it is heaped into (sweepings, or the byre's
 * muck); a FIRE rakes its grate (`Burner.rakeGrate`), and a flued one,
 * with a brush to hand, its chimney (`Flued.sweepChimney`). How long each
 * takes is the thing's. This file finds what is to hand, engages the plan
 * and says what came up.
 *
 * ⭐ A target that is not sweepable — or none — sweeps the floor you stand
 * on: `sweep`, `sweep byre`.
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
    const target = named !== null && MixinApi.isSweepable(named) ? named : floor;
    const plan =
      target !== null && MixinApi.isSweepable(target)
        ? target.sweepPlanFor({ actor: giver, broom, brush })
        : null;
    if (target === null || plan === null) {
      this.declineStep(
        context,
        named
          ? Mml.compose`You can't sweep ${Mml.thing(named)}.`
          : Mml.compose`There is no floor here to sweep.`,
        'no-floor',
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
        switch (b.kind) {
          case 'floor':
            return b.broom
              ? Mml.compose`You set to with the broom.`
              : Mml.compose`You get down and sweep with your hands.`;
          case 'grate':
            return Mml.compose`You rake out the grate of ${Mml.thing(target)}.`;
          case 'flue':
            return Mml.compose`You work the brush up into ${Mml.thing(target)}'s flue, rod by rod.`;
          default: {
            const never: never = b;
            return never;
          }
        }
      },
      onRefused: (r) => SweepController.refusalWords(r),
      onDone: (f) => SweepController.doneWords(f, giver),
    };
  }

  /** What came up, in words. */
  protected static doneWords(f: SweepFacts, giver: Stuff): { self: Composed; peers?: Composed } {
    switch (f.kind) {
      case 'floor': {
        if (f.heap === null) {
          return { self: Mml.compose`You sweep, and there is nothing worth the name to take up.` };
        }
        const what = Object.keys(f.kinds).slice(0, 3).join(', ');
        return {
          self: Mml.compose`You sweep the floor clean${what ? ` of ${what}` : ''}, into ${Mml.thing(f.heap)}.`,
          peers: Mml.compose`${Mml.actor(giver)} sweeps the floor.`,
        };
      }
      case 'grate': {
        const first = f.ash[0];
        if (!first) {
          return {
            self: Mml.compose`There is hardly any ash in the grate. It wants a brush up the flue, maybe, but not raking.`,
          };
        }
        return {
          self:
            f.ash.length === 1
              ? Mml.compose`You rake the grate out into ${Mml.thing(first)}.`
              : Mml.compose`You rake the grate out into ${String(f.ash.length)} heaps of ash.`,
          peers: Mml.compose`${Mml.actor(giver)} rakes out the grate.`,
        };
      }
      case 'flue':
        return {
          self:
            f.taken.length > 0
              ? Mml.compose`Soot comes down the flue in a black fall, and you gather the finest of it up: ${Mml.thing(f.taken[0]!)}. The chimney is clear.`
              : f.sootKg > 0.05
                ? Mml.compose`Soot comes down the flue in a black fall, all over the hearthstone. The chimney is clear.`
                : Mml.compose`A little soot comes down. The flue was clean enough.`,
          peers: Mml.compose`${Mml.actor(giver)} sweeps the chimney.`,
        };
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** ⭐ Every reason, exhaustively. */
  protected static refusalWords(r: SweepRefusal): Composed {
    switch (r.reason) {
      case 'nothing-to-sweep':
        return Mml.compose`There is nothing here a broom could take up.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}

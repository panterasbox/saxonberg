/**
 * CutController — the ONE `cut` (storage-and-ice D16).
 *
 * ⚠ Dumb by design. It resolves who plans the cut — the TARGET when it is
 * `Cuttable` (the room's floor when the target was a bare word for part of
 * it: `cut marked`, `cut hole`), else the first bound tool that is a
 * `CutPlanner` and knows the target (a tailor's shears and a bolt) — asks
 * for the plan, and either declines or engages the step the plan
 * describes. The kernel never names a pack class.
 *
 * ⭐ The planner answers a reason and the facts; the words are this
 * controller's (controllers-are-io D4) — every reason the cut protocol
 * declares (`CutRefusal`), worded in one exhaustive switch.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type {
  CutAnswer,
  CutAnswerFor,
  CutBegin,
  CutDone,
  CutRefusal,
  CutRequest,
} from '../../../../lib/craft/Cuttable';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';

type Composed = ReturnType<typeof Mml.compose>;

interface CutModel extends CommandModel {
  target?: MqlOneResult;
  tools?: MqlManyResult;
  length?: string;
  for?: MqlOneResult;
  tight?: boolean;
  generous?: boolean;
}

export default class CutController extends ManualBuildController<CutModel> {
  async execute(model: CutModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as unknown as Stuff;
    const target = (model.target?.stuff ?? null) as Stuff | null;
    const raw = model.target?.raw?.trim() || null;
    const tools = (model.tools?.stuff ?? []) as Stuff[];
    const req: CutRequest<'cut'> = {
      verb: 'cut',
      actor,
      tools,
      raw: target === null ? raw : null,
      length: (model.length ?? '').trim() || null,
      options: {
        for: (model.for?.stuff ?? null) as Stuff | null,
        tight: model.tight === true,
        generous: model.generous === true,
      },
    };

    let asked: Stuff | null = null;
    let answer: CutAnswer | null = null;
    if (target !== null && MixinApi.isCuttable(target)) {
      asked = target;
      answer = await target.cutPlan(req);
    } else if (target !== null) {
      for (const tool of tools) {
        if (!MixinApi.isCutPlanner(tool)) continue;
        answer = await tool.cutPlanFor(target, req);
        if (answer !== null) {
          asked = target;
          break;
        }
      }
    } else if (raw !== null) {
      // A bare word: a part of the ground underfoot (`marked`, `hole`).
      const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
      const floor = room ? (MixinApi.isAdornable(room) ? room.getFloor() : null) : null;
      if (floor !== null && MixinApi.isCuttable(floor)) {
        asked = floor;
        answer = await floor.cutPlan(req);
      }
    }

    if (answer === null || asked === null) {
      this.declineStep(
        context,
        target !== null
          ? Mml.compose`You have nothing in reach that would cut ${Mml.thing(target)}.`
          : Mml.compose`Cut what?`,
        target !== null ? 'no-cutter' : 'no-target',
      );
      return;
    }
    if (answer.verb !== 'cut') {
      throw new TypeError(`CutController: a planner answered '${answer.verb}' to a cut`);
    }
    const plan: CutAnswerFor<'cut'> = answer;
    const thing = asked;
    if (!plan.ok) {
      this.declineStep(context, CutController.refusalWords(plan, thing), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f) => CutController.beginWords(f, actor),
      beginPeers: (f) => CutController.beginPeerWords(f, actor),
      onRefused: (r) => CutController.refusalWords(r, thing),
      onDone: (f) => CutController.doneWords(f, actor),
    });
  }

  /** `10.0` → `10 meters`, the rope's own phrasing. */
  private static meters(n: number): string {
    const r = Math.round(n * 10) / 10;
    return `${r} ${r === 1 ? 'meter' : 'meters'}`;
  }

  /** ⭐ The words for a refused cut (D4) — every reason, exhaustively. */
  private static refusalWords(out: CutRefusal, thing: Stuff): Composed {
    switch (out.reason) {
      case 'not-cuttable':
        return Mml.compose`You can't cut ${Mml.thing(thing)} like that.`;
      case 'no-knife':
        return Mml.compose`You need a knife to cut ${Mml.thing(thing)}.`;
      case 'tied':
        return Mml.compose`${Mml.thing(thing)} is tied; untie it before you cut it.`;
      case 'no-length':
        return Mml.compose`Cut it where? \`cut rope at 10 m\` cuts ten meters off the end.`;
      case 'bad-length':
        return Mml.compose`"${out.facts.length}" is not a length — say it in meters, like \`at 10 m\`.`;
      case 'too-long':
        return Mml.compose`${Mml.thing(thing)} is only ${CutController.meters(out.facts.lengthM)} long.`;
      case 'changed':
        return Mml.compose`The rope is not as it was; you leave it uncut.`;
      case 'no-piece':
        return Mml.compose`The knife slips; nothing comes away.`;
      case 'no-nips':
        return Mml.compose`A sugar loaf is too hard to cut with that — it wants sugar nips.`;
      case 'too-little-cloth':
        return out.facts.waste
          ? Mml.compose`There is not enough cloth there — that pattern wants ${String(out.facts.pattern)}, and cutting it without a proper bench will cost you ${String(out.facts.units)}.`
          : Mml.compose`There is not enough cloth there — that pattern wants ${String(out.facts.units)}.`;
      case 'no-ice-saw':
        return Mml.compose`You need an ice saw to cut ice.`;
      case 'not-on-ice':
        return Mml.compose`You cannot work the ice from the water.`;
      case 'no-ice':
        return Mml.compose`There is no ice here to cut through.`;
      case 'no-grid':
        return Mml.compose`Mark a grid on the ice first, then cut along it.`;
      case 'open':
        return Mml.compose`That is open water.`;
      default: {
        const never: never = out;
        return never;
      }
    }
  }

  /** What the cutter reads as the cut begins. */
  private static beginWords(f: CutBegin, _actor: Stuff): Composed {
    switch (f.kind) {
      case 'rope':
        return Mml.compose`You measure off ${CutController.meters(f.takeM)} of ${Mml.thing(f.rope)} and set the knife to it.`;
      case 'loaf':
        return Mml.compose`You set the nips to ${Mml.thing(f.loaf)} and start breaking it down.`;
      case 'pattern':
        return f.subject !== null
          ? f.waste
            ? Mml.compose`You lay ${Mml.thing(f.cloth)} out as flat as you can manage and mark it to ${Mml.actor(f.subject)}'s measure. Without a bench under it, some of this is going to be waste.`
            : Mml.compose`You chalk the pattern out on ${Mml.thing(f.cloth)} to ${Mml.actor(f.subject)}'s measure.`
          : f.waste
            ? Mml.compose`You lay ${Mml.thing(f.cloth)} out as flat as you can manage and mark a stock pattern on it. Without a bench under it, some of this is going to be waste.`
            : Mml.compose`You chalk a stock pattern out on ${Mml.thing(f.cloth)}.`;
      case 'ice':
        return f.hole
          ? Mml.compose`You set the saw to the ice and begin cutting a hole.`
          : Mml.compose`You set the ice saw into the grid line and begin to cut.`;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** What the room sees as the cut begins. */
  private static beginPeerWords(f: CutBegin, actor: Stuff): Composed {
    switch (f.kind) {
      case 'rope':
        return Mml.compose`${Mml.actor(actor)} cuts a length off a rope.`;
      case 'loaf':
        return Mml.compose`${Mml.actor(actor)} nips at a sugar loaf.`;
      case 'pattern':
        return Mml.compose`${Mml.actor(actor)} chalks a pattern out on a length of cloth.`;
      case 'ice':
        return Mml.compose`${Mml.actor(actor)} saws at the ice.`;
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  /** What the cut came to, for the cutter and the room. */
  private static doneWords(f: CutDone, actor: Stuff): { self?: Composed | null; peers?: Composed | null } | null {
    switch (f.kind) {
      case 'rope':
        return {
          self: Mml.compose`The knife goes through; you have ${CutController.meters(f.takeM)} of rope in your hand and ${CutController.meters(f.leftM)} left.`,
        };
      case 'loaf':
        return {
          self: Mml.compose`The loaf breaks into three: ${f.pieces.map((p) => `the ${p.part} (${p.color})`).join(', ')}.`,
          peers: Mml.compose`${Mml.actor(actor)} breaks a sugar loaf into pieces.`,
        };
      case 'pattern':
        return {
          self:
            f.allowance === 0
              ? Mml.compose`Cut close. Almost nothing on the floor, and nothing at the seams either — this will never be let out.`
              : Mml.compose`Cut with ${String(f.allowance)} of allowance at the seams, and ${String(f.offcuts)} of offcuts on the floor.`,
          peers: Mml.compose`${Mml.actor(actor)} cuts out a pattern.`,
        };
      case 'ice-hole':
        return {
          self: Mml.compose`The saw breaks through, and black water wells up into the hole.`,
          peers: Mml.compose`${Mml.actor(actor)} saws a hole through the ice.`,
        };
      case 'ice-block': {
        if (f.block === null) {
          return { self: Mml.compose`The saw comes through, but there is no block to lift — the ice there will not give one.` };
        }
        const heft = f.kg > 0 ? ` — about ${Math.round(f.kg)} kilograms of it —` : '';
        return {
          self: Mml.compose`The saw comes through the last line, and you lever ${f.block.getPresentation()}${heft} up out of the water onto the ice.`,
          peers: Mml.compose`${Mml.actor(actor)} levers ${f.block.getPresentation()} up out of the water.`,
        };
      }
      case 'gone':
        return null;
      default: {
        const never: never = f;
        return never;
      }
    }
  }
}

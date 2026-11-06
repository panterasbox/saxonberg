/**
 * HarvestController — `harvest <plant|ground> [--at <part>] [--with <tool>]`.
 *
 * ⭐⭐ **Input and output, and the doctrine's exemplar** (controllers-are-io
 * D11, D14). The plant decides everything — which stand was meant, whether it
 * may be taken, how long a swath takes, what the bed loses
 * (`GrowingMixin.harvestPlanFor`; naming the ground asks
 * `CultivableMixin.harvestPlanFor`, which asks the plant). This file holds the
 * words and nothing else, in three methods an alternate controller overrides:
 * `HarvestWordedController` says all of it differently and changes nothing in
 * the world.
 *
 * ⚠ The word methods are `static`, reached through the instance's class before
 * the act engages: they run at completion, and this controller is destructed
 * the moment `execute` returns.
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type {
  HarvestBegin,
  HarvestDone,
  HarvestRefusal,
} from '../../../../lib/husbandry/Growing';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

interface HarvestModel extends CommandModel {
  target: MqlOneResult;
  /** `--at <part>` — which part of a divided field (D5). */
  part?: MqlOneResult;
  /**
   * `--with <tool>`, when the plant asks for one (`harvestTool`). The view's
   * `default:` binds the first reachable thing with the capability; the
   * controller never hunts.
   */
  tool?: MqlOneResult;
}

export default class HarvestController extends EngagedActController<HarvestModel> {
  async execute(model: HarvestModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target.stuff;
    if (!named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }
    const patchRaw = model.part?.raw ?? '';
    const patchBound = model.part?.stuff ?? null;
    if (!patchBound && patchRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
      return;
    }
    if (!MixinApi.isGrowing(named) && !MixinApi.isCultivable(named)) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(named)} isn't a plant.`,
        'not-a-plant',
        `${named.getPresentation()} is not a plant`,
      );
      return;
    }
    const plan = named.harvestPlanFor({
      by: giver,
      typed: model.target.raw,
      part: patchBound && MixinApi.isSoil(patchBound) ? patchBound : null,
      tool: model.tool?.stuff ?? null,
    });
    const words = this.constructor as typeof HarvestController;
    if (!plan.ok) {
      this.decline(context, words.refusalWords(plan), plan.reason, plan.facts.detail);
      return;
    }
    await this.engageAct(context, plan, {
      beginSelf: (f) => words.beginWords(f, giver).self,
      beginPeers: (f) => words.beginWords(f, giver).peers,
      onRefused: (r) => words.refusalWords(r),
      onDone: (f) => words.doneWords(f, giver),
    });
  }

  /** What a refused harvest says. */
  static refusalWords(r: HarvestRefusal): Composed {
    const { subject, part, line, stageWord } = r.facts;
    const it: Stuff = subject ?? part!;
    switch (r.reason) {
      case 'nothing-growing':
        return Mml.compose`There's nothing growing in ${Mml.thing(it)}.`;
      case 'part-unnamed':
        return Mml.fromMarkup(line!);
      case 'not-a-part-here':
        return line !== undefined
          ? Mml.fromMarkup(line)
          : Mml.compose`${Mml.thing(it)} does not stand at ${Mml.thing(part!)}.`;
      case 'nothing-sown-there':
        return Mml.compose`Nothing of that stands at ${Mml.thing(part!)}.`;
      case 'not-harvestable':
        return Mml.compose`${Mml.thing(it)} isn't something you harvest.`;
      case 'needs-tool':
        return Mml.compose`You need something that cuts to take ${Mml.thing(it)} — a billhook, or an axe.`;
      case 'plant-dead':
        return Mml.compose`${Mml.thing(it)} is dead. There is nothing to take.`;
      case 'nothing-ripe':
        return Mml.compose`${Mml.thing(it)} has nothing ripe on it yet.`;
      case 'not-mature':
        return Mml.compose`${Mml.thing(it)} isn't ready — it is still ${stageWord ?? ''}.`;
      case 'mint-failed':
        return Mml.compose`Something goes wrong as you reach for it.`;
      case 'walked-off':
        return Mml.compose`Nothing came of it — you are not standing in it any more.`;
      case 'nothing-left':
        return Mml.compose`There is nothing left standing to cut.`;
      default: {
        const unworded: never = r.reason;
        throw new Error(`HarvestController: no words for '${String(unworded)}'`);
      }
    }
  }

  /** What a swath's begin says. */
  static beginWords(f: HarvestBegin, giver: Stuff): { self: Composed; peers: Composed } {
    return {
      self: f.tool
        ? Mml.compose`You bend to ${f.presentation} with ${Mml.thing(f.tool)} and cut.`
        : Mml.compose`You bend to ${f.presentation} and pull it by hand.`,
      peers: Mml.compose`${Mml.actor(giver)} bends to ${f.presentation} and cuts.`,
    };
  }

  /** What a landed harvest says. */
  static doneWords(f: HarvestDone, giver: Stuff): { self: Composed; peers: Composed } {
    switch (f.kind) {
      case 'pick':
        return {
          self:
            f.count > 1
              ? Mml.compose`You pick ${Mml.thing(f.sample)} from ${f.presentation} — ${String(f.count)} in all — and it keeps its place.`
              : Mml.compose`You pick ${Mml.thing(f.sample)} from ${f.presentation}, and it keeps its place.`,
          peers: Mml.compose`${Mml.actor(giver)} picks ${Mml.thing(f.sample)} from ${f.presentation}.`,
        };
      case 'annual':
        return {
          self: Mml.compose`You take ${Mml.thing(f.sample)} off ${f.presentation}, and what is left of the plant comes away with it.`,
          peers: Mml.compose`${Mml.actor(giver)} harvests ${Mml.thing(f.sample)}.`,
        };
      case 'swath': {
        const left = f.last
          ? f.polycarp
            ? 'That is the last of it; the stools will come again.'
            : 'That is the last of it, cut down to the stubble.'
          : HarvestController.standingPhrase(f.standing);
        const first = f.crops[0];
        const took = !first
          ? Mml.compose`You cut a swath of ${f.presentation}${f.at} and bind it — not yet enough to make up a load.`
          : f.crops.length === 1
            ? Mml.compose`You cut a swath of ${f.presentation}${f.at} and make up ${Mml.thing(first)}.`
            : Mml.compose`You cut a swath of ${f.presentation}${f.at} and make up ${Mml.thing(first)} — ${String(f.crops.length)} in all.`;
        const lying =
          f.dropped > 0
            ? f.dropped === f.crops.length
              ? ' You leave it lying in the row; you cannot carry more.'
              : ` You leave ${String(f.dropped)} lying in the row; you cannot carry more.`
            : '';
        return {
          self: Mml.compose`${took}${lying} ${left}`,
          peers: Mml.compose`${Mml.actor(giver)} cuts a swath of ${f.presentation}${f.at}.`,
        };
      }
      default: {
        const unworded: never = f;
        throw new Error(`HarvestController: no words for ${String(unworded)}`);
      }
    }
  }

  /** How much of the crop still stands, in words. */
  private static standingPhrase(f: number): string {
    if (f >= 0.85) return 'Nearly all of it is still standing.';
    if (f >= 0.6) return 'Most of it is still standing.';
    if (f >= 0.4) return 'About half of it is still standing.';
    if (f >= 0.15) return 'Some of it is still standing.';
    return 'Only a strip of it is still standing.';
  }
}

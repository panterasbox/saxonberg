/**
 * BrushController — `brush <thing> [with <brush>]`, alias `beat`
 * (cleanliness, review B46): the loose dirt out of a thing, dry. The act is
 * the thing's own (`Soilable.brushOff`); this picks the target and the
 * tool, times the work, and words what came out.
 */
import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';
const BRUSH_MS = 8000;

interface BrushModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlManyResult;
}

export default class BrushController extends ManualBuildController<BrushModel> {
  execute(model: BrushModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isSoilable(target)) {
      this.declineStep(context, Mml.compose`Brush what?`, 'no-target');
      return;
    }
    if (MixinApi.isFloor(target)) {
      this.declineStep(context, Mml.compose`A floor is swept, not brushed.`, 'sweep-it');
      return;
    }
    // A beater or a stiff brush is made for it; a broom does, worse.
    const proper = this.bestInstrument(model.tool, 'brushing') !== null;
    const effort = proper ? 3 : 2;
    this.engageStep(context, {
      durationMs: BRUSH_MS,
      effortW: 300,
      beginSelf: Mml.compose`You set about ${Mml.thing(target)}.`,
      onComplete: () => BrushController.finish(giver, target, effort),
    });
  }

  /** ⚠ STATIC (completions run on a destructed controller). */
  private static finish(giver: Stuff, target: Stuff, effort: number): void {
    if (target.isDestroyed() || !MixinApi.isSoilable(target)) return;
    const removed = target.brushOff(effort);
    const what = Object.keys(removed).slice(0, 3).join(', ');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        what
          ? Mml.compose`The ${what} comes out of ${Mml.thing(target)} in a cloud, and then less, and then hardly any.`
          : Mml.compose`You brush ${Mml.thing(target)}, and nothing much comes out of it — what is left wants washing.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} brushes down ${Mml.thing(target)}.`)
      .send();
  }
}

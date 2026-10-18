/**
 * SweepController — `sweep [<floor|hearth>] [with <broom|brush>]`, and
 * `muck` (out the byre) — cleanliness D15, D18, D20.
 *
 * ⭐ Dumb over the things it sweeps: the FLOOR decides what a broom takes
 * up (`FloorMixin.sweepUp` — everything on an earth floor, only the debris
 * on a scrubbed one) and what it is heaped into (`sweepsInto`: sweepings,
 * or the byre's muck); the HEARTH decides what is in its grate
 * (`Burner.takeAsh`) and its flue (`Flued.sweepFlue`). This file picks the
 * target, engages the hands and mints the heap.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';
/** A floor's sweep with a broom; bare hands take three times as long. */
const SWEEP_MS = 8000;

interface SweepModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlManyResult;
}

export default class SweepController extends ManualBuildController<SweepModel> {
  async execute(model: SweepModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const brush = this.bestInstrument(model.tool, 'flue-brushing') !== null;
    const broom = this.bestInstrument(model.tool, 'sweeping') !== null;
    const target = model.target?.stuff ?? null;
    const room = context.location ?? null;

    if (target !== null && MixinApi.isFlued(target)) {
      return this.sweepHearth(target, brush, room, context);
    }
    const floor =
      target !== null && MixinApi.isFloor(target)
        ? target
        : room && MixinApi.isAdornable(room)
          ? (room.getFloor() as unknown as Stuff | null)
          : null;
    if (floor === null || !MixinApi.isFloor(floor)) {
      this.declineStep(
        context,
        target
          ? Mml.compose`You can't sweep ${Mml.thing(target)}.`
          : Mml.compose`There is no floor here to sweep.`,
        'no-floor',
      );
      return;
    }
    if (!floor.takesSoil()) {
      this.declineStep(context, Mml.compose`There is nothing here a broom could take up.`, 'nothing-to-sweep');
      return;
    }
    this.engageStep(context, {
      durationMs: SWEEP_MS * (broom ? 1 : 3),
      effortW: 250,
      beginSelf: broom
        ? Mml.compose`You set to with the broom.`
        : Mml.compose`You get down and sweep with your hands.`,
      onComplete: () => {
        void SweepController.finishFloor(giver, floor);
      },
    });
  }

  /**
   * ⚠ STATIC, as everything an engaged step's completion calls must be:
   * the controller clone is destructed when `execute` returns (found by
   * the drive — the sweep finished on a dead proxy and took nothing up).
   */
  private static async finishFloor(giver: Stuff, floor: Stuff): Promise<void> {
    if (!MixinApi.isFloor(floor)) return;
    // ⭐ The sweep is the floor's (`sweepInto`): this words what it did.
    const { kinds, heap } = await floor.sweepInto(giver);
    if (giver.isDestroyed()) return;
    if (!heap) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You sweep, and there is nothing worth the name to take up.`).send();
      return;
    }
    const what = Object.keys(kinds).slice(0, 3).join(', ');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You sweep the floor clean${what ? ` of ${what}` : ''}, into ${Mml.thing(heap)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} sweeps the floor.`)
      .send();
  }

  /** A hearth: its grate raked of ash, or — with a brush — its flue swept. */
  private sweepHearth(
    hearth: Stuff,
    brush: boolean,
    room: Stuff | null,
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    if (!MixinApi.isFlued(hearth)) return;
    this.engageStep(context, {
      durationMs: SWEEP_MS * (brush ? 3 : 1),
      effortW: brush ? 400 : 200,
      beginSelf: brush
        ? Mml.compose`You work the brush up into ${Mml.thing(hearth)}'s flue, rod by rod.`
        : Mml.compose`You rake out the grate of ${Mml.thing(hearth)}.`,
      onComplete: () => {
        void SweepController.finishHearth(giver, hearth, brush);
      },
    });
  }

  /** ⚠ STATIC (completions run on a destructed controller). */
  private static async finishHearth(giver: Stuff, hearth: Stuff, brush: boolean): Promise<void> {
    if (!MixinApi.isFlued(hearth)) return;
    if (brush) {
      // ⭐ The chimney's own act: soot onto the floor and your hands.
      const { sootKg } = await hearth.sweepChimney(giver);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          sootKg > 0.05
            ? Mml.compose`Soot comes down the flue in a black fall, all over the hearthstone. The chimney is clear.`
            : Mml.compose`A little soot comes down. The flue was clean enough.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} sweeps the chimney.`)
        .send();
      return;
    }
    // ⭐ The grate's own act: the ash into your hands, the hearth owner's.
    const { ash } = await hearth.rakeGrate(giver);
    if (!ash) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is hardly any ash in the grate. It wants a brush up the flue, maybe, but not raking.`)
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You rake the grate out into ${Mml.thing(ash)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} rakes out the grate.`)
      .send();
  }
}


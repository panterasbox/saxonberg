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
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Quantity } from '../../../../lib/quantity';

const TOPIC = 'act.deed';
/** A floor's sweep with a broom; bare hands take three times as long. */
const SWEEP_MS = 8000;
/** Soot a swept flue drops, as a load on the floor per kg (D18). */
const SOOT_LOAD_PER_KG = 0.8;

interface SweepModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlManyResult;
}

export default class SweepController extends ManualBuildController<SweepModel> {
  async execute(model: SweepModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const tools = model.tool?.stuff ?? [];
    const has = (cap: string): boolean =>
      tools.some((t) => MixinApi.isTool(t) && t.hasCapability(cap));
    const target = model.target?.stuff ?? null;
    const room = context.location ?? null;

    if (target !== null && MixinApi.isFlued(target)) {
      return this.sweepHearth(target, has('flue-brushing'), room, context);
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
    const broom = has('sweeping');
    this.engageStep(context, {
      durationMs: SWEEP_MS * (broom ? 1 : 3),
      effortW: 250,
      beginSelf: broom
        ? Mml.compose`You set to with the broom.`
        : Mml.compose`You get down and sweep with your hands.`,
      onComplete: () => {
        void this.finishFloor(giver, floor);
      },
    });
  }

  private async finishFloor(giver: Stuff, floor: Stuff): Promise<void> {
    if (!MixinApi.isFloor(floor)) return;
    const { kg, kinds } = floor.sweepUp();
    await PersistableApi.captureHostOf(floor).catch(() => {});
    if (giver.isDestroyed()) return;
    if (!(kg > 0.01)) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You sweep, and there is nothing worth the name to take up.`).send();
      return;
    }
    const heap = await this.mint(floor.getSweepsInto(), kg, giver);
    const what = Object.keys(kinds).slice(0, 3).join(', ');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        heap
          ? Mml.compose`You sweep the floor clean${what ? ` of ${what}` : ''}, into ${Mml.thing(heap)}.`
          : Mml.compose`You sweep the floor clean.`,
      )
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
        void (async () => {
          if (brush) {
            const soot = hearth.sweepFlue();
            const floor =
              room && MixinApi.isAdornable(room) ? (room.getFloor() as unknown as Stuff | null) : null;
            if (floor && MixinApi.isSoilable(floor) && soot > 0) {
              floor.soil('soot', soot * SOOT_LOAD_PER_KG);
            }
            if (MixinApi.isAttired(giver)) giver.soilFrom([{ kind: 'soot', amount: 0.3, where: 'hands' }]);
            await PersistableApi.captureHostOf(hearth).catch(() => {});
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(
                soot > 0.05
                  ? Mml.compose`Soot comes down the flue in a black fall, all over the hearthstone. The chimney is clear.`
                  : Mml.compose`A little soot comes down. The flue was clean enough.`,
              )
              .toPeers(Mml.compose`${Mml.actor(giver)} sweeps the chimney.`)
              .send();
            return;
          }
          const kg = hearth.takeAsh();
          if (MixinApi.isAttired(giver)) giver.soilFrom([{ kind: 'ash', amount: 0.15, where: 'hands' }]);
          if (!(kg > 0.01)) {
            MessageApi.scene(giver)
              .topic(TOPIC)
              .toSelf(Mml.compose`There is hardly any ash in the grate. It wants a brush up the flue, maybe, but not raking.`)
              .send();
            return;
          }
          const ash = await this.mint(ashTemplate(), kg, giver);
          await PersistableApi.captureHostOf(hearth).catch(() => {});
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              ash
                ? Mml.compose`You rake the grate out into ${Mml.thing(ash)}.`
                : Mml.compose`You rake out the grate.`,
            )
            .toPeers(Mml.compose`${Mml.actor(giver)} rakes out the grate.`)
            .send();
        })();
      },
    });
  }

  /** Mint `kg` of a heap row into the sweeper's hands (or at their feet). */
  private async mint(template: string, kg: number, giver: Stuff): Promise<Stuff | null> {
    try {
      const heap = await StuffApi.clone<Stuff>(template);
      if (MixinApi.isStackable(heap)) {
        heap.setQuantity(Math.max(1, Math.round(kg / 0.1)));
      } else if (MixinApi.isTangible(heap)) {
        heap.setMass(Quantity.of(kg, 'kg'));
      }
      const where = MixinApi.isContainer(giver)
        ? giver
        : MixinApi.isContainable(giver)
          ? giver.getContainer()
          : null;
      if (where && MixinApi.isContainer(where) && MixinApi.isContainable(heap)) {
        ContainmentApi.move(heap, where);
      }
      return heap;
    } catch (err) {
      console.warn(`SweepController: '${template}' did not resolve:`, err);
      return null;
    }
  }
}

/** The row a grate's ash is raked into (`cleanliness.ashTemplate`). */
function ashTemplate(): string {
  try {
    const v = AppApi.setting(AppSettingKeys.cleanlinessAshTemplate);
    if (v) return v;
  } catch {
    // fall through
  }
  return '/trade/fuel/thing/ash';
}

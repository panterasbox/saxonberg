/**
 * LiftController — `lift <load> [with <device>]`: one set at a load
 * device (`LoadDevice`), at the weight you chose.
 *
 * ⭐ **The load you choose is the whole of the choice.** The world's
 * work (the sack, the pick, the plough) comes at the weight the world
 * set, and a body that has outgrown it stops getting stronger from it;
 * the bar is where a person picks a heavier one. Three refusals, each
 * honest about WHICH thing said no: the device's own range
 * (`load-out-of-range` — *"That bar takes between 20 and 160."*), the
 * body (`too-heavy` — *"You can't get that off the floor."*, read off the
 * strain ceiling the encumbrance gauge already computes and the lean
 * margin widens), and the double shift (`too-tired`, the mixin's line,
 * inside `engageStep`). The set is a `ManualBuildStep` on the hands
 * with `effortW = load × wattsPerKg`; the scheduler pays the body at
 * completion, and `exert` decides whether it was overload.
 *
 * The device is a DECLARED arg (`default: "reachable:[capability.load]"`,
 * `requires: [ToolMixin]`), never hunted for (`lint:instrument-args`).
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { MessageApi } from '../../../../api/message';
import LoadDevice from '../../../thing/LoadDevice';

const TOPIC = 'act.deed';

interface LiftModel extends CommandModel {
  load?: number | string;
  device?: MqlManyResult;
}

export default class LiftController extends ManualBuildController<LiftModel> {
  execute(model: LiftModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const load = Number(model.load);
    if (!Number.isFinite(load) || load <= 0) {
      this.declineStep(context, Mml.compose`Lift how much? Name a weight.`, 'bad-load');
      return;
    }
    const tool = this.bestInstrument(model.device, 'load');
    if (!tool) {
      this.declineStep(
        context,
        Mml.compose`There's nothing here to load and lift.`,
        'not-a-load',
      );
      return;
    }
    if (!(tool instanceof LoadDevice)) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(tool)} isn't something you load to a weight.`,
        'not-a-load',
      );
      return;
    }
    const device = tool;
    if (!device.acceptsLoad(load)) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(device)} takes between ${String(device.getLoadMinKg())} and ${String(device.getLoadMaxKg())}.`,
        'load-out-of-range',
      );
      return;
    }
    // The body: the strain ceiling is the absolute lift cap the
    // encumbrance gauge already computes (mass × margins × overload), and
    // the lean margin widens it — so the same figure the tape and the
    // water read is what says whether this comes off the floor.
    if (MixinApi.isLoadBearing(giver) && load > giver.getStrainCeiling().rawValue()) {
      this.declineStep(
        context,
        Mml.compose`You can't get that off the floor.`,
        'too-heavy',
      );
      return;
    }
    this.engageStep(context, {
      durationMs: device.getSetDurationS() * 1000,
      effortW: device.powerAt(load),
      beginSelf: Mml.compose`You load ${Mml.thing(device)} to ${String(load)}, set yourself under it, and lift.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} loads ${Mml.thing(device)} and lifts.`,
      onComplete: () => {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You rack ${Mml.thing(device)}.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} racks ${Mml.thing(device)}.`)
          .send();
      },
    });
  }
}

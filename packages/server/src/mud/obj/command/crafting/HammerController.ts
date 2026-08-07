/**
 * HammerController — `hammer [<workpiece>]` (the smithing forming step).
 *
 * An engaged step that does the forming work: requires a reachable
 * `striking` tool AND a reachable `anvil` capability (held kit + room
 * fixtures — the emergent-reachability model; no venue flag), and a
 * workpiece that has taken some heat (you strike while it's hot). At
 * completion it **banks the workpiece's own item-contribution** into the
 * buffer — the forming work is what turns matter into a build — once per
 * build (hammering more shapes, it doesn't multiply the metal).
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'act.deed';
const HAMMER_MS = 5000;

interface HammerModel extends CommandModel {
  target?: MqlOneResult;
}

export default class HammerController extends ManualBuildController<HammerModel> {
  execute(model: HammerModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const target: Stuff | null =
      model.target?.stuff ?? this.findBuildVessel(giver);
    if (
      !target ||
      !MixinApi.isBuildVessel(target) ||
      !MixinApi.isTangible(target) ||
      !target.getMaterial()
    ) {
      this.declineStep(
        context,
        Mml.compose`Hammer what? You need a workpiece on the anvil.`,
        'no-vessel',
      );
      return;
    }

    const striker = this.findCapability(giver, 'striking');
    if (!striker) {
      this.declineStep(
        context,
        Mml.compose`You need a hammer in reach to work metal.`,
        'missing-tool',
      );
      return;
    }
    const anvil = this.findCapability(giver, 'anvil');
    if (!anvil) {
      this.declineStep(
        context,
        Mml.compose`You need an anvil to work against.`,
        'missing-tool',
      );
      return;
    }
    if (target.getHeatedToK() <= 0) {
      this.declineStep(
        context,
        Mml.compose`${Mml.item(target)} is stone cold — heat it first.`,
        'insufficient-heat',
      );
      return;
    }

    const build = target;
    const commandText = context.commandText;
    this.engageStep(context, {
      // The anvil paces the forming work (the conferring kind's rate);
      // the striking hammer is a requirement, never a pacer.
      durationMs: this.paceMs(HAMMER_MS, anvil, ['anvil']),
      beginSelf: Mml.compose`You set ${Mml.item(target)} on the anvil and begin to hammer.`,
      beginPeers: Mml.compose`${Mml.name(giver)} hammers at ${Mml.item(target)}, ringing the anvil.`,
      onComplete: () => {
        // Bank the workpiece's matter — the forming work. The once-rule
        // is the substrate's (`bankWorkpiece` is idempotent per build).
        build.bankWorkpiece();
        build.recordCommand(commandText);
        // The hammer wears with the work (Law 2).
        if (MixinApi.isDurable(striker)) striker.wear();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`The metal moves under your hammer — ${Mml.item(target)} is taking shape.`)
          .toPeers(Mml.compose`${Mml.name(giver)} draws a shape out of ${Mml.item(target)} blow by blow.`)
          .send();
      },
    });
  }
}

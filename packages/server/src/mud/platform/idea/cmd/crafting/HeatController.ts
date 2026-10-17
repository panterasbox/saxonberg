/**
 * HeatController — `heat [<workpiece|pot>]` (a manual-build step, both
 * branches).
 *
 * An engaged step that works the build at the fire: requires reachable
 * heat > 0 (a cold forge / no fire declines diegetically) and, at
 * completion, **latches the reached heat** onto the build buffer
 * (`noteHeat` — max-latching), which the terminal mint's reverse-match
 * reads against each recipe's `requiresHeatK`. Works on any `Builds`
 * host: the smithing workpiece (the ingot in the tongs) or the cook pot.
 *
 * ⭐ **The placing arm** (dairy D6): a vessel that is not a build — a
 * cheese vat, a pail of milk — is brought to the fire by SETTING IT ON
 * the lit furnace in reach (a hearth, a stove), so its contents really do
 * warm: the furnace couple makes the fire's held temperature its ambient.
 * Nothing is latched; the thermometer reads what happened. Taking it off
 * is `get` / `put … on table`. The view's arg is `requires: any` because a
 * build vessel and a cold vat share no mixin (a shaker builds and is not
 * Thermal), so the controller narrows to its two arms.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { Contamination } from '../../../../lib/material/Contaminable';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ContainmentApi } from '../../../../api/containment';

const TOPIC = 'act.deed';
const HEAT_MS = 4000;
/** An instrument held in the flame is held this long (D14: ≥ 60 s). */
const FLAME_HOLD_S = 60;

interface HeatModel extends CommandModel {
  target?: MqlOneResult;
}

export default class HeatController extends ManualBuildController<HeatModel> {
  execute(model: HeatModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const target: Stuff | null =
      model.target?.stuff ?? null;
    // ⭐ An instrument held in the flame (cleanliness D14): the heat it
    // took is stamped on it, and past 433 K for a minute it is sterile.
    if (
      target &&
      !MixinApi.isBuildVessel(target) &&
      MixinApi.isTool(target) &&
      MixinApi.isSoilable(target)
    ) {
      this.holdInFlame(giver, target, context);
      return;
    }
    if (
      target &&
      !MixinApi.isBuildVessel(target) &&
      MixinApi.isThermal(target) &&
      MixinApi.isContainable(target)
    ) {
      this.setOnTheFire(giver, target, context);
      return;
    }
    if (!target || !MixinApi.isBuildVessel(target)) {
      this.declineStep(
        context,
        Mml.compose`Heat what? You need a workpiece or a pot to work.`,
        'no-vessel',
      );
      return;
    }

    const reachableK = (MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0);
    if (reachableK <= 0) {
      this.declineStep(
        context,
        Mml.compose`There's no fire here hot enough to work with.`,
        'insufficient-heat',
      );
      return;
    }

    const build = target;
    const commandText = context.commandText;
    this.engageStep(context, {
      durationMs: this.paceMs(HEAT_MS, target, ["pot"]),
      effortW: 200,
      beginSelf: Mml.compose`You bring ${Mml.thing(target)} to the fire and let it take the heat.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} brings ${Mml.thing(target)} to the fire.`,
      onComplete: () => {
        // Re-read at completion — the fire may have died mid-step; you
        // latch the heat you actually finished at.
        const finalK = (MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0);
        if (finalK > 0) build.noteHeat(finalK);
        build.recordCommand(commandText);
        // ⭐ Heat ANNEALS. A hardened piece taken back above the critical
        // temperature loses its temper, and that is not a penalty the
        // engine chose — it is what happens, and it is why a smith
        // quenches LAST. ⚠ Local narrowing on the workpiece this handler
        // is already holding, not a guard re-narrowing a host set.
        if (MixinApi.isAlloyed(target) && target.getTemper() !== 'none') {
          target.setTemper('none');
          MessageApi.scene(giver)
            .topic(TOPIC)
            .toSelf(
              Mml.compose`The hardness goes out of ${Mml.thing(target)} as it comes up to colour. Whatever the quench put in, the fire has taken back out.`,
            )
            .send();
        }
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`${Mml.thing(target)} takes the heat, glowing with it.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} works ${Mml.thing(target)} in the heat.`)
          .send();
      },
    });
  }

  /** The flame arm — an instrument held in the fire until it is sterile. */
  private holdInFlame(
    giver: Stuff,
    target: Stuff,
    context: CommandContext,
  ): void {
    const reachableK = MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0;
    if (reachableK <= 0) {
      this.declineStep(
        context,
        Mml.compose`There's no flame here to hold ${Mml.thing(target)} in.`,
        'insufficient-heat',
      );
      return;
    }
    this.engageStep(context, {
      durationMs: HEAT_MS,
      effortW: 100,
      beginSelf: Mml.compose`You hold ${Mml.thing(target)} in the flame, turning it.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} holds ${Mml.thing(target)} in the flame.`,
      onComplete: () => {
        if (target.isDestroyed() || !MixinApi.isSoilable(target)) return;
        const finalK = MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0;
        if (finalK <= 0) return;
        target.recordHeat(finalK, FLAME_HOLD_S);
        if (MixinApi.isContaminable(target)) {
          target.setPathogenLoads(
            Contamination.killOver(target.getPathogenLoads(), finalK, FLAME_HOLD_S, 0.3),
          );
        }
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            target.cleanTier() === 'sterile'
              ? Mml.compose`${Mml.thing(target)} comes out of the flame too hot to touch. Nothing lives on it.`
              : Mml.compose`${Mml.thing(target)} comes out of the flame warm — not hot enough to kill what is on it.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} draws ${Mml.thing(target)} out of the flame.`)
          .send();
      },
    });
  }

  /** The placing arm — set a plain vessel on the lit fire in reach. */
  private setOnTheFire(
    giver: Stuff,
    target: Stuff,
    context: CommandContext,
  ): void {
    const fire = MixinApi.isThermal(giver) ? giver.reachableHeatSource() : null;
    if (!fire || !MixinApi.isPlacing(fire) || !MixinApi.isContainable(target)) {
      this.declineStep(
        context,
        Mml.compose`There's no fire here to set ${Mml.thing(target)} on.`,
        'no-fire-to-set-on',
      );
      return;
    }
    ContainmentApi.move(target, fire, 'on');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You set ${Mml.thing(target)} on ${Mml.thing(fire)} to take the heat.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} sets ${Mml.thing(target)} on ${Mml.thing(fire)}.`)
      .send();
  }
}

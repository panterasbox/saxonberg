/**
 * PumpController — `pump <furnace>` / `work <bellows>`.
 *
 * Works a furnace's bellows: toggles `bellowsActive`, scaling the held
 * temperature by the authored `bellowsMultiplier` (the forge's reasoned
 * mechanic — 1300 K banked, 2080 K worked; smelting heat and the hot
 * end of the smithing recipe ladder are reachable ONLY with the bellows).
 * Live-drive gap closed: the mechanic shipped with the fire build but
 * the tests worked the bellows programmatically — this is the player's
 * handle on it. Narrows with `MixinApi.isFurnace`; a furnace with no
 * bellows (`bellowsMultiplier ≤ 1`) declines diegetically, as does
 * pumping an unlit or unfuelled one (working a cold bellows moves air,
 * not heat).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

interface PumpModel extends CommandModel {
  target?: MqlOneResult;
}

export default class PumpController extends CommandController<PumpModel> {
  execute(model: PumpModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          raw
            ? Mml.compose`You don't see any '${raw}' here.`
            : Mml.compose`Pump what?`,
        )
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: raw,
      });
      return;
    }
    if (!MixinApi.isFurnace(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(target)} has no bellows to work.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-furnace',
        detail: target.getPresentation(),
      });
      return;
    }
    const furnace = target;
    if (furnace.getBellowsMultiplier() <= 1) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(target)} has no bellows to work.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-bellows',
        detail: target.getPresentation(),
      });
      return;
    }
    if (!furnace.isBellowsActive() && (!furnace.isLit() || furnace.fuelRemaining() <= 0)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You work the bellows, but ${Mml.item(target)} is cold — air without fire moves nothing.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-lit',
        detail: target.getPresentation(),
      });
      return;
    }

    const next = !furnace.isBellowsActive();
    furnace.setBellowsActive(next);
    if (next) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You lean into the bellows, and ${Mml.item(target)} roars up white-hot.`,
        )
        .toPeers(
          Mml.compose`${Mml.name(giver)} works the bellows; ${Mml.item(target)} roars up white-hot.`,
        )
        .send();
    } else {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You ease off the bellows, and ${Mml.item(target)} settles back to its banked glow.`,
        )
        .toPeers(
          Mml.compose`${Mml.name(giver)} eases off the bellows of ${Mml.item(target)}.`,
        )
        .send();
    }
  }
}

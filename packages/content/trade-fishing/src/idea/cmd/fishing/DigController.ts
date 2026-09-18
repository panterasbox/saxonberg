/**
 * DigController — `dig [<ground>] [with <trowel>]`: two game minutes on
 * your hands, then a worm — and the ground has a little less in it.
 * The soil's own ledger is the cooldown (fishing D12): a bed dug over
 * for bait every morning gives no worms, and says so.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { FishingController, FISHING_TOPIC } from './FishingController';

interface DigModel extends CommandModel {
  ground: MqlOneResult;
  trowel?: MqlOneResult;
}

const WORM = '/trade/fishing/thing/worm';
const DIG_GAME_MS = 2 * 60 * 1000;

export default class DigController extends FishingController<DigModel> {
  async execute(model: DigModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const ground = model.ground?.stuff as Stuff | undefined;
    if (!ground || !MixinApi.isCultivable(ground)) {
      this.decline(context, 'There is no ground here worth digging.', 'no-ground');
      return;
    }
    const fraction = ground.organicMatterFraction();
    if (fraction === null || fraction <= 0) {
      this.decline(context, 'You turn it over. Nothing lives in this ground.', 'worked-out');
      return;
    }
    const perWorm = dial('fishing.dig.organicPerWorm', 0.05);
    const finish = async (): Promise<void> => {
      const taken = ground.drawOrganicMatter(perWorm);
      if (taken < perWorm * 0.5) {
        MessageApi.scene(giver).topic(FISHING_TOPIC).toSelf(Mml.compose`You turn it over. Nothing. This ground is worked out.`).send();
        return;
      }
      try {
        const worm = await StuffApi.clone<Stuff>(WORM);
        if (MixinApi.isContainer(giver) && MixinApi.isContainable(worm)) {
          ContainmentApi.move(worm as Stuff & Containable, giver as Stuff & Container);
        }
        MessageApi.scene(giver)
          .topic(FISHING_TOPIC)
          .toSelf(Mml.compose`You turn the ground over and come up with ${Mml.thing(worm)}.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} turns the ground over and pockets something.`)
          .send();
      } catch {
        MessageApi.scene(giver).topic(FISHING_TOPIC).toSelf(Mml.compose`You turn it over. Nothing.`).send();
      }
    };
    if (!MixinApi.isEngaged(giver)) {
      await finish();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: DIG_GAME_MS,
      onComplete: () => {
        void finish();
      },
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(FISHING_TOPIC)
        .toSelf(Mml.compose`You kneel and start turning the ground over.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} kneels and starts turning the ground over.`)
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    if (!result.ok && result.reason === 'engagement-conflict') {
      this.decline(context, 'Your hands are busy.', 'engagement-conflict');
      return;
    }
    this.decline(context, "You can't manage that just now.", 'start-rejected');
  }
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

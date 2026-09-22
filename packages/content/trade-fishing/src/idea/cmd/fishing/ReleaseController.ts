/**
 * ReleaseController — `release <fish>`: it goes back into the water and
 * back into the record. The fish must be one of the trade's (`Fish`),
 * held, and there must be a water here to put it in. Releasing an apex
 * is a chronicle deed.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { FishingController, FISHING_TOPIC } from './FishingController';
import Fish from '../../../agent/Fish';

interface ReleaseModel extends CommandModel {
  fish: MqlOneResult;
  shore?: MqlOneResult;
}

export default class ReleaseController extends FishingController<ReleaseModel> {
  async execute(model: ReleaseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const fish = model.fish?.stuff as Stuff | undefined;
    if (!fish || !(fish instanceof Fish)) {
      this.decline(context, "That isn't a fish you can release.", 'not-a-fish');
      return;
    }
    const reach = await this.reachFor(giver, model.shore);
    if (reach === null) {
      this.decline(context, 'There is no water here to release it into.', 'no-water');
      return;
    }
    // ⚠ Death is LAZY: the drain ends by opening a `dying` record and
    // cancelling itself, and that clock only advances when somebody
    // reads it (`look` does; `isDead()` does not). Ask the reconciling
    // read first, or a fish ten minutes dead in the hand goes "back"
    // into the record as a live count. The drive found it (run 23).
    // (`getDyingRemainingSec` reconciles; the death it expires fires a
    // beat later, async — a window with nothing left IS a dead fish.)
    const remaining = MixinApi.isVitals(fish) ? fish.getDyingRemainingSec() : null;
    const dead = (MixinApi.isOrganism(fish) && fish.isDead()) || (remaining !== null && remaining <= 0);
    if (dead) {
      this.decline(context, 'It is dead. The water will not have it back.', 'dead');
      return;
    }
    const registry = await this.registry();
    const species = fish.getSpecies();
    const speciesPath = species?.getTemplatePath() ?? '';
    const name = species?.getCommonNames()[0] ?? 'fish';
    if (registry !== null && speciesPath) {
      await registry.release(reach, speciesPath, 1, WorldClockApi.getNow().rawValue());
    }
    const apex = species?.getHabitat()?.role === 'apex';
    MessageApi.scene(giver)
      .topic(FISHING_TOPIC)
      .toSelf(Mml.compose`You let the ${name} go. It holds a moment in the shallows, then it is gone.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lets a ${name} go into the water.`)
      .send();
    StuffApi.destruct(fish);
    if (apex && MixinApi.isPersona(giver)) {
      void giver
        .recordDeed({
          template: 'Released a {{ species }} at {{ reach }}.',
          vars: { species: name, reach },
          tags: ['fishing', 'landmark'],
        })
        .catch(() => {});
    }
  }
}

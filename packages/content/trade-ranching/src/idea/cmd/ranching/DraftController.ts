/**
 * DraftController — `draft <n> [from <herd>]`, and ⭐⭐ **the act that
 * turns a number in a book into an animal.**
 *
 * D21's boundary act. The head exists as a deterministic function of the
 * herd's identity and its index, so it was always there; what drafting
 * does is give it a body to be looked at in.
 *
 * > **Identity is earned by being measured.** Head 17 drafted twice is
 * > the same animal, and the answer was true before anyone asked.
 *
 * ⚠ **The stockman's own word is what moves it.** There is no automatic
 * promotion, no "this one has become interesting" heuristic — you draft
 * a head because you decided to look at it, which is what makes the
 * management game about the tail rather than about the mean.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import HerdRegistry, { type HerdRecord } from '../../HerdRegistry';
import { HeadSeed } from '../../../lib/HeadSeed';
import type Livestock from '../../../agent/Livestock';

export const RANCHING_TOPIC = 'act.deed';

/** The row a drafted head is minted from. */
const LIVESTOCK_ROW = '/trade/ranching/agent/livestock';

/** The registry singleton's identity path. */
export const HERD_REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

interface DraftModel extends CommandModel {
  head?: string;
  herd?: string;
}

export default class DraftController extends CommandController<DraftModel> {
  async execute(model: DraftModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const registry = await this.registry();
    const herds = await registry.all();
    const herd = this.pickHerd(herds, model.herd);
    if (!herd) {
      this.decline(
        context,
        herds.length === 0
          ? Mml.compose`There is no herd filed that you could draft one out of.`
          : Mml.compose`You have no herd by that name.`,
        'no-herd',
      );
      return;
    }
    const index = Number.parseInt(model.head ?? '', 10);
    if (!Number.isInteger(index) || index < 0 || index >= herd.tally) {
      this.decline(
        context,
        Mml.compose`${herd.name} runs to ${herd.tally} head. There is no number ${model.head ?? '?'} in it.`,
        'no-such-head',
      );
      return;
    }
    if (herd.drafted.some((d) => d.index === index)) {
      this.decline(
        context,
        Mml.compose`Number ${index} is already out.`,
        'already-drafted',
      );
      return;
    }

    const animal = await this.mint(herd, index, giver);
    if (!animal) {
      this.decline(context, Mml.compose`You cannot get a rope on it.`, 'mint-failed');
      return;
    }
    await registry.draft(herd.herdId, index);

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`You cut number ${index} out of ${herd.name} and look it over. ${animal.stockmanRead()}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} cuts one out of the bunch and stands looking at it.`,
      )
      .send();
  }

  /**
   * Materialise the head. ⭐ **Seeded, never drawn** — the sample is a
   * pure function of `(herdId, index)`, folded over whatever the
   * register remembers about this head from the last time it was out.
   */
  private async mint(
    herd: HerdRecord,
    index: number,
    giver: Stuff,
  ): Promise<Livestock | null> {
    let animal: Livestock;
    try {
      animal = await StuffApi.clone<Livestock>(LIVESTOCK_ROW);
    } catch {
      return null;
    }
    const sample = HeadSeed.sample(
      {
        herdId: herd.herdId,
        // The herd's mean age moves with the world clock through each
        // head's own reconcile; what is seeded is the SPREAD around it.
        meanAgeDays: 400,
        femaleFraction: 0.85,
      },
      index,
      herd.overlay[String(index)],
    );

    animal.bindToHerd(herd.herdId, index);
    animal.setSpecies(
      StuffApi.findByTemplatePath<Species>(herd.speciesPath) ?? null,
    );
    animal.setLifecycleState('alive');
    animal.setAge(sample.ageDays);
    animal.handling = sample.handling;
    const flesh = animal.getReserve('flesh');
    if (flesh) {
      animal.adjustReserve(
        'flesh',
        Quantity.of(sample.flesh - flesh.current.rawValue(), '%'),
      );
    }

    const where = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (where && MixinApi.isContainer(where)) {
      ContainmentApi.move(
        animal as unknown as Stuff & Containable,
        where as Stuff & Container,
      );
    }
    return animal;
  }

  /** The named herd, or the only one there is. */
  private pickHerd(herds: readonly HerdRecord[], named?: string): HerdRecord | null {
    if (named) {
      const want = named.toLowerCase();
      return (
        herds.find(
          (h) => h.herdId.toLowerCase() === want || h.name.toLowerCase() === want,
        ) ?? null
      );
    }
    return herds.length === 1 ? (herds[0] as HerdRecord) : null;
  }

  protected async registry(): Promise<HerdRegistry> {
    const resident = StuffApi.findByTemplatePath<HerdRegistry>(HERD_REGISTRY_PATH);
    if (resident) return resident;
    return StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

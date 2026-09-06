/**
 * BreedController — `breed <animal>`, and ⭐⭐ **lambing in spring is a
 * consequence of the calendar** (D26, D11).
 *
 * Nobody authors a lambing date. A ewe is a short-day breeder, so her
 * conception window is stated in **daylength** — and the calendar, which
 * is real orbital geometry, decides when that happens. Add gestation and
 * the lambs arrive in late winter because that is when they arrive.
 *
 * ## ⚠⚠ It writes SERVED. It does not make lambs.
 *
 * The first cut incremented the tally the instant you typed the verb,
 * while telling you *"it will be 145 days"* — so gestation was announced
 * and not modelled, the offspring were born adult, and the herd was an
 * unbounded faucet for the length of a season. It also claimed the
 * offspring's character was *"seeded from its parentage… which gives
 * selection real traction"*, and that was simply false: the new head was
 * `hash(herdId#index)` and the parentage was a free-text note nothing
 * read. Breeding your best ewe and your worst gave statistically
 * identical lambs.
 *
 * ⭐ So this act now does the one true thing: **she is put to the male,
 * in season, and the book records it.** The herdbook's own ruled columns
 * are *number, dam, born, served, calved* — this writes the fourth. The
 * follow-on that owns gestation and heredity turns it into the fifth,
 * and lands on `bornAt` and `dam`, both of which already exist as seams.
 *
 * ⭐⭐ What survives whole is the best idea in the feature: **nobody
 * authors a lambing date.**
 *
 * ⚠ The refusal names the SEASON, and it names it in daylength rather
 * than in a month, because that is the fact: *"the days are still too
 * long; she will not take"* is something a player can act on, and *"it
 * is not April"* is not.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CelestialApi } from '@saxonberg/server/mud/api/celestial';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import HerdRegistry from '../../HerdRegistry';
import { RANCHING_TOPIC, HERD_REGISTRY_PATH } from './DraftController';
import type Livestock from '../../../agent/Livestock';

interface BreedModel extends CommandModel {
  target?: MqlOneResult;
}

export default class BreedController extends CommandController<BreedModel> {
  async execute(model: BreedModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.target?.stuff as Livestock | undefined;
    if (!animal || typeof animal.getLifeStage !== 'function') {
      this.decline(context, Mml.compose`That is not an animal you can breed.`, 'not-breedable');
      return;
    }
    const species = animal.getSpecies();
    const spec = species?.getBreeding() ?? null;
    if (!species || !spec) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(animal as unknown as Stuff)} does not breed in anybody's keeping.`,
        'no-breeding',
      );
      return;
    }
    if (!animal.isMature()) {
      // ⚠ Named as a stage, not as an age. A player who is told "she is
      // still a yearling" knows what to do; one told "age 214" does not.
      this.decline(
        context,
        Mml.compose`She is still a ${animal.getLifeStage() ?? 'youngster'}. Not yet.`,
        'not-mature',
      );
      return;
    }

    const where = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    const daylight = where
      ? await CelestialApi.daylightFractionAt(where)
      : 0.5;
    if (!species.breedsAtDaylight(daylight)) {
      // ⭐ The refusal is in DAYLENGTH, because that is the fact.
      this.decline(
        context,
        daylight > spec.daylightTo
          ? Mml.compose`The days are still too long. She will not take yet — wait for them to shorten.`
          : Mml.compose`The days are too short for her yet. She will come into season as they lengthen.`,
        'out-of-season',
      );
      return;
    }

    const herdId = animal.getHerdId?.() ?? '';
    if (!herdId) {
      this.decline(
        context,
        Mml.compose`She is not in anybody's herd, so there is nothing to write it in.`,
        'not-in-herd',
      );
      return;
    }
    const registry = await this.registry();
    const herd = await registry.read(herdId);
    if (!herd) {
      this.decline(context, Mml.compose`The book has no such herd.`, 'no-herd');
      return;
    }

    // ⚠⚠ **The TALLY DOES NOT MOVE.** Nothing is born here, because
    // nothing has gestated: what happened is that she was served, and
    // the only honest record of it is the date.
    const index = animal.getHeadIndex();
    const key = String(index);
    const nowS = this.nowSeconds();
    await registry.update({
      ...herd,
      overlay: {
        ...herd.overlay,
        [key]: { ...(herd.overlay[key] ?? {}), served: nowS },
      },
    });

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        // ⚠ It says what it DID. The gestation figure is the species'
        // and it is worth telling a keeper, but it is framed as the wait
        // it is rather than as a delivery that has already happened.
        Mml.compose`She takes. You write number ${index} in the book as served — ${spec.gestationDays} days, if she holds.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} puts one of the stock to the male and writes it in the book.`,
      )
      .send();
  }

  /** Game-seconds now, or `0` when there is no world clock yet. */
  private nowSeconds(): number {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return 0;
    return WorldClockApi.getNow().rawValue();
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

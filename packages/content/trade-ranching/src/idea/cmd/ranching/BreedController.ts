/**
 * BreedController — `breed <animal>`, and ⭐⭐ **lambing in spring is a
 * consequence of the calendar** (D26, D11).
 *
 * Nobody authors a lambing date. A ewe is a short-day breeder, so her
 * conception window is stated in **daylength** — and the calendar, which
 * is real orbital geometry, decides when that happens. Add gestation and
 * the lambs arrive in late winter because that is when they arrive.
 *
 * ⭐ **Breeding without heredity is multiplication**, so the offspring's
 * character is seeded from its **parentage** — the same field trick on a
 * different key. That gives selection real traction and approximately
 * correct response-to-selection, and the shared genome later replaces
 * the seeding function underneath an unchanged surface.
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
        Mml.compose`She is not in anybody's herd, so there is nothing to write the lambs into.`,
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

    // ⭐⭐ The tally grows, and the new head is seeded from the herd's
    // identity and its new index — so its character is a function of the
    // flock it came out of, which is heredity's shape even before the
    // genome exists. `overlay` carries the parentage note so a later
    // build can replace the seeding function without changing the
    // surface or losing the pedigree.
    const firstBorn = herd.tally;
    const born = Math.max(1, Math.round(spec.litter));
    await registry.update({
      ...herd,
      tally: herd.tally + born,
      overlay: {
        ...herd.overlay,
        ...Object.fromEntries(
          Array.from({ length: born }, (_, i) => [
            String(firstBorn + i),
            { note: `out of head ${animal.getHeadIndex()}` },
          ]),
        ),
      },
    });

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`She takes. It will be ${spec.gestationDays} days, and the book says ${born > 1 ? `${born} of them` : 'one'} out of number ${animal.getHeadIndex()}.`,
      )
      .send();
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

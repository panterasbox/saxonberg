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
import { RANCHING_TOPIC } from './DraftController';
import Livestock, { type ServeAnswer } from '../../../agent/Livestock';

type Composed = ReturnType<typeof Mml.compose>;

interface BreedModel extends CommandModel {
  target?: MqlOneResult;
}

/**
 * ⭐⭐ **She answers** (controller-liquidity W10): her species, her stage,
 * the daylength, her herd, her sex and the male by her, and the keeper's
 * book are `Livestock.serveBy`. This file is the words.
 */
export default class BreedController extends CommandController<BreedModel> {
  async execute(model: BreedModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.target?.stuff ?? null;
    if (!(animal instanceof Livestock)) {
      this.decline(context, Mml.compose`That is not an animal you can breed.`, 'not-breedable');
      return;
    }
    const out = await animal.serveBy(giver);
    if (!out.ok) {
      this.decline(context, BreedController.refusalWords(out, animal), out.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        // ⚠ It says what it DID: the gestation is the wait it is, not a
        // delivery that has already happened.
        Mml.compose`She takes. You write number ${out.index} in the book as served — ${out.gestationDays} days, if she holds.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} puts one of the stock to the male and writes it in the book.`)
      .send();
  }

  protected static refusalWords(r: Exclude<ServeAnswer, { ok: true }>, animal: Stuff): Composed {
    switch (r.reason) {
      case 'no-breeding':
        return Mml.compose`${Mml.thing(animal)} does not breed in anybody's keeping.`;
      case 'not-mature':
        // ⚠ Named as a stage, not as an age.
        return Mml.compose`She is still a ${r.stage}. Not yet.`;
      case 'out-of-season':
        // ⭐ The refusal is in DAYLENGTH, because that is the fact.
        return r.longDays
          ? Mml.compose`The days are still too long. She will not take yet — wait for them to shorten.`
          : Mml.compose`The days are too short for her yet. She will come into season as they lengthen.`;
      case 'not-in-herd':
        return Mml.compose`She is not in anybody's herd, so there is nothing to write it in.`;
      case 'no-herd':
        return Mml.compose`The book has no such herd.`;
      case 'not-female':
        return Mml.compose`That one is not a female. There is nothing to put to the male.`;
      case 'no-male':
        return Mml.compose`There is no male here to put her to. Bring her to one, or put her back with the herd.`;
      case 'not-keeper':
        return Mml.compose`${r.herdName} is not yours to write in.`;
      default: {
        const never: never = r;
        return Mml.compose`${String(never)}`;
      }
    }
  }

  protected decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

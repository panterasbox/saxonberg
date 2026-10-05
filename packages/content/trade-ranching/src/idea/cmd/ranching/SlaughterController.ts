/**
 * SlaughterController — `slaughter <animal>`, and ⭐⭐ **it is a kill and
 * nothing else.**
 *
 * ## What this replaced, and why it had to
 *
 * There used to be a `butcher` verb here as well as in the kitchen. Two
 * verbs of one name, and they had been designed by two builds that never
 * met:
 *
 *   - the stockyard's killed the animal AND took it apart, out of a
 *     module-level table of five hardcoded fractions that was the same
 *     for a hen and a bullock, crediting `stockmanship`, with no
 *     contamination anywhere;
 *   - the kitchen's took a *carcass* apart, off the species' own
 *     declared yield, crediting `butchery`, starting the spoilage clock
 *     at the kill and spilling gut flora by the butcher's band.
 *
 * So an animal gave different things depending on which word you typed at
 * it, neither answer was the animal's own, and `KNOWN_COLLISIONS` carried
 * the `butcher` collision with the note *"both trades — undiagnosed."*
 * It is diagnosed: **killing and dressing are two acts**, and the corpse
 * is the join between them.
 *
 * ⭐ Which is why this file is short. It reads the book, it kills, it
 * writes the book. `ConditionApi.die` mints the body — the same body a
 * fight, a fox, a fall or old age leaves — and `butcher` takes it apart
 * with a blade. A kill in the stockyard and a kill in a hedgerow now
 * produce the same object, on the same clock, cut by the same skill.
 *
 * ## ⚠ The ordering, and it is the substance
 *
 * Everything the record needs is read off the LIVE animal, because it
 * will not exist afterwards. Then the kill. Then the book.
 *
 * The reverse order is tempting — *write the record first, so a failed
 * write never loses an animal that is still in the book* was this file's
 * predecessor's own comment — and it is wrong here. A failed write after
 * the kill leaves a dead head still marked `drafted`: the herd is
 * over-counted by one, recoverable by hand, and nothing alive is lost. A
 * failed kill after the write leaves a live animal out of its own book,
 * which is a ghost.
 *
 * ## ⭐ Three refusals, and they do not read alike
 *
 * A person, an animal you named, and an animal with nothing on it are
 * three different noes, in that order. The named one is the whole of the
 * design's position on killing: *a number in the herdbook is easy to cull
 * and an animal you named is not* — and naming it is the player's act,
 * not the game's.
 *
 * ⚠ The view binds on `HandlingMixin` so the farm dog BINDS rather than
 * failing at the binder, because a refusal you cannot hear is not a
 * refusal. It is then refused for having no yield, which is the species'
 * answer and not a guard.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import { SpeciesApi } from '@saxonberg/server/mud/api/species';
import HerdRegistry from '../../HerdRegistry';
import { RANCHING_TOPIC, HERD_REGISTRY_PATH } from './DraftController';
import { STOCKMANSHIP } from './HandleController';

interface SlaughterModel extends CommandModel {
  target?: MqlOneResult;
}

export default class SlaughterController extends CommandController<SlaughterModel> {
  async execute(model: SlaughterModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.target?.stuff;

    if (!animal) {
      this.decline(
        context,
        Mml.compose`You don't see any '${model.target?.raw ?? ''}' here.`,
        'no-target',
      );
      return;
    }

    if (!MixinApi.isOrganism(animal) || !animal.isAlive()) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(animal)} is not something you slaughter.`,
        'not-an-animal',
      );
      return;
    }

    // ⚠⚠ **Warm the species before asking it anything.** A `Species` Idea
    // is not resident at boot and `SpeciesApi.isSentient` answers FALSE
    // for one that is not — the reference-Ideas-inert-at-boot trap, which
    // has recurred three times and which the kitchen's `butcher` already
    // guards against for exactly this reason. Without it the sentience
    // refusal fails OPEN.
    await SpeciesApi.preloadAnatomy(animal);
    const species = animal.getSpecies();
    if (!species) {
      this.decline(
        context,
        Mml.compose`You cannot make out what ${Mml.thing(animal)} is, and you are not putting a knife into that.`,
        'unidentified-species',
      );
      return;
    }

    if (SpeciesApi.isSentient(animal)) {
      this.decline(
        context,
        Mml.compose`You put the knife away. Whatever ${Mml.thing(animal)} is, it is somebody.`,
        'sentient',
      );
      return;
    }

    // ⭐⭐ **A named animal is refused, and the refusal is the design.**
    // `Livestock` is not `Named`; a `KeptAnimal` is, and a name arrives
    // only when a player gives one to an animal that chose to follow
    // them. So this cannot fire on a head out of the herdbook and always
    // fires on the dog you called Moss.
    if (MixinApi.isNamed(animal) && (animal.getName() ?? '') !== '') {
      this.decline(
        context,
        Mml.compose`That is ${Mml.thing(animal)}. You named it, and it is not meat.`,
        'named-animal',
      );
      return;
    }

    // ⭐ The species' own answer, and an empty yield is authored rather
    // than missing: *there is nothing here worth cutting.* This is what
    // refuses the working collie without anybody writing a list of
    // animals you may not eat.
    if (species.getButcheryYield().length === 0) {
      this.decline(
        context,
        Mml.compose`There is nothing on ${Mml.thing(animal)} worth the killing.`,
        'no-yield',
      );
      return;
    }

    // ⚠ Read the record's half BEFORE the kill. Afterwards there is no
    // object left to ask.
    const herdId =
      typeof animal.getHerdId === 'function' ? (animal.getHerdId() ?? '') : '';
    const index =
      typeof animal.getHeadIndex === 'function'
        ? (animal.getHeadIndex() ?? -1)
        : -1;
    const flesh = MixinApi.isReserved(animal)
      ? animal.getReserve('flesh')?.current.rawValue()
      : undefined;
    const handling =
      typeof animal.getHandling === 'function'
        ? animal.getHandling()
        : undefined;
    const presentation = animal.getPresentation();

    // ⭐ ONE lethal call, and it is the same one a fight makes. Everything
    // a death does — the body, the ledger row, the deed, the engagements
    // it cancels — happens there and happens once.
    await ConditionApi.die(animal, 'slaughtered');

    if (herdId && index >= 0) {
      try {
        const registry = await this.registry();
        const wrote = await registry.returnHead(herdId, index, {
          note: 'slaughtered',
          ...(flesh !== undefined ? { flesh } : {}),
          ...(handling !== undefined ? { handling } : {}),
        });
        if (wrote) {
          const back = await registry.read(herdId);
          if (back) {
            await registry.update({
              ...back,
              tally: Math.max(0, back.tally - 1),
            });
          }
        }
      } catch (err) {
        // ⚠ The animal is already dead and the body is already standing
        // there. An over-counted herd is recoverable; a thrown command on
        // top of a completed kill is not useful to anybody.
        console.warn('SlaughterController: the book write failed:', err);
        context.note({
          kind: 'controller-rejected',
          reason: 'book-write-failed',
          detail: `${herdId}/${String(index)} stays drafted`,
        });
      }
    }

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`It is quick. ${presentation} goes down where it stood, and what is left is a body.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} slaughters ${presentation}.`)
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: STOCKMANSHIP,
        difficulty: 'standard',
        outcome: 'success',
      });
    }
  }

  protected async registry(): Promise<HerdRegistry> {
    return StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(RANCHING_TOPIC)
      .toSelf(prose)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

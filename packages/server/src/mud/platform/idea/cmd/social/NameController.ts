/**
 * NameController — `name <animal> <name>`, and ⭐⭐ **the promotion.**
 *
 * This is the single most important act in the build. Before it the
 * animal is real, present and interactable, and the world keeps no
 * record of it whatsoever: no title, no key, no persistence, and a
 * regard for you that lives only in memory. After it, it is a keyed,
 * titled, named host that comes back as itself.
 *
 * ⭐ **Identity and durability arrive together**, and that is literally
 * four statements in one method rather than a doctrine:
 *
 *  1. `setName` — and from here its name is public to everybody (an
 *     animal's name is public knowledge; see `belief.md`);
 *  2. `stampChattel` — title and chain of title, and ⚠ the moment its
 *     metabolic clock starts integrating your absences, because
 *     `integratesLongAbsence()` is *"yes iff somebody owns it"*. Naming
 *     an animal is taking responsibility for it, and the engine already
 *     said so before this build existed;
 *  3. an explicit persistence key and a recorded place;
 *  4. its first capture.
 *
 * ⚠ **You may not name an animal that has not chosen you.** Two gates:
 * a bond at or above `NAME_BOND`, and *it has followed you home at least
 * once*. The second is the one that matters — it cannot be bought with
 * food, only with the animal deciding to come with you. That is what
 * makes naming feel earned rather than administrative, and it is why
 * adoption is inverted here: the animal adopts you.
 *
 * ⭐ The naming is a **witnessed act**: everyone present learns the name,
 * the `introduce` shape exactly. A name nobody heard given is a private
 * label, and this is not that.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SecurityApi } from '../../../../api/security';
import { PersistableApi } from '../../../../api/persistable';
import { PlayerApi } from '../../../../api/player';
import { NAME_BOND } from '../../../../lib/husbandry/Bonded';

const TOPIC = 'act.deed';

interface NameModel extends CommandModel {
  target?: MqlOneResult;
  animalName?: string;
}

export default class NameController extends CommandController<NameModel> {
  async execute(model: NameModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const animal = model.target?.stuff;
    const wanted = (model.animalName ?? '').trim();

    if (!animal || !MixinApi.isBonded(animal) || !MixinApi.isNamed(animal)) {
      this.refuse(context, TOPIC, `That isn't an animal you can name.`, 'not-nameable');
      return;
    }
    if (!wanted) {
      this.refuse(context, TOPIC, `Name it what?`, 'no-name-given');
      return;
    }
    if (animal.getName()) {
      this.refuse(
        context,
        TOPIC,
        `It already has a name.`,
        'already-named',
      );
      return;
    }

    // ⚠ Both gates, one sentence. "It has not chosen you" is the honest
    // description of either failure, and the player's remedy for both is
    // the same: spend more time with it.
    const followed = animal
      .getFollowedKeys()
      .includes(actor.getIdentityPath() ?? '');
    if (animal.bondWith(actor) < NAME_BOND || !followed) {
      this.refuse(
        context,
        TOPIC,
        `It has not chosen you.`,
        'not-chosen',
      );
      return;
    }

    // ⚠ Partial name defence — a connected player's name may not be
    // taken. The live-`Cast` half wants a name index nobody has built;
    // the naming slate owns the real defence (Defence B).
    const clash = PlayerApi.connectedAvatars().some(
      (a) => (a.getName() ?? '').toLowerCase() === wanted.toLowerCase(),
    );
    if (clash) {
      this.refuse(
        context,
        TOPIC,
        `Somebody already goes by that name.`,
        'name-taken',
      );
      return;
    }

    // ── the promotion, in order ──
    animal.setName(wanted);

    if (MixinApi.isChattel(animal)) {
      await animal.stampChattel(actor);
    }
    if (MixinApi.isPersistable(animal)) {
      // The key BEFORE the place: the place write stamps the residency
      // pin onto the chattel row, and the pin is `(scope, key)`.
      animal.setPersistenceKey(SecurityApi.uuid(), true);
    }
    if (MixinApi.isChattel(animal)) {
      await animal.setChattelPlace(PersistableApi.placeIdOf(animal));
    }
    if (MixinApi.isPersistable(animal)) {
      await PersistableApi.capture(animal);
    }

    // ⭐ Witnessed: everybody who can PERCEIVE it learns the name, so a
    // neighbour can return it to you later. This is the second route home.
    //
    // ⚠ `MessageApi.getSensors` is the same set the scene below reaches —
    // the `introduce` shape exactly. This was a private `witnesses()`
    // walking `room.getContents()`, which is both bespoke and wrong: the
    // room's contents include the saucer and the food, and it would have
    // called `learnIdentityOf` on the crockery.
    const room = MixinApi.isContainable(animal) ? animal.getContainer() : null;
    if (room) {
      for (const witness of MessageApi.getSensors(room)) {
        if (witness.stuffId === animal.stuffId) continue;
        if (MixinApi.isBeliefStore(witness)) {
          witness.learnIdentityOf(animal, wanted);
        }
      }
    }

    // ⚠ The `handle` form, not the default `concise`: the ref is late-bound
    // and the animal is ALREADY named by the time the scene renders, so the
    // ordinary identity read "You name Mouse Mouse" (found live). The handle
    // chain is keyword → job → species and never the name, so this is "the
    // cat" both before and after — which is what the sentence means.
    const it = Mml.actor(animal, { form: 'handle' });
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You name ${it} ${wanted}.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} names ${it} ${wanted}.`)
      .send();
  }

}

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
 * ⚠ **You may not name an animal that has not chosen you.** A bond at
 * or above `NAME_BOND`, and one of two routes home: *it has followed you
 * home at least once*, or *its home was earned* — fed in one place for
 * three distinct days, and it is there now (the only route an animal
 * that cannot walk has — `Bonded.hasChosen`). Neither can be bought
 * with a single meal; both are the animal deciding to stay. That is
 * what makes naming feel earned rather than administrative, and it is
 * why adoption is inverted here: the animal adopts you.
 *
 * ⭐ The naming is a **witnessed act**: everyone present learns the name,
 * the `introduce` shape exactly. A name nobody heard given is a private
 * label, and this is not that.
 *
 * ⭐⭐ **Who may name is the THING's to say** (ceramics W2): `Named.
 * canBeNamedBy(hand, by)`, overridden by each rule's holder — `Crafted`
 * (its maker, once, while it has none: *"name jug Mother's jug"*),
 * `Assembled` (the hand whose reforge took its name, repair D18) and
 * `Bonded` (the person it has chosen). ⭐ And the act is the thing's too
 * (controller-liquidity W8): `Named.takeName(name, by)`, which `Bonded`
 * overrides with the promotion. This controller narrows on no class; it
 * words what the thing answered.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { NameRefusalReason } from '../../../../lib/description/Named';

const TOPIC = 'act.deed';

interface NameModel extends CommandModel {
  target?: MqlOneResult;
  animalName?: string;
}

export default class NameController extends CommandController<NameModel> {
  async execute(model: NameModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const target = model.target?.stuff;
    const wanted = (model.animalName ?? '').trim();
    // ⚠ The view's arg takes anything (`requires: any`), so the check is
    // here: a thing that bears no name at all (a pail) is refused in its
    // own words.
    if (!target || !MixinApi.isNamed(target)) {
      this.refuse(context, TOPIC, NameController.refusalLine('not-nameable'), 'not-nameable');
      return;
    }
    const answer = await target.takeName(wanted, actor);
    if (!answer.ok) {
      this.refuse(context, TOPIC, NameController.refusalLine(answer.reason), answer.reason);
      return;
    }
    if (answer.facts.promoted) {
      // ⚠ The `handle` form, not the default `concise`: the ref is
      // late-bound and the animal is ALREADY named by the time the scene
      // renders, so the ordinary identity read "You name Mouse Mouse"
      // (found live). The handle chain is keyword → job → species and never
      // the name, so this is "the cat" both before and after.
      const it = Mml.actor(target, { form: 'handle' });
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You name ${it} ${wanted}.`)
        .toPeers(Mml.compose`${Mml.actor(actor)} names ${it} ${wanted}.`)
        .send();
      return;
    }
    const it = Mml.thing(target, { form: 'handle' });
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You give ${it} its name: ${wanted}. It will answer to it.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} names ${it} ${wanted}.`)
      .send();
  }

  /** The sentence for each refusal. */
  protected static refusalLine(reason: NameRefusalReason): string {
    switch (reason) {
      case 'not-nameable':
        return `That isn't something you can name.`;
      case 'no-name-given':
        return `Name it what?`;
      case 'already-named':
        return `It already has a name.`;
      // ⚠ Every gate, one sentence: the remedy for all of them is the same
      // — spend more time with it.
      case 'not-chosen':
        return `It has not chosen you.`;
      case 'name-taken':
        return `Somebody already goes by that name.`;
      default: {
        const never: never = reason;
        return never;
      }
    }
  }
}

/**
 * `feeds` brain — ⭐⭐ **it eats, or it doesn't, and you never learn why.**
 *
 * Cadence. Looks for a `Feeder` in the room holding something edible, or
 * food somebody set down for it, and decides.
 *
 * ⚠⚠ **The refusal is one sentence for four different reasons** — not
 * hungry, turned, or something only its nose can find. That is the
 * single most important line in this file. An animal that told you *why*
 * would be a contamination detector you can read off; an animal that
 * sometimes will not eat is an animal. You watch it, and you decide what
 * you think. See `Bonded.wouldEat`.
 *
 * ⚠⚠ **And the guard that keeps the lane's stray alive.** A metabolism
 * read RECONCILES — it integrates elapsed time — and for a stamped
 * animal it integrates the whole absence. So this beat must return
 * *before touching metabolism* when there is nothing to eat and nobody
 * owns it, or the beat itself would starve the unnamed cat on the lane
 * in a real afternoon of uptime. ⭐ A reviewer adding "just check whether
 * it's hungry first" reintroduces exactly that, which is why the order
 * is asserted by a test.
 *
 * ⭐ Food from a BOWL credits nobody and moves where home is. Food from a
 * HAND credits the hand. That asymmetry is the design: the one thing you
 * cannot delegate is attention.
 *
 * ⭐⭐ **Two things the animal does, not the keeper.**
 *
 * **It steps back.** Below `steady` it eats off the ground or from a bowl
 * only when every person in the room is one it knows
 * (`Bonded.feelsSafeToEatAmong`). "It waits until you step back" was a
 * sentence over a brain that ate on cadence with you standing over it;
 * now the sentence is true, and the loop it promises — set it down, walk
 * away, come back, it is gone — exists.
 *
 * **It asks.** Hungry, nothing to eat, somebody here: it goes to whoever
 * is present — the one it likes best if there are several, a stranger if
 * that is who there is — and makes it known, once, on the transition.
 * This is the flip from a pet you act ON to an animal with needs you
 * RESPOND to: the verbs answer the ask. ⚠ Only a STAMPED animal asks,
 * because asking reads hunger and a hunger read reconciles — the guard
 * above. The lane's stray does not beg because, by the same guard, it
 * does not get hungry; when the lane has a food source, both go together.
 *
 * config: none.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import type { Stuff } from '../stuff/Stuff';
import type { Bonded } from '../husbandry/Bonded';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { WorldClockApi } from '../../api/worldclock';
import { PersistableApi } from '../../api/persistable';

const SECONDS_PER_GAME_DAY = 86_400;

export const brain = class {
  static label = 'feeds';
  static claims: readonly EngagementSlot[] = ['body'];
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isBonded(host) || !MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;

    // ── what is within reach, before anything reads a clock ──
    //
    // ⭐⭐ **By the ways its species eats, and no others.** A canary feeds
    // at a hopper and will not hop down for a scrap on the floor; a
    // collie eats anything anywhere. Before the feeding-style axis every
    // animal fed identically and the difference between a bird and an ox
    // was nothing at all.
    const here = [...room.getContents()];
    const people = here.filter(
      (t) =>
        t !== (host as unknown as Stuff) &&
        (MixinApi.isHasInteractive(t) || MixinApi.isPersona(t)),
    );
    const fromVessel = foodInVessel(here, host);
    const loose = host.feedsBy('ground')
      ? (here.find((t) => t !== (host as unknown as Stuff) && edible(t)) ??
        null)
      : null;
    const found = fromVessel ?? loose ?? null;
    // The step-back rule: food it will not go to with these people here
    // is, for this beat, no food.
    const food = found && host.feelsSafeToEatAmong(people) ? found : null;

    // ⚠⚠ THE GUARD. Nothing to eat and nobody owns it: leave without
    // reading metabolism at all. See the class doc.
    if (!food) {
      if (!(MixinApi.isChattel(host) && host.isStamped())) return;
      if (MixinApi.isOrganism(host)) host.reconcileSenescence();
      // The ask — hungry, nothing it can get at, somebody here. Never while
      // food it is only WAITING on lies there: it waits, it does not beg.
      if (found || !host.isHungry() || people.length === 0) {
        host.setAskingOf(null);
        return;
      }
      const target = people.reduce((best, p) =>
        MixinApi.isBeliefStore(host) &&
        host.regardFor(p) > host.regardFor(best)
          ? p
          : best,
      );
      if (host.setAskingOf(target)) {
        const feeder = emptyFeeder(here, host);
        MessageApi.scene(host)
          .topic('act.deed')
          .toTarget(
            target,
            feeder
              ? Mml.compose`${Mml.actor(host)} goes to the empty ${Mml.thing(feeder)} and looks up at you.`
              : Mml.compose`${Mml.actor(host)} comes and sits at your feet, looking up at you.`,
          )
          .toPeers(
            feeder
              ? Mml.compose`${Mml.actor(host)} goes to the empty ${Mml.thing(feeder)} and looks up at ${Mml.actor(target)}.`
              : Mml.compose`${Mml.actor(host)} goes to ${Mml.actor(target)} and sits at their feet, looking up.`,
          )
          .send();
      }
      return;
    }
    host.setAskingOf(null);

    const refusal = host.wouldEat(food);
    if (refusal) {
      // ⭐ ONE sentence. Four reasons. Never says which.
      MessageApi.scene(host)
        .topic('act.deed')
        .toPeers(Mml.compose`${Mml.actor(host)} sniffs at ${Mml.thing(food)} and walks off.`)
        .send();
      if (MixinApi.isOrganism(host)) host.reconcileSenescence();
      return;
    }

    const ate = await host.eatFood(food, null);
    if (ate) {
      MessageApi.scene(host)
        .topic('act.deed')
        .toPeers(Mml.compose`${Mml.actor(host)} eats.`)
        .send();
      // ⭐ A meal here is a day toward this being home. Only from a
      // FEEDER: scraps on the floor are not keeping an animal.
      if (fromVessel) {
        const day = Math.floor(
          WorldClockApi.getNow().rawValue() / SECONDS_PER_GAME_DAY,
        );
        host.creditHomeCandidate(PersistableApi.placeIdOf(room), day);
      }
    }
    if (MixinApi.isOrganism(host)) host.reconcileSenescence();
  }
} satisfies BrainStatics;

/** ⭐ The thing answers. See `Tangible.isEdible`. */
function edible(thing: Stuff): boolean {
  return MixinApi.isTangible(thing) && thing.isEdible();
}

/** A feeder of this animal's rung with nothing in it — where it goes to ask. */
function emptyFeeder(here: readonly Stuff[], host: Stuff & Bonded): Stuff | null {
  for (const thing of here) {
    if (!MixinApi.isFeeder(thing)) continue;
    if (!host.feedsBy(thing.getFeederKind())) continue;
    if (thing.offerings().length === 0) return thing;
  }
  return null;
}

/**
 * The first edible thing in a vessel of a kind this animal eats from.
 *
 * ⭐ The vessel answers what is in it (`offerings()`) rather than the
 * brain rummaging through its contents — a read that belongs to one
 * object lives on that object. ⚠ And the KIND is checked: a canary at a
 * horse trough is not a fed canary.
 */
function foodInVessel(here: readonly Stuff[], host: Stuff & Bonded): Stuff | null {
  for (const thing of here) {
    if (!MixinApi.isFeeder(thing)) continue;
    if (!host.feedsBy(thing.getFeederKind())) continue;
    const offered = thing.offerings();
    if (offered.length > 0) return offered[0]!;
  }
  return null;
}

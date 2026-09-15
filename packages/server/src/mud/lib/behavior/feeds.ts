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
 * config: none.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import type { Stuff } from '../stuff/Stuff';
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
    const here = [...room.getContents()];
    const fromBowl = brainFoodInFeeder(here);
    const loose = here.find(
      (t) => t !== (host as unknown as Stuff) && edible(t),
    );
    const food = fromBowl ?? loose ?? null;

    // ⚠⚠ THE GUARD. Nothing to eat and nobody owns it: leave without
    // reading metabolism at all. See the class doc.
    if (!food) {
      if (!(MixinApi.isChattel(host) && host.isStamped())) return;
      if (MixinApi.isOrganism(host)) host.reconcileSenescence();
      return;
    }

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
      if (fromBowl) {
        const day = Math.floor(
          WorldClockApi.getNow().rawValue() / SECONDS_PER_GAME_DAY,
        );
        host.creditHomeCandidate(PersistableApi.placeIdOf(room), day);
      }
    }
    if (MixinApi.isOrganism(host)) host.reconcileSenescence();
  }
} satisfies BrainStatics;

/** Whether a thing is made of something anything would eat. */
function edible(thing: Stuff): boolean {
  if (!MixinApi.isTangible(thing)) return false;
  return thing.getMaterial()?.getEdibility() === true;
}

/** The first edible thing sitting in a feeding vessel in this room. */
function brainFoodInFeeder(here: readonly Stuff[]): Stuff | null {
  for (const thing of here) {
    if (!MixinApi.isFeeder(thing) || !MixinApi.isContainer(thing)) continue;
    for (const inner of thing.getContents()) {
      if (edible(inner)) return inner;
    }
  }
  return null;
}

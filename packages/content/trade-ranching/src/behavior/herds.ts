/**
 * `herds` brain (`/trade/ranching/behavior/herds`) — ⭐⭐ **a working dog
 * substitutes for player ATTENTION** (D41), which is the scarcest thing
 * on a farm and the one the automation ladder is really about.
 *
 * One shepherd with a good dog handles a flock that would otherwise need
 * several people. That is the whole of it, and it is why the dog is a
 * **fourth rung** on a ladder whose other three are attention, wages and
 * compute:
 *
 * > **Automation maintains your assets and cannot maintain your
 * > relationships** — and the dog is the rung that costs one.
 *
 * ⭐⭐ **A poorly handled dog works badly**, and that is what gives the
 * bond an economic consequence **without giving any livestock a bond
 * stat**. The slate's divergence survives intact and the pet gets a job:
 * this is the one place pets and livestock touch mechanically, and it is
 * why the family is one substrate.
 *
 * ⚠ What the dog actually does is quiet the stock around it — the same
 * `handle` an hour of somebody's time would have bought, delivered by
 * standing there. It cannot do the acts that need judgement about THIS
 * animal (the draft, the cull, the paddock move); those are the
 * batchable test's other side and stay the player's.
 *
 * config: `{ reach?: number }` — how much handling one beat is worth at
 * a perfectly bonded dog. Default is deliberately small: a dog is worth
 * having over a season, not over an afternoon.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

/** Handling one beat buys, at a dog that is perfectly bonded. */
const DEFAULT_REACH = 0.02;

export const brain = class {
  static label = 'herds';
  /**
   * ⚠ Unwatched, like every real chore: the dog works whether or not
   * anybody is in the field, which is the entire reason it is worth
   * keeping.
   */
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const dog = ctx.host as Stuff;
    if (dog.isDestroyed() || !MixinApi.isContainable(dog)) return;
    const room = dog.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;

    // ⭐⭐ THE line: the dog's own handling scales what it is worth. A dog
    // nobody has worked with is a dog running about in the sheep.
    const own = (dog as unknown as { getHandling?(): number }).getHandling?.() ?? 0;
    if (own <= 0) return;
    const config = (ctx.config ?? {}) as { reach?: number };
    const reach = (config.reach ?? DEFAULT_REACH) * own;

    let worked = 0;
    for (const beast of room.getContents()) {
      if (beast === dog) continue;
      const stock = beast as unknown as { handle?(q: number): number };
      if (typeof stock.handle !== 'function') continue;
      stock.handle(reach);
      worked += 1;
    }
    if (worked === 0) return;

    // ⚠ A badly bonded dog is not silent about it, because that is the
    // only way a keeper finds out before the shearing.
    MessageApi.scene(dog)
      .topic('sense.ambient')
      .toPeers(
        own > 0.6
          ? Mml.compose`${Mml.thing(dog)} moves the stock a few yards without any of them lifting their heads.`
          : Mml.compose`${Mml.thing(dog)} rushes in too close and the whole lot of them go up the field at a trot.`,
      )
      .send();
  }
};

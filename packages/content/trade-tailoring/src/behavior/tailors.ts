/**
 * The tailor's beat — ⭐ **the one demonstrator brain, and the ONLY
 * place dress becomes an opinion.**
 *
 * ## ⚠⚠ There is no kernel gauge from dress to regard, and there must
 * not be
 *
 * `measurement.md`'s split is **engine measures · subject values**. The
 * engine knows five real facts about how somebody is dressed — grade,
 * condition, fit, colour and mark — and every one of them is a
 * measurement of an object. What any of it *means* is a person's, and
 * a different shopkeeper could reasonably read the same facts the other
 * way.
 *
 * So this brain is a demonstration, not an implementation: it shows
 * that a character CAN notice, in a pack, where an author can disagree
 * with it. Nothing in the kernel converts a coat into standing.
 *
 * ⭐ And what Vasca notices is professional rather than snobbish. She
 * reads FIT, because fit is her trade — a well-cut coat on the wrong
 * body is the thing she cannot stop seeing.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'social.remark';

export const brain = class TailorsBrain {
  static label = 'tailors';
  static claims: string[] = ['voice'];
  static requiresFree: string[] = [];

  /**
   * Look at whoever is in the shop and remark on how their clothes sit
   * — never on what they cost.
   */
  static async act(self: Stuff): Promise<void> {
    if (!MixinApi.isContainable(self)) return;
    const room = self.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;

    for (const other of room.getContents()) {
      if (other === self) continue;
      if (!MixinApi.isSlotted(other)) continue;
      const worn = other.wornStack();
      if (worn.length === 0) continue;

      // ⭐ FIT, not price. A tailor notices the thing she is paid to
      // notice, and it is a professional read rather than a snobbish
      // one — which is also why this is content and not a mechanism.
      let worst = 0;
      for (const garment of worn) {
        const asStuff = garment as unknown as Stuff;
        if (!MixinApi.isWearable(asStuff)) continue;
        const fit = asStuff.fitOn(other as unknown as Stuff);
        if (fit.measurable) worst = Math.max(worst, fit.distance);
      }
      if (worst < 0.12) continue;

      MessageApi.scene(self)
        .topic(TOPIC)
        .toPeers(
          worst > 0.3
            ? Mml.compose`${Mml.actor(self)} looks at your shoulders for slightly too long and says nothing at all.`
            : Mml.compose`${Mml.actor(self)} glances at how your coat sits and makes a small noise she probably did not intend you to hear.`,
        )
        .send();
      return;
    }
  }
};

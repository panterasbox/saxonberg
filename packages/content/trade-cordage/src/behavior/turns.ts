/**
 * `turns` brain (`/trade/cordage/behavior/turns`) — **the ropekeeper at the
 * wheel** (cordage, the review's lens pass: a ropewalk is a crew).
 *
 * While somebody else is at the walk, the keeper takes the jack's wheel if
 * nobody has it, so whoever lays walks at full pace; when the walk is empty
 * again she lets it go. She turns with the same verb a player types (`turn
 * jack`), and a player who takes the seat (`apply` to the ropewalk as its
 * wheel-hand) takes her place at it.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import RopeJack from '../thing/RopeJack';

export const brain = class {
  static label = 'turns';
  static kind: TaskKind = 'work';
  static summary = 'Turns the ropewalk jack\'s wheel for whoever is laying rope.';
  static claims: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'turns the jack for the walk');
  }
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host as Stuff;
    if (host.isDestroyed() || !MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (room === null || !MixinApi.isContainer(room)) return;
    const here = room.getContents() as Stuff[];
    const jack = here.find((c): c is RopeJack => c instanceof RopeJack);
    if (!jack) return;
    const company = here.some((c) => c !== host && c.isAgent?.() && !c.isDestroyed());
    const hand = jack.getWheelHand();
    if (company && hand === null) {
      await host.executeCommand('turn jack');
      return;
    }
    if (!company && hand === host) await host.executeCommand('turn back jack');
  }
};

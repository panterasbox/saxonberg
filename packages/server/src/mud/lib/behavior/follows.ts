/**
 * `follows` brain — ⭐⭐ **it goes with you, because it wants to.**
 *
 * Witness trigger on `departure`. When somebody it is bonded to leaves
 * the room, it goes too — and that act is the whole taming ladder's last
 * rung: following you home at least once is what earns the right to name
 * it. You cannot buy that with food.
 *
 * ⚠ **It stops at a threshold it does not like**, and the line names the
 * ACT and never the cause: *"it stops at the doorway and will not go
 * in."* Not "senses a trap", not "smells poison", not "is afraid of the
 * gas". ⭐⭐ The whole value of an animal as an instrument is that it
 * reacts and you interpret — the moment the engine interprets for you,
 * you have a trap detector rather than a dog, and the player stops
 * looking at the animal. A reviewer grepping this file for `danger`,
 * `trap`, `poison` or `bad air` must find nothing.
 *
 * ⚠ `waiting` holds it: an animal told to stay does not follow.
 *
 * config: none.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import { MixinApi } from '../../api/mixin';
import { LocomotionApi } from '../../api/locomotion';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { FOLLOW_BOND } from '../husbandry/Bonded';

/** The one line a refusal to cross a threshold ever produces. */
const BALKS = 'stops at the doorway and will not go in.';

export const brain = class {
  static label = 'follows';
  static claims: readonly EngagementSlot[] = ['body'];

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    const leaver = ctx.perceived?.subject;
    if (!leaver) return;
    if (!MixinApi.isBonded(host) || host.isWaiting()) return;
    if (!MixinApi.isMobile(host) || !MixinApi.isContainable(host)) return;
    if (host.bondWith(leaver) < FOLLOW_BOND) return;

    const room = host.getContainer();
    if (!room || !MixinApi.isExitable(room)) return;
    const wherever = MixinApi.isContainable(leaver)
      ? leaver.getContainer()
      : null;
    if (!wherever || wherever === room) return;

    for (const exit of room.getExits().values()) {
      if (exit.getDestination() !== wherever) continue;
      if (!exit.canTraverse(host, 'walk').ok) return;

      // ⚠ It looks at where it is GOING, and reacts. It is not told
      // anything, and it tells you nothing.
      if (MixinApi.isContainer(wherever)) {
        const balks = [...wherever.getContents()].some(
          (thing) => MixinApi.isHazard(thing) && thing.isArmed(),
        );
        if (balks) {
          MessageApi.scene(host)
            .topic('act.deed')
            .toPeers(Mml.compose`${Mml.actor(host)} ${BALKS}`)
            .send();
          return;
        }
      }

      try {
        await LocomotionApi.traverseWithDefault(host, exit);
        host.rememberFollowed(leaver);
      } catch {
        // Blocked between the check and the step — hold position.
      }
      return;
    }
  }
} satisfies BrainStatics;

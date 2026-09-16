/**
 * `homes` brain — ⭐⭐ **it makes its own way back, one room at a time.**
 *
 * Cadence. If it has a home, is not there, is not waiting, and nobody it
 * is bonded to is standing with it, it takes **one step** toward home
 * per beat — visibly, room by room, through doors that happen to be
 * open.
 *
 * ⭐ One step per beat is the whole feel of it: an animal making its way
 * home is something you can walk past and see, and something you can
 * intercept. A teleport home would be the same outcome and none of the
 * experience.
 *
 * ⭐⭐ **And this is the entire implementation of "lost".** There is no
 * lost flag, no lost timer and no announcement. If every path home
 * crosses a closed door, the search finds nothing and the animal stays
 * where it is — which is what being lost IS. Somebody has to notice.
 * ⚠ Which also means: *a closed door is the whole of containment.* You
 * keep an animal by keeping it, not by setting a property.
 *
 * ⚠ It does not leave while its person is here. An animal following you
 * around town is not lost, and should not set off for home mid-walk.
 *
 * config: `{ hops?: number }` — how far to look (default 8).
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import { MixinApi } from '../../api/mixin';
import { LocomotionApi } from '../../api/locomotion';
import { PersistableApi } from '../../api/persistable';
import { FOLLOW_BOND } from '../husbandry/Bonded';

/** How many rooms out to look for a way home. */
const DEFAULT_HOPS = 8;

export const brain = class {
  static label = 'homes';
  static claims: readonly EngagementSlot[] = ['body'];
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isBonded(host) || host.isWaiting()) return;
    if (!MixinApi.isMobile(host) || !MixinApi.isContainable(host)) return;
    const home = host.getHome();
    if (!home) return;

    const room = host.getContainer();
    if (!room || !MixinApi.isExitable(room)) return;
    if (PersistableApi.placeIdOf(room) === home) return;

    // ⚠ Its person is here — it is not lost, it is WITH somebody.
    if (MixinApi.isContainer(room)) {
      for (const other of room.getContents()) {
        if (host.bondWith(other) >= FOLLOW_BOND) return;
      }
    }

    const hops =
      typeof ctx.config.hops === 'number' ? ctx.config.hops : DEFAULT_HOPS;
    // ⭐ The body works out its own step — see `Mobile.firstStepToward`.
    const first = host.firstStepToward(home, hops);
    if (!first) return; // no way through: it stays. That is "lost".
    try {
      await LocomotionApi.traverseWithDefault(host, first);
    } catch {
      // Something closed between the search and the step. Try next beat.
    }
  }
} satisfies BrainStatics;

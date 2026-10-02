/**
 * `homes` brain — ⭐⭐ **it makes its own way back, because it knows the
 * way.**
 *
 * Cadence. Each beat it notes where it is standing, and if it is not
 * home, not waiting, and nobody it is bonded to is here, it takes **one
 * visible step** toward the closest place it remembers.
 *
 * ⭐⭐ **This is memory, not pathfinding, and that was a deliberate
 * choice.** The first version searched the room graph breadth-first —
 * which hands a cat carried across the city an optimal route home
 * through streets it has never seen. That is a satnav, not an animal,
 * and it quietly made *lost* impossible: any animal within eight hops of
 * home always solved it.
 *
 * What it does instead: it keeps a **trail** of the places it has been
 * since it was last home (`BondedMixin.rememberPlace`), and walks toward
 * the earliest one it can reach from here — `trail[0]` being the closest
 * thing to home it remembers. Taking the *earliest* reachable entry
 * means it takes any shortcut it recognises and never walks away from
 * home. Arriving anywhere it remembers rewinds the trail to there, so
 * walking in a circle forgets the circle.
 *
 * ⭐ And it is one step per beat, which is the whole feel of it: an
 * animal making its way home is something you can walk past, see, and
 * intercept. A teleport is the same outcome and none of the experience.
 *
 * ⭐⭐ **"Lost" needs no code.** There is no lost flag, no lost timer and
 * no announcement. If nothing it remembers is behind an open door, it
 * stays where it is — because it genuinely does not know the way from
 * here. That happens when a door shuts across its route, and it happens
 * when somebody carries it somewhere it has never been. Somebody has to
 * notice.
 *
 * ⚠ It does not set off while its person is here. An animal following
 * you around town is not lost and should not leave mid-walk.
 *
 * config: none.
 */

import type { EngagementSlot } from '../activity/Engaged';
import type { BrainContext, BrainStatics } from './brain';
import { MixinApi } from '../../api/mixin';
import { LocomotionApi } from '../../api/locomotion';
import { PersistableApi } from '../../api/persistable';
import { FOLLOW_BOND } from '../husbandry/Bonded';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

export const brain = class {
  static label = 'homes';
  static kind: TaskKind = 'body';
  static summary =
    'Walks one step toward the nearest place it remembers, by its own ' +
    'trail — memory, not pathfinding, so lost stays possible.';
  /**
   * ⚠⚠ **The one urgency with a side effect, and it has to be.** The
   * trail is written by *noticing where you are standing*, and it must be
   * written on a beat this brain LOSES — an animal carried through a room
   * while it was eating still passed through that room. Leaving the note
   * in `act` would mean an animal that never wins a beat has no way back
   * at all, which is the exact failure the trail was built to prevent.
   *
   * Noticing where you are costs no turn. Walking does, and that is what
   * `act` asks for.
   */
  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (!MixinApi.isBonded(host) || !MixinApi.isContainable(host)) {
      return new Urgency("idle");
    }
    const room = host.getContainer();
    if (!room) return new Urgency("idle");
    const here = PersistableApi.placeIdOf(room);
    host.rememberPlace(here);
    if (host.isWaiting()) return new Urgency("idle");
    const home = host.getHome();
    if (!home || here === home) return new Urgency("idle");
    // Its person is here — it is not lost, it is WITH somebody.
    if (MixinApi.isContainer(room)) {
      for (const other of room.getContents()) {
        if (host.bondWith(other) >= FOLLOW_BOND) return new Urgency("idle");
      }
    }
    return new Urgency('wanted', 'turns its head toward home and sets off');
  }
  static claims: readonly EngagementSlot[] = ['body'];
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isBonded(host)) return;
    if (!MixinApi.isMobile(host) || !MixinApi.isContainable(host)) return;

    const room = host.getContainer();
    if (!room) return;
    const here = PersistableApi.placeIdOf(room);

    // ⚠ Note where it is FIRST, before any early return — the trail has
    // to record a room it was merely carried through, or an animal taken
    // somewhere and set down would have no way back at all.
    host.rememberPlace(here);

    if (host.isWaiting()) return;
    const home = host.getHome();
    if (!home || here === home) return;
    if (!MixinApi.isExitable(room)) return;

    // ⚠ Its person is here — it is not lost, it is WITH somebody.
    if (MixinApi.isContainer(room)) {
      for (const other of room.getContents()) {
        if (host.bondWith(other) >= FOLLOW_BOND) return;
      }
    }

    // ⭐ Where it would rather be, nearest-to-home first: home itself,
    // then the earliest place it still remembers.
    const wanted = [home, ...host.getTrail()];
    for (const exit of room.getExits().values()) {
      const dest = exit.getDestination();
      if (!dest) continue;
      if (!wanted.includes(PersistableApi.placeIdOf(dest))) continue;
      if (!exit.canTraverse(host, 'walk').ok) continue;
      try {
        await LocomotionApi.traverseWithDefault(host, exit);
      } catch {
        // Shut between the check and the step. Try again next beat.
      }
      return;
    }
    // Nothing it knows is behind an open door. It stays. That is "lost".
  }
} satisfies BrainStatics;

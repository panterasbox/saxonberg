/**
 * NPC — the thin archetype class for authored, non-player characters:
 * `Character` + `Behaved` (+ the `PostRegistration` marker so the clone
 * pipeline invokes `postRegister`, where `Behaved` wires its
 * `behaviors:` spec list).
 *
 * Keeping `Behaved` on this subclass — rather than on base `Character` —
 * keeps automated behavior **off player Avatars** (which extend
 * `ShelledCharacter`, not `NPC`) and off the base. Cast templates set
 * `class: /lib/npc/NPC` and compose behavior entirely as data; no
 * per-NPC subclass is needed (see docs/subsystems/behavior.md).
 *
 * Composition order is load-bearing: `BehavedMixin` is **outermost** so
 * the single `postRegister` the clone pipeline calls resolves to it
 * (which then wires behaviors); `PostRegistrationMixin` sits just below
 * to supply the marker + the terminal no-op. (`CommandGiver`'s own
 * `postRegister` deeper in the chain is shadowed, but it self-seeds
 * lazily — and NPCs emit through Apis directly, not the command system.)
 */

import { Character } from '../character/Character';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { BehavedMixin } from '../behavior/Behaved';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import type { Stuff } from '../stuff/Stuff';
import type { Containable } from '../spatial/Containable';
import type { CommandGiver } from '../command/CommandGiver';

const NPCBase = BehavedMixin(PostRegistrationMixin(Character));

export class NPC extends NPCBase {
  /**
   * ⭐ Walk to a room, one `go <direction>` at a time — the way a person
   * without a cart walks, which is also the way a player would. Returns
   * whether the NPC stands in the target room afterwards.
   *
   * ⚠ **`go`, not `journey`.** `journey` is afforded by a VEHICLE —
   * content affords content — and a hand pushing goods by hand has none.
   *
   * ⭐ The route comes from the transport pack's `LaneCatalogue`, reached
   * **by shape** and never by import (the `TravelNode` idiom — the mudlib
   * does not import packs). An install with no roads has an NPC that
   * simply does not travel, which is the honest degradation.
   *
   * ⚠ Bounded, and it stops on the first refused step. **Blocked means
   * blocked**: the next beat tries again. Nothing here routes around
   * anything, because auto-routing would hide the geography the road was
   * built to make real. (Hoisted here from the `consigns` brain — the
   * `stocks` brain walks the same way; a verb on the walker, not a
   * helper beside two brains.)
   */
  public async walkTo(targetPath: string, lane = 'city'): Promise<boolean> {
    const self = this as unknown as Stuff & Containable & CommandGiver;
    const here = self.getContainer()?.getTemplatePath() ?? '';
    if (here === '') return false;
    if (here === targetPath) return true;

    const catalogue = await StuffApi.singleton<Stuff>(
      '/system/transport/idea/LaneCatalogue',
    ).catch(() => null);
    const planner = catalogue as unknown as {
      planRoute?: (
        from: string,
        to: string,
        lane: string,
      ) => Promise<{ nodes: readonly string[] } | null>;
    } | null;
    if (!planner || typeof planner.planRoute !== 'function') return false;

    const route = await planner.planRoute(here, targetPath, lane);
    if (!route) return false;

    for (let i = 0; i + 1 < route.nodes.length; i += 1) {
      const room = self.getContainer();
      if (!room || !MixinApi.isExitable(room)) return false;
      const next = route.nodes[i + 1]!;
      let direction = '';
      for (const [dir, exit] of room.getExits().entries()) {
        if (exit.getDestinationTemplatePath() === next) {
          direction = dir;
          break;
        }
      }
      if (direction === '') return false;
      await self.forceCommand(`go ${direction}`);
      if (self.getContainer()?.getTemplatePath() !== next) return false;
    }
    return self.getContainer()?.getTemplatePath() === targetPath;
  }
}

export default NPC;

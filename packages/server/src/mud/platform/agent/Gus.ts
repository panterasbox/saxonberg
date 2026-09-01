/**
 * Gus — the Crossing Authority. A bespoke NPC whose only divergence from
 * the plain `/lib/npc/NPC` archetype is that he boots **already equipped**:
 * wearing his faded hi-vis vest and referee's whistle, wielding the STOP
 * paddle, and carrying his drifting pocket-watch, the crossing-log, and the
 * thermos he never opens.
 *
 * WHY A CLASS (and not pure seed data): there is no declarative seed path to
 * put gear on a creature. `props:` is composed only on rooms
 * (`CartesianLocation`), not on `Creature`/`Character`/`NPC`, and worn/
 * wielded occupancy is deliberately runtime-only (never persisted, never
 * seedable — see `lib/slot/Slotted.ts`). So a fresh NPC clone always boots
 * with empty hands and empty slots. The supported pattern is the one
 * `Avatar.installDefaultLoadout` uses: a `postRegister` hook that clones the
 * gear and equips it programmatically on standup. `postRegister` re-runs on
 * every clone/reboot, so Gus re-equips himself each boot — exactly the model
 * we want (the world re-inits; Gus dresses for his shift again).
 *
 * The loadout PATHS are content (templates under his own zone); this class
 * only carries the equip *mechanism*. He never *uses* the gear as intended
 * (never sits, never opens the thermos, never sets the watch) — that is
 * behaviour authored on the seed, not code here.
 */

import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Slottable } from '../../lib/slot/Slottable';
import type { Slotted } from '../../lib/slot/Slotted';
import { NPC } from '../../lib/npc/NPC';
import { StuffApi } from '../../api/stuff';
import { ContainmentApi } from '../../api/containment';
import { SpeciesApi } from '../../api/species';
import { MixinApi } from '../../api/mixin';

/** The zone root Gus's gear templates live under. */
const ROOT = '/world/eternal/university-avenue';

/**
 * Worn/wielded gear — each item resolves its OWN body-plan slot claim
 * (`getSlotClaim`), so this class never hard-codes a slot name. The vest
 * claims `torso`, the whistle `neck`, the paddle `hand:right` (all authored
 * on their seeds). Carried gear just lands in inventory.
 */
const WORN_OR_WIELDED = [`${ROOT}/vest`, `${ROOT}/whistle`, `${ROOT}/paddle`];
const CARRIED = [
  `${ROOT}/pocket-watch`,
  `${ROOT}/crossing-log`,
  `${ROOT}/thermos`,
];

/** The slot-claim shape read off a Wearable/Wieldable clone. */
interface SlotClaimer {
  getSlotClaim(bodyPlanPath: string): readonly string[];
}

export default class Gus extends NPC {
  /**
   * @hook Standup: chain `super.postRegister` (so `Behaved` still wires the
   *   `behaviors:` list) then dress for the shift.
   */
  override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    await this.equipLoadout();
  }

  /**
   * Clone + equip Gus's loadout. Defensive (mirrors
   * `Avatar.installDefaultLoadout`): a fresh dev DB / test store missing the
   * species, body plan, or a gear template must not crash the clone cascade
   * — a failure logs and Gus stands up under-dressed rather than not at all.
   */
  private async equipLoadout(): Promise<void> {
    try {
      // Ensure species + body plan are resolved so slot claims can be read
      // and the body-plan slots exist to occupy.
      await SpeciesApi.preloadAnatomy(this);

      const self = this as unknown as Stuff & Container;
      // Carried gear: straight into inventory.
      for (const path of CARRIED) {
        const item = await StuffApi.clone<Stuff & Containable>(path);
        ContainmentApi.move(item, self);
      }

      // Worn/wielded gear needs a body plan to resolve its slot claim.
      const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(this);
      if (!bodyPlanPath || !MixinApi.isSlotted(this)) return;
      const slottedSelf = this as unknown as Stuff & Slotted;
      for (const path of WORN_OR_WIELDED) {
        const item = await StuffApi.clone<Stuff & Containable>(path);
        // A worn/wielded item lives in inventory AND a slot (the
        // WearController / WieldController contract). Move in, then occupy
        // each claimed slot.
        ContainmentApi.move(item, self);
        const slots = (item as unknown as SlotClaimer).getSlotClaim(
          bodyPlanPath,
        );
        for (const slot of slots) {
          slottedSelf.occupy(item as unknown as Stuff & Slottable, slot);
        }
      }
    } catch (err) {
      console.warn(
        `Gus.equipLoadout skipped for ${this.stuffId}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

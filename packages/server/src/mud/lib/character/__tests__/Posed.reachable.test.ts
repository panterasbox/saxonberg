/**
 * The posture verbs are REACHABLE BY A PLAYER (found by driving the world).
 *
 * Both halves of this had shipped and neither worked, and no unit test
 * could see it because they all called `SlotApi.occupyAll` directly:
 *
 *   1. `cmd/posture/{lie,sit,stand,kneel}.yaml` and their controllers
 *      existed, but NOTHING contributed them — verbs reach a giver only
 *      through `commandContributions`, so an uncontributed view is dead
 *      YAML and every posture command answered "I don't understand".
 *   2. `requiresSlottable` gates all four, and its own docstring claimed
 *      "v1 actors are always Slottable via Avatar's composition" — which
 *      was never true. With (1) fixed, every actor was rejected with
 *      "you can't fit in a slot".
 *
 * Sleep-as-logout depends on both: a bed you can occupy is worth nothing
 * if no player can issue the verb that occupies it.
 */

import { describe, it, expect } from "vitest";
import { PosedMixin } from "../Posed";
import { Creature } from "../../creature/Creature";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../mixin";
import Thing from "../../stuff/Thing";
import { StuffApi } from "../../../api/stuff";
import { SlotApi } from "../../../api/slot";
import PosturedChair from "../../../obj/Chair";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import type { Stuff } from "../../stuff/Stuff";
import type { Slotted } from "../../slot/Slotted";
import type { Slottable } from "../../slot/Slottable";

const BED_PATH = "/obj/fixture/bed";
function makeBed(): PosturedChair {
  const bed = makeStuffAtPath(() => new PosturedChair(), BED_PATH);
  bed.setStaticSlots([
    { name: "lie:1", accepts: "SlottableMixin", capacity: 1, postures: ["lie", "sit"] },
  ]);
  bed.setRestQuality(1.5);
  return bed;
}

describe("the posture verbs reach a player", () => {
  it("PosedMixin contributes all four on the self surface", () => {
    const Posed = PosedMixin(Thing) as unknown as {
      commandContributions?: { self?: string[] };
    };
    const self = Posed.commandContributions?.self ?? [];
    for (const v of ["lie", "sit", "stand", "kneel"]) {
      expect(self).toContain(`posture/${v}.yaml`);
    }
  });

  it("a Creature is Slottable — it OCCUPIES slots, not just offers them", () => {
    // Slotted (already composed) is the chair's side; Slottable is the
    // sitter's. `requiresSlottable` gates every posture verb on this.
    expect(MixinApi.hasMixin(Creature, Mixins.Slottable)).toBe(true);
    expect(MixinApi.hasMixin(Creature, Mixins.Slotted)).toBe(true);
    expect(MixinApi.hasMixin(Creature, Mixins.Posed)).toBe(true);
  });
});

describe("standing up forgets the bed — across the WHOLE composed stack", () => {
  it("Mobile's onSlotReleased super-chains to Posed's", async () => {
    StuffApi.clearAll();
    // `onSlotReleased` is implemented by more than one layer, and a method
    // does not merge — the OUTERMOST composed layer wins. MobileMixin (in
    // Character) is outside PosedMixin (in Creature), so without a super
    // call Posed's witness never fires and standing up leaves the sleeper
    // recorded as still in the bed: `posture: stand` with a live
    // `restingOnPath`, which is contradictory. This is the regression.
    const { MobileMixin } = await import("../../spatial/Mobile");
    const { PosedMixin } = await import("../Posed");
    const { SlottableMixin } = await import("../../slot/Slottable");
    const { default: Thing } = await import("../../stuff/Thing");

    // Compose in the real order: Mobile OUTSIDE Posed.
    class Body extends MobileMixin(PosedMixin(SlottableMixin(Thing))) {}
    const body = makeStuffAtPath(() => new Body(), "/obj/test/ChainBody");
    const bed = makeBed();

    SlotApi.occupyAll(
      bed as unknown as Stuff & Slotted,
      body as unknown as Stuff & Slottable,
      ["lie:1"],
    );
    expect(body.getRestingOnPath()).toBe(BED_PATH);

    (bed as unknown as Slotted).vacate(
      "lie:1",
      body as unknown as Stuff & Slottable,
    );
    // Mobile's witness ran (its own job is engagedMode) AND Posed's did.
    expect(body.getRestingOnPath()).toBe("");
    expect(body.getRestingSlot()).toBe("");
  });
});

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

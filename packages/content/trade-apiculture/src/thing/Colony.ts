/**
 * Colony — ⭐⭐ **bees with no box.**
 *
 * A swarm hanging off a branch, a nucleus on a shelf, a split in your
 * hands. It has a strength, a queen and a temper, and **no stores**: the
 * stores are comb and the comb is in a box, which is exactly why this is
 * a `Thing` you carry rather than a `Hive`.
 *
 * ⭐ **Why the second class earns its keep.** Buying a nucleus, catching a
 * swarm and splitting a strong hive are three different acquisitions
 * (AC 1) and all three mint *this*. Installing it is the platform's `put`.
 * Without it, each acquisition would need either a bespoke verb or a
 * state transfer between two Vessels, and `put nuc in hive` is a better
 * sentence than any verb anybody would have invented.
 *
 * It is not a `Livestock`: no body plan, no vitals, no flesh, no herd
 * behind it. It is not a `Hive`: no volume, no lid, no comb.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { OrganismMixin } from '@saxonberg/server/mud/lib/species/Organism';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import { HandledMixin } from '@saxonberg/content-trade-ranching/src/lib/Handled';
import type { HandleReport } from '@saxonberg/content-trade-ranching/src/lib/Handled';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ColonyMixin, APICULTURE } from '../lib/Colony';

// ⭐ `HandledMixin` and `HandlingMixin` side by side, never nested —
// nesting a factory inside a factory collapses TypeScript's inference
// through the chain, which ranching's own header warns about.
const ColonyThingBase = HandledMixin(
  HandlingMixin(ColonyMixin(OrganismMixin(DetailedMixin(Thing)))),
);

export default class Colony extends ColonyThingBase {
  /**
   * ⚠ No affordance of its own. `handle` arrives from `HandledMixin`,
   * and everything else a loose colony affords — `get`, `drop`,
   * `put … in` — is the platform's, on the strength of its being a
   * `Thing`. It does NOT afford `rob`: there is no comb in a swarm, and
   * offering the verb so the controller could decline it is the
   * re-narrowing tell.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [],
    environment: [],
  };

  /**
   * ⭐ What your hands tell you about a colony that is not in a box:
   * how many of them there are, whether there is a queen with them, and
   * how they take being handled. **No number anywhere** — the precise
   * score belongs to palpating a mammal, and is livestock's sentence.
   */
  public workedOver(actor: Stuff): HandleReport {
    const sting = this.disturb(actor);
    const strength = this.getStrength();
    const mass =
      strength < 0.2
        ? 'a handful of bees and not much more'
        : strength < 0.5
          ? 'a fair cluster, about what would fill a hat'
          : 'a heavy cluster, warm right through';
    const queen = this.hasLiveQueen()
      ? 'There is a queen in there somewhere; they are settled around her.'
      : 'They are restless and roaring, and there is no queen with them.';
    return {
      prelude: sting.prelude,
      self: Mml.compose`You cup your hands around them: ${mass}. ${queen} ${this.handlingPhrase()}.`,
      peers: Mml.compose`${Mml.actor(actor)} handles a loose cluster of bees, unhurried.`,
      difficulty: this.getHandling() < 0.35 ? 'hard' : 'standard',
      discipline: APICULTURE,
    };
  }
}

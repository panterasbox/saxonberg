/**
 * PostmortemMixin — what a body does after it stops.
 *
 * Death is **living-stop plus postmortem-start**: the living processes end
 * (metabolism, respiration and thermoregulation all gate on
 * `isLivingBody()`), and a different clock begins. This mixin is that
 * second clock — the one a corpse runs on whether or not anybody is
 * watching, and whether or not the person who used to live in it ever
 * comes back.
 *
 * That independence is the point. Forensics only works as a discipline if
 * a body can be studied on its own schedule: the cause stamp is ground
 * truth, the readable signs rot, and the gap between them is where an
 * examiner can be wrong. A corpse that vanished when its owner re-embodied
 * would make all of that unplayable.
 *
 * **Composed on `Creature`**, the tier that already exists for this — its
 * own doc names "a corpse" as a valid bare Creature, and it already brings
 * `Container` (the loadout), `Vitals` + `BodyPlanSlots` (the wound map)
 * and `Thermal` (algor mortis, for free, as a passive drift toward
 * ambient). So this mixin adds a clock and an eviction opinion, nothing
 * else.
 *
 * Inert on a living body: every read returns the fresh/first values and
 * `canEvict` defers to `super`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Organism } from '../species/Organism';
import type { EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import {
  DECAY_STAGES,
  MORTALITY_DEFAULTS,
  type DecayStage,
} from './MortalArc';

export interface Postmortem {
  /** Game-time seconds the body died, or 0 while it lives. */
  diedAtGameSec: number;
  /** Stamp the moment of death. Set once, by the death transition. */
  markDeceasedAt(gameSec: number): void;
  /** How far decomposition has gone. `'fresh'` while alive. */
  getDecayStage(): DecayStage;
  /** How readable the forensic record still is, 1 → 0. */
  getForensicReadability(): number;
}

export function PostmortemMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class PostmortemMixin extends Base implements Postmortem {
    static _mixinName = 'PostmortemMixin';

    static persistentFields = ['diedAtGameSec'];

    /** @runtimeState */
    public diedAtGameSec = 0;

    public markDeceasedAt(gameSec: number): void {
      if (this.diedAtGameSec === 0) this.diedAtGameSec = gameSec;
    }

    /**
     * Elapsed game-seconds since death, or `null` when this body has not
     * died or no world clock is running.
     *
     * **Deliberately unguarded**, unlike every living-body clock in the
     * engine. Those freeze while a player is linkdead and drop far-past
     * gaps, because absence should never cost a living player anything. A
     * corpse has no player to protect: it is not linkdead, it is dead, and
     * a body left for a week SHOULD be a week gone when someone finds it.
     * The same reasoning as the dying clock, one step further on.
     */
    private sinceDeath(): number | null {
      if (this.diedAtGameSec === 0) return null;
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      const now = WorldClockApi.getNow().rawValue();
      return Math.max(0, now - this.diedAtGameSec);
    }

    public getDecayStage(): DecayStage {
      const elapsed = this.sinceDeath();
      if (elapsed === null) return 'fresh';
      const index = Math.min(
        DECAY_STAGES.length - 1,
        Math.floor(elapsed / MORTALITY_DEFAULTS.DECAY_STAGE_SEC),
      );
      return DECAY_STAGES[index]!;
    }

    public getForensicReadability(): number {
      return MORTALITY_DEFAULTS.FORENSIC_READABILITY[this.getDecayStage()];
    }

    /**
     * The postmortem-progression seam `vitals.md` reserved, now filled:
     * the stages this body has actually reached.
     */
    public getPostmortemProgressions(): readonly string[] {
      if (this.diedAtGameSec === 0) return [];
      const reached = DECAY_STAGES.indexOf(this.getDecayStage());
      return DECAY_STAGES.slice(0, reached + 1);
    }

    /**
     * A body still lies here — don't collect it yet.
     *
     * The decay terminus is expressed as *withdrawing an objection*, not as
     * a destruct: at `'spent'` the corpse simply stops vetoing and the
     * ordinary residency sweep may reclaim it. No new lifecycle, no special
     * cleanup path, and the goods on it evacuate through the shipped
     * container behaviour rather than being destroyed with it.
     */
    public canEvict(context: EvictionContext): VetoResult {
      const self = this as unknown as Stuff;
      const dead =
        MixinApi.isOrganism(self) && (self as unknown as Organism).isDead();
      if (dead && this.getDecayStage() !== 'spent') {
        return { ok: false, reason: 'a body still lies here' };
      }
      return super.canEvict(context);
    }

    // NO `mergeSlice_` of any kind lives here. See MATERIAL_FORK_SLICES in
    // lib/vitals/Vitals.ts — the absence is the guarantee.
  }
  return PostmortemMixin;
}

/**
 * HaulOutMixin — ⭐ **getting something out of a water by hand** (river
 * D22): get hold of what is in it and bring it out to where the puller
 * stands — a bank or a quay one way off, a boat floating here — or, in the
 * same water, hold a body's head up. What `pull <it>` means for anything in
 * water that is not itself on a line; and the one landing a hand and a line
 * both use (`deliverOut`: whatever the water had a hold on it by lets go).
 *
 * ## ⭐ Why it is its own mixin (controllers-are-io D6)
 *
 * It shipped on `WaterPlaceMixin`, which is *the water* — level, column,
 * tide, medium, sinking. Hauling out is a second idea a reader of the water
 * does not need, with its own imports (the party gate, the hazard pin, the
 * puller's strain ceiling). Every water place is honestly both, so this is
 * a CO-USE split: the hosts are the same seven, and the predicate
 * (`MixinApi.isHaulOut`) is what the `pull` controller and a line's landing
 * ask, never `isWaterPlace`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Exitable } from '../boundary/Exitable';
import type { PullOutcome } from '../spatial/Pullable';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { Mml } from '../../api/mml';
import { PartyApi } from '../../api/party';
import { GrammarApi } from '../../api/grammar';
import { SchedulerApi } from '../../api/scheduler';
import { HAZARD_PIN_TYPE } from '../hazard/HazardActivity';

/** Real seconds to get a body out by hand, unloaded — more as the lift nears the ceiling. */
const PULL_OUT_REAL_S = 4;


/** The public surface: what a puller asks of a water. */
export interface HaulOut {
  /**
   * ⭐ Get hold of something in this water by hand and bring it out to
   * where the puller is — a bank or a quay one way off, a boat floating
   * here — or, in the same water, hold a body's head up (river D22). What
   * `pull <it>` means for anything in water that is not itself on a line.
   */
  pullOut(load: Stuff, puller: Stuff): Promise<PullOutcome>;
  /**
   * What in this water a puller means by `word`, by what THEY know it as
   * — `null` when nothing answers, or the water is out of their reach.
   */
  loadNamed(puller: Stuff, word: string): Stuff | null;
  /**
   * ⭐ Something comes out of this water into `to` (river D22): whatever
   * the water had a hold on it by — a strainer, a jammed foot — lets go.
   * The one landing a hand and a line both use.
   */
  deliverOut(load: Stuff & Containable, to: Stuff & Container): void;
}

export function HaulOutMixin<
  TBase extends MixinConstructor<Stuff & Container>,
>(Base: TBase) {
  return class HaulOutMixin extends Base implements HaulOut {
    static _mixinName: string = 'HaulOutMixin';

    public async pullOut(load: Stuff, puller: Stuff): Promise<PullOutcome> {
      const water = this as unknown as Stuff & Container & Exitable;
      const name = load.getPresentation();
      if (!MixinApi.isContainable(load) || load.getContainer() !== (water as unknown)) {
        return { ok: false, reason: 'not-in-water', line: `${name} is not in the water; there is nothing to pull them out of.` };
      }
      const to = this.pullerStation(puller);
      if (to === undefined) return { ok: false, reason: 'out-of-reach', line: `${name} is out of your reach.` };
      // ⭐ A person is not landed against their will: one who is awake and
      // free in the water swims on unless they are with you. Pinned,
      // drowning, senseless or gone from the world, anybody may.
      const helpless = this.isHelpless(load);
      if (MixinApi.isHasInteractive(load) && !helpless && !PartyApi.areAllied(load, puller)) {
        return { ok: false, reason: 'unwilling', line: `${GrammarApi.cap(name)} shakes off your hand and swims on.` };
      }
      // ⭐ The lift is the puller's strain ceiling against what comes out:
      // the whole weight of a helpless body or a thing, half of a swimmer
      // who kicks and climbs. In the same water there is no lift — you
      // hold their head up.
      const kg = MixinApi.isTangible(load) ? load.getMass().rawValue() : 0;
      const liftKg = to === null ? 0 : kg * (load.isAgent() && !helpless ? 0.5 : 1);
      const ceilingKg = MixinApi.isLoadBearing(puller) ? puller.getStrainCeiling().rawValue() : Infinity;
      if (liftKg > ceilingKg) {
        return { ok: false, reason: 'too-heavy', line: `You get hold of ${name} and heave, and cannot lift them out. It wants a rope, or more hands.` };
      }
      return {
        ok: true,
        self: Mml.compose`You get hold of ${Mml.actor(load)} and start to pull.`,
        peers: Mml.compose`${Mml.actor(puller)} gets hold of ${Mml.actor(load)} and starts to pull.`,
        takes: {
          realS: PULL_OUT_REAL_S * (1 + (Number.isFinite(ceilingKg) && ceilingKg > 0 ? liftKg / ceilingKg : 0)),
          finish: async (): Promise<PullOutcome> => {
            if (load.isDestroyed() || load.getContainer() !== (water as unknown)) {
              return { ok: false, reason: 'gone', line: 'Your hands close on nothing; it is not where it was.' };
            }
            const still = this.pullerStation(puller);
            if (still === undefined) return { ok: false, reason: 'out-of-reach', line: `${GrammarApi.cap(name)} is out of your reach now.` };
            if (liftKg > 0 && MixinApi.isExerting(puller)) {
              puller.exert({ durationS: 20, powerW: Math.min(600, 80 + liftKg * 4) });
            }
            if (still === null) {
              this.deliverOut(load as Stuff & Containable, water);
              if (MixinApi.isRespiration(load)) load.holdUp();
              return {
                ok: true,
                self: Mml.compose`You get ${Mml.actor(load)}'s head up out of the water and hold it there.`,
                peers: Mml.compose`${Mml.actor(puller)} holds ${Mml.actor(load)}'s head up out of the water.`,
              };
            }
            this.deliverOut(load as Stuff & Containable, still);
            return {
              ok: true,
              self: Mml.compose`You pull ${Mml.actor(load)} out of the water.`,
              peers: Mml.compose`${Mml.actor(puller)} pulls ${Mml.actor(load)} out of the water.`,
            };
          },
        },
      };
    }

    public loadNamed(puller: Stuff, word: string): Stuff | null {
      const w = word.trim().toLowerCase();
      if (w === '' || this.pullerStation(puller) === undefined) return null;
      for (const c of (this as unknown as Stuff & Container).getContents()) {
        if (c === puller) continue;
        // ⭐ By what the PULLER knows them as (the lifeline's lesson): a
        // stranger answers to "a human", never to a name nobody told.
        const words = c.perceivedKeywordsFor(puller).map((k) => k.toLowerCase());
        if (words.includes(w) || c.describeFor(puller).toLowerCase().includes(w)) return c;
      }
      return null;
    }

    public deliverOut(load: Stuff & Containable, to: Stuff & Container): void {
      if (MixinApi.isEngaged(load)) SchedulerApi.cancelByType(load, HAZARD_PIN_TYPE);
      if (to !== (this as unknown as Stuff)) ContainmentApi.move(load, to);
    }

    /**
     * Pinned by the water, drowning, senseless, or gone from the world:
     * somebody who cannot help being pulled out, nor help with it.
     */
    private isHelpless(body: Stuff): boolean {
      if (MixinApi.isEngaged(body) && body.getEngagementByType(HAZARD_PIN_TYPE) !== undefined) return true;
      if (MixinApi.isRespiration(body) && body.isInDrowningResponse()) return true;
      if (MixinApi.isVitals(body) && body.getConsciousness() !== 'conscious') return true;
      return MixinApi.isHasInteractive(body) && body.isLinkdead();
    }

    /**
     * Where a puller stands to the water: `null` in it (the same water),
     * the room or the craft a load comes out into, or `undefined` when the
     * water is out of their reach — one way off at most, either way round.
     */
    private pullerStation(puller: Stuff): (Stuff & Container) | null | undefined {
      const water = this as unknown as Stuff & Container & Exitable;
      if (!MixinApi.isContainable(puller)) return undefined;
      const at = puller.getContainer() as unknown as Stuff | null;
      if (at === null) return undefined;
      if (at === water) return null;
      // Aboard a boat that floats here.
      if (MixinApi.isContainable(at) && at.getContainer() === (water as unknown) && MixinApi.isContainer(at)) {
        return at as Stuff & Container;
      }
      const leadsTo = (from: Stuff, there: Stuff): boolean =>
        MixinApi.isExitable(from) && [...from.getExits().values()].some((e) => e.peekDestination() === (there as unknown));
      if (MixinApi.isContainer(at) && (leadsTo(at, water) || leadsTo(water, at))) return at as Stuff & Container;
      return undefined;
    }
  };
}

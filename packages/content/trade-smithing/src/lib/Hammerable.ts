/**
 * Hammerable — ⭐⭐ **metal stock answers the hammer**, and what a blow
 * does is the piece's to say, not the verb's.
 *
 * Three things happen under a hammer and they are decided by what is being
 * struck and what it is struck on:
 *
 *  - **on a striking die** (`hammer <blank> on <die>`) the die takes the
 *    blank's shape from the blow and says what came of it (the kernel's
 *    `StrikingDieMixin`);
 *  - **on an anvil, hot** the forming work banks the piece's own matter into
 *    its build — once per build (hammering more shapes, it does not
 *    multiply the metal);
 *  - **a bloom's first blow** is a different act with the same tool: the
 *    slag is squeezed out and the iron welds to itself (`Bloom` overrides
 *    {@link Hammerable.firstBlow}).
 *
 * ⚠⚠ **Cast iron refuses, before the heat check**, because telling somebody
 * to heat a pig is advice that cannot work — carbon is why it shatters and
 * no temperature fixes that ({@link IronCarbon.isCast}).
 *
 * A protocol mixin (controller-liquidity Appendix B): `HammerController`
 * hands the bound striker and anvil to {@link Hammerable.hammerPlanFor} and
 * words the plan; it no longer asks what kind of thing it is holding. The
 * hosts are the smithing pack's `Stock` (every ingot, bar, pig and blank the
 * metal chain ships) and the smelting pack's `Bloom`.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Builds } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type { Alloyed } from '@saxonberg/server/mud/lib/material/Alloyed';
import type { StrikeRefusal } from '@saxonberg/server/mud/lib/craft/StrikingDie';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import IronCarbon from './IronCarbon';

/** The marker `requires: HammerableMixin` and `MixinApi.isActive` read. */
export const HAMMERABLE_MIXIN = 'HammerableMixin';

/** A hand-hammer stroke — real milliseconds before the anvil paces it. */
const HAMMER_MS = 5000;
/** Metabolic watts of swinging a hand hammer. */
const HAMMER_W = 600;
/** The energy of one hand-hammer blow on a die, J — a sledge's is more. */
const HAMMER_BLOW_J = 60;

/** ⭐ Every reason a blow is refused — before it lands, or as it lands. */
export type HammerRefusal =
  /** Cast iron: it has no plastic range at all. */
  | ActRefusal<'unforgeable'>
  /** Stock with no material to work. */
  | ActRefusal<'no-vessel'>
  /** Struck cold on an anvil: you strike while it is hot. */
  | ActRefusal<'insufficient-heat'>
  /** What the die answered. */
  | StrikeRefusal;

/** Where the blow falls — the begin words' one fact. */
export interface HammerBegin {
  on: 'anvil' | 'die';
}

/** What a blow came to. */
export type HammerDone =
  /** The forming work — the metal moves under the hammer. */
  | { kind: 'formed' }
  /** A bloom beaten into a bar: the slag on the floor, the bar in hand. */
  | { kind: 'consolidated'; bar: Stuff; steel: boolean; slagKg: number; barKg: number }
  /** A blank struck on a die. */
  | { kind: 'struck'; token: Stuff };

/** A hammer plan. */
export type HammerPlan = ActPlan<HammerBegin, HammerDone, HammerRefusal>;

/** Metal stock you can hammer. */
export interface Hammerable {
  /**
   * Strike this with `striker` against `anvil`: the plan, or why not. The
   * plan's duration is the bare stroke; the caller paces it by the anvil.
   */
  hammerPlanFor(actor: Stuff, striker: Stuff, anvil: Stuff): HammerPlan | HammerRefusal;
  /**
   * @hook What the FIRST blow on a fresh build does, after the piece's
   * matter is banked — the forming work by default; a bloom consolidates.
   */
  firstBlow(by: Stuff): Promise<HammerDone>;
  /** What the carbon in this piece makes of it. */
  ironCarbon(): IronCarbon;
}

type Stock = Stuff & Builds & Alloyed;

export function HammerableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HammerableMixin extends Base implements Hammerable {
    static _mixinName: string = HAMMERABLE_MIXIN;
    static _mixinRefusal = '{} is not metal stock an anvil works';
    static _mixinKind = 'protocol' as const;

    public hammerPlanFor(actor: Stuff, striker: Stuff, anvil: Stuff): HammerPlan | HammerRefusal {
      const self = this as unknown as Stock;
      // ⭐ A fact about the METAL, answered before anything about its state.
      if (this.ironCarbon().isCast()) return { ok: false, reason: 'unforgeable' };
      const wearStriker = (): void => {
        // A hammer blow jars the hammer — a hafted one gives at the haft.
        if (MixinApi.isDurable(striker)) striker.wear(undefined, 'shock');
      };
      if (MixinApi.isStrikingDie(anvil)) {
        const die = anvil;
        return {
          ok: true,
          durationMs: HAMMER_MS,
          effortW: HAMMER_W,
          facts: { on: 'die' },
          onComplete: async () => {
            wearStriker();
            const out = await die.strikeWith(self, HAMMER_BLOW_J, actor);
            return out.ok ? { ok: true, facts: { kind: 'struck', token: out.facts.token } } : out;
          },
        };
      }
      if (!MixinApi.isTangible(self) || !self.getMaterial()) return { ok: false, reason: 'no-vessel' };
      if (self.getHeatedToK() <= 0) return { ok: false, reason: 'insufficient-heat' };
      return {
        ok: true,
        durationMs: HAMMER_MS,
        effortW: HAMMER_W,
        facts: { on: 'anvil' },
        onComplete: async () => {
          // The once-rule is the substrate's: `bankWorkpiece` is true exactly
          // once per build, so a second blow cannot double the metal.
          const first = self.bankWorkpiece();
          wearStriker();
          return { ok: true, facts: first ? await this.firstBlow(actor) : { kind: 'formed' } };
        },
      };
    }

    /** @hook The forming work. */
    public async firstBlow(_by: Stuff): Promise<HammerDone> {
      return { kind: 'formed' };
    }

    public ironCarbon(): IronCarbon {
      const self = this as unknown as Stock;
      const brittle = MixinApi.isTangible(self) && self.hasMaterialTag('brittle');
      return new IronCarbon(self.fractionOf(IronCarbon.CARBON), brittle);
    }
  };
}

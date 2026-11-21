/**
 * MaintainableMixin — ⭐ **the fabric `maintain` keeps up** (controller-liquidity
 * W13, Appendix B): a building's sills and putty, a ship's seams and pitch.
 * A protocol mixin — composed by `Ship` and `Building`, narrowed by
 * `MixinApi.isMaintainable` — so the verb, and `repair`'s mend ladder
 * (which skips its wear rung on a kept fabric, matter-model-overlaps D8:
 * `repair` patches a hole and never does the caulker's or the plasterer's
 * work), ask the one claim instead of `instanceof`.
 * One act — put a morning's work into the fabric with an upkeep kit — that
 * each host answers in its own terms. The verb used to switch on
 * `instanceof Ship` for its words, its Discipline and whether a thin coat
 * mattered; each of those is the host's fact now.
 *
 * ⭐ It mends the FABRIC (`Durable` condition) and nothing else: laying a
 * coat is `paint`'s, and a building with a sound fabric under a failing coat
 * says so rather than taking the kit's wear.
 *
 * The answer carries facts; the words are the verb's.
 */

import type { MixinConstructor } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ConditionWord } from '../material/Durable';
import { MixinApi, type AnyConstructor } from '../../api/mixin';

/** What kind of fabric this is, for the verb's words: a house or a hull. */
export type FabricKind = 'house' | 'hull';

/** Why the upkeep did nothing: the fabric is sound, or only its coat wants work. */
export type MaintainRefusal = 'already-sound' | 'coat-not-fabric';

/** What `maintainWith` answers: what the fabric was before it was made good, or why not. */
export type MaintainAnswer =
  | { ok: true; before: ConditionWord }
  | { ok: false; reason: MaintainRefusal };

/** Wear one beat of upkeep puts on the kit — a season of upkeep costs a kit. */
export const UPKEEP_KIT_WEAR = 0.08;

export interface Maintainable {
  /** @hook A house or a hull — the verb words the work in the fabric's own terms. */
  fabricKind(): FabricKind;

  /** @hook The Discipline the work exercises (`seamanship` for a hull), or null. */
  upkeepDiscipline(): string | null;

  /**
   * @hook Put a beat of upkeep into the fabric with `kit` (already checked
   * to offer `upkeep`): refuse a sound fabric, else make it sound and wear
   * the kit.
   */
  maintainWith(kit: Stuff): MaintainAnswer;
}

export function MaintainableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class MaintainableMixin extends Base implements Maintainable {
    static _mixinName: string = 'MaintainableMixin';
    static _mixinKind = 'protocol' as const;

    /** The fabric is a `Durable` condition: what the kit makes good. */
    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Durable)) {
        throw new Error(
          `${name} composes MaintainableMixin without DurableMixin; the fabric ` +
            `the kit keeps up is the host's Durable condition.`,
        );
      }
    }

    /** See {@link Maintainable.fabricKind}. Default: a house's fabric. */
    public fabricKind(): FabricKind {
      return 'house';
    }

    /** See {@link Maintainable.upkeepDiscipline}. Default: nobody's Discipline. */
    public upkeepDiscipline(): string | null {
      return null;
    }

    /**
     * See {@link Maintainable.maintainWith}. Default: a sound fabric spares
     * the kit; otherwise the fabric is made sound and the kit wears.
     */
    public maintainWith(kit: Stuff): MaintainAnswer {
      const self = this as unknown as Stuff;
      if (!MixinApi.isDurable(self)) throw new Error('MaintainableMixin: the host is not Durable'); // composition forbids it
      const before = self.getConditionWord();
      if (before === 'sound') return { ok: false, reason: 'already-sound' };
      self.setCondition(1);
      if (MixinApi.isDurable(kit)) kit.wear(UPKEEP_KIT_WEAR);
      return { ok: true, before };
    }
  };
}

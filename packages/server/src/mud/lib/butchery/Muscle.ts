/**
 * MuscleMixin — capability for the Materials that are **meat**, carrying
 * the one fact a butcher and a cook both read: how hard the muscle
 * worked in life.
 *
 * ⭐⭐⭐ **The whole butchery chain turns on one derivable law.** A
 * muscle that works constantly carries connective tissue; collagen
 * gelatinizes only under long, moist heat; so a shoulder braises and a
 * loin sears, and getting it the wrong way round ruins the dish. That is
 * real food science and it is **predictable without a table** — a player
 * who knows a leg works harder than a loin can say which one wants the
 * pot and be right. `work` is the number that law reads, and a cut's
 * texture is DERIVED from the muscles it claims rather than authored, so
 * an author cannot lie about it.
 *
 * ⭐⭐ **It is also why white meat is white.** A chicken's breast is pale
 * because it never flies; a duck's is dark because it does. Same law, and
 * the one instance of it every player has already seen in a kitchen —
 * expressed here as two body plans (`fowl` cannot fly, `avian` can) whose
 * breasts name different muscle rows.
 *
 * **Why a subclass and not a field on `Material`.** A `work` field on the
 * base would claim that granite worked, and every reader would have to
 * guard on a `muscle` tag — the wrong-host tell this repo names outright.
 * `spoilActivationEnergy` and friends sit on the base because *every*
 * food has them; `work` is true of exactly one tissue kind.
 *
 * ⚠ **Why not `Material.toughness`.** That is the mechanical-response
 * axis in MJ·m⁻³, read by the `blunt` channel. Reusing it would make a
 * shank harder to BRUISE than a loin in a fight, which is a different
 * claim and a false one. Different fact, different field.
 *
 * ⚠ **Intramuscular fat is `composition`, not a field here** — an
 * existing field with existing readers, so `NutritionLabel` and
 * `BlendLabel` derive a belly's fat against a loin's for free.
 *
 * The `RadioactiveMaterial` pattern exactly: the instanceable twin is
 * `platform/idea/material/Muscle`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';

/** The narrowed surface `MixinApi.isMuscle` threads into a call site. */
export interface Muscle {
  /**
   * How hard this muscle worked in life, `0..1` — the connective tissue
   * it carries, and therefore the cooking it wants.
   */
  getWork(): number;
  setWork(value: number): void;
}

export function MuscleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MuscleMixin extends Base {
    static _mixinName: string = 'MuscleMixin';
    static fieldMeta: FieldMeta = {
      /**
       * ⭐⭐⭐ **`spoiler: 1`, and the pedagogy lens is why.** `work` is
       * the engine's number; the player's version of it is a band word
       * (*coarse-grained and threaded with sinew, and it will not be
       * hurried*). The whole design is that the law is **derivable from
       * play** — a player who notices that a leg works harder than a loin
       * can predict which wants the pot.
       *
       * ⚠ A wiki panel printing `work: 0.8` hands them the table instead,
       * which substitutes RECALL for JUDGMENT — the exact failure
       * `design-lenses.md` lens 1 names as the sharpest form of fake
       * pedagogy, *"a designer believes the game is about judgment long
       * after it has become about recall."*
       *
       * ⚠ Not a secret: level 1 is the appetite axis, so a player who
       * WANTS to be told can be, and one who would rather work it out is
       * not handed it unasked. `spoilerName: 0` because the field's
       * EXISTENCE is not the spoiler — knowing that muscles differ in how
       * hard they worked is the invitation.
       */
      work: {
        persistent: true,
        authorable: true,
        spoiler: 1,
        spoilerName: 0,
      },
    };

    /**
     * How hard this muscle worked in life, `0..1` — and therefore the
     * connective tissue it carries and the cooking it wants.
     *
     * The shipped quadruped scale, which is the ladder an author tunes
     * against: `shank 0.95` (walks all day, all collagen) · `neck 0.85` ·
     * `shoulder 0.80` · `leg 0.60` · `belly 0.50` · `rib 0.35` ·
     * `loin 0.25` · `tenderloin 0.05` (does nothing, and is the prize).
     *
     * ⚠ The default is `0` and that is deliberately the TENDEREST end
     * rather than a neutral middle: an unauthored muscle reads as
     * something that never worked, which a cook will notice the first
     * time they try to braise it. A middle default would read as
     * plausible forever.
     */
    public work: number = 0;

    public getWork(): number {
      return this.work;
    }

    /**
     * ⚠ Throws outside `[0, 1]` rather than clamping. `work` is a
     * proportion of a life spent working; a value of 3 is a typo, and
     * clamping it to 1 would make every mis-authored muscle the toughest
     * thing in the world and say nothing.
     */
    public setWork(value: number): void {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError(
          `MuscleMixin.setWork: work must be a finite number in [0, 1] ` +
            `(got ${value}) — it is the share of a life spent working`,
        );
      }
      this.work = value;
    }
  };
}
